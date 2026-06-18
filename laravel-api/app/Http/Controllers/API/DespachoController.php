<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\InformacionOperativa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DespachoController extends Controller
{
    /**
     * Importa y sincroniza los datos usando el formato estandarizado:
     * TIPO_UNIDAD, RUTA, ECONOMICO, TARJETON, NOMBRE_CONDUCTOR
     */
    public function importar(Request $request)
    {
        // Aumentar el tiempo máximo de ejecución para manejar muchos registros
        // con conexión remota a Neon (cada query tiene latencia de red)
        set_time_limit(300);

        // Forzar reconexión limpia para evitar reutilizar una conexión
        // con una transacción abortada del pool de Neon
        DB::reconnect();

        $request->validate([
            'unidades' => 'required|array',
        ]);

        $unidadesExcel = $request->input('unidades');
        $fechaHoy = Carbon::today()->toDateString();

        // Pre-cargar todas las unidades en memoria para evitar N+1 queries
        // Esto reduce ~80 queries individuales a 1 sola query
        $todasLasUnidades = DB::table('unidades')
            ->select('id', 'numero_eco')
            ->get()
            ->keyBy('numero_eco');

        \Log::info('Unidades pre-cargadas', ['total' => $todasLasUnidades->count()]);

        // Preparar todos los registros válidos antes de la transacción
        $registrosParaInsertar = [];
        $filasIgnoradas = 0;
        $unidadesNoEncontradas = [];

        foreach ($unidadesExcel as $fila) {
            $numeroEco = trim((string) ($fila['ECONOMICO'] ?? ''));
            $nombreConductor = trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? ''));

            // Ignorar registros sin ECO válido (debe ser numérico)
            if (empty($numeroEco) || !is_numeric($numeroEco)) {
                $filasIgnoradas++;
                \Log::info('Fila ignorada: ECO no válido', ['eco' => $numeroEco]);
                continue;
            }

            // Ignorar filas sin unidad asignada
            if (strtoupper($nombreConductor) === 'FALTA DE UNIDAD') {
                $filasIgnoradas++;
                \Log::info('Fila ignorada: falta de unidad', ['eco' => $numeroEco]);
                continue;
            }

            // Padding del ECO a 3 dígitos
            $numeroEcoClean = str_pad($numeroEco, 3, '0', STR_PAD_LEFT);

            // Buscar unidad en el cache en memoria (sin query a la BD)
            $unidad = $todasLasUnidades->get($numeroEcoClean);

            if (!$unidad) {
                $unidadesNoEncontradas[] = $numeroEcoClean;
                \Log::warning('Unidad no encontrada', ['eco' => $numeroEcoClean]);
                continue;
            }

            $registrosParaInsertar[] = [
                'unidad_id' => $unidad->id,
                'ruta' => trim((string) ($fila['RUTA'] ?? '')),
                'numero_tarjeton' => trim((string) ($fila['TARJETON'] ?? '')),
                'nombre_conductor' => $nombreConductor,
                'fecha_registro' => now(),
            ];
        }

        \Log::info('Registros preparados', [
            'para_insertar' => count($registrosParaInsertar),
            'ignorados' => $filasIgnoradas,
            'sin_unidad_en_bd' => count($unidadesNoEncontradas),
        ]);

        if (empty($registrosParaInsertar)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se encontraron registros válidos para importar.',
            ], 422);
        }

        try {
            // Eliminar registros del día actual
            DB::table('informacion_operativa')
                ->whereDate('fecha_registro', $fechaHoy)
                ->delete();

            \Log::info('Delete ejecutado sin transacción');

            // Insertar en lotes de 50 para eficiencia
            $chunks = array_chunk($registrosParaInsertar, 50);
            foreach ($chunks as $chunk) {
                DB::table('informacion_operativa')->insert($chunk);
            }

            \Log::info('Todos los registros insertados', [
                'total' => count($registrosParaInsertar),
            ]);

            $mensaje = count($registrosParaInsertar) . ' registros importados exitosamente.';
            if (!empty($unidadesNoEncontradas)) {
                $mensaje .= ' (' . count($unidadesNoEncontradas) . ' unidades no encontradas en la BD)';
            }

            return response()->json([
                'status' => 'success',
                'message' => $mensaje,
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Error importación', [
                'mensaje' => $e->getMessage(),
                'archivo' => $e->getFile(),
                'linea' => $e->getLine(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mapea el tipo de transporte del frontend al ID de la base de datos
     */
    private function getTransporteIdByTipo($tipo)
    {
        $t = strtolower(trim($tipo));
        if ($t === 'urbanus' || $t === 'urbanuss') return 1;
        if ($t === 'zafiro') return 2;
        if ($t === 'vagoneta' || $t === 'bagoneta') return 3;
        return 0;
    }

    /**
     * Obtiene el listado de TODAS las unidades disponibles en la BD para un tipo
     */
    public function listarUnidadesPorTipo($tipo)
    {
        $transporteId = $this->getTransporteIdByTipo($tipo);

        $unidades = DB::table('unidades')
            ->where('transporte_id', $transporteId)
            ->select('numero_eco')
            ->orderBy('numero_eco')
            ->get();

        return response()->json($unidades, 200);
    }

    /**
     * Obtiene información operativa filtrada por tipo de unidad
     */
    public function obtenerPorTipo($tipo)
    {
        $fechaHoy = Carbon::today()->toDateString();
        $transporteId = $this->getTransporteIdByTipo($tipo);

        return response()->json(
            DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
                ->where('unidades.transporte_id', $transporteId)
                ->select(
                    'unidades.numero_eco as economico',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton as tarjeton',
                    'informacion_operativa.nombre_conductor as conductor_nombre'
                )
                ->get(),
            200
        );
    }

    /**
     * Obtiene el detalle de una unidad específica por tipo y número ECO
     */
    public function obtenerDetalleUnidad($tipo, $numeroEco)
    {
        $numeroEcoClean = str_pad(trim($numeroEco), 3, '0', STR_PAD_LEFT);
        $transporteId = $this->getTransporteIdByTipo($tipo);

        $info = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->where('unidades.transporte_id', $transporteId)
            ->whereDate('informacion_operativa.fecha_registro', Carbon::today()->toDateString())
            ->select('informacion_operativa.ruta', 'informacion_operativa.nombre_conductor', 'unidades.numero_eco')
            ->first();

        return response()->json(
            $info ? [
                'status'    => 'success',
                'asignado'  => true,
                'ruta'      => $info->ruta,
                'conductor' => $info->nombre_conductor
            ] : [
                'status'    => 'success',
                'asignado'  => false,
                'ruta'      => 'Sin ruta asignada',
                'conductor' => 'Sin conductor'
            ],
            200
        );
    }
}