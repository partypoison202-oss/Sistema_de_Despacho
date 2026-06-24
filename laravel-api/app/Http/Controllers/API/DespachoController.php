<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
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
        set_time_limit(300);
        DB::reconnect();

        $request->validate([
            'unidades' => 'required|array',
        ]);

        $unidadesExcel = $request->input('unidades');
        $fechaHoy = Carbon::today()->toDateString();

        // Pre-cargar todas las unidades en memoria
        $todasLasUnidades = DB::table('unidades')
            ->select('id', 'numero_eco')
            ->get()
            ->keyBy('numero_eco');

        \Log::info('Unidades pre-cargadas', ['total' => $todasLasUnidades->count()]);

        $registrosParaInsertar = [];
        $filasIgnoradas = 0;
        $unidadesNoEncontradas = [];
        // Esto te dirá exactamente cómo se llaman las claves que el Excel está enviando
        \Log::info('Cabeceras del Excel detectadas:', array_keys($unidadesExcel[0]));

        foreach ($unidadesExcel as $fila) {
            // Normalizar ECO: eliminar ceros a la izquierda y espacios
            $numeroEcoRaw = trim((string) ($fila['ECONOMICO'] ?? ''));
            $numeroEco = ltrim($numeroEcoRaw, '0'); // quita ceros a la izquierda
            if ($numeroEco === '' || !is_numeric($numeroEco)) {
                $filasIgnoradas++;
                \Log::info('Fila ignorada: ECO no válido', ['eco' => $numeroEcoRaw]);
                continue;
            }

            $nombreConductor = trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? ''));

            if (strtoupper($nombreConductor) === 'FALTA DE UNIDAD') {
                $filasIgnoradas++;
                \Log::info('Fila ignorada: falta de unidad', ['eco' => $numeroEco]);
                continue;
            }

            // Padear a 3 dígitos
            $numeroEcoClean = str_pad($numeroEco, 3, '0', STR_PAD_LEFT);

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
                'tipo' => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? 'Desconocido')),
                'estatus' => trim((string) ($fila['ESTATUS'] ?? 'Sin estatus')),
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
            DB::table('informacion_operativa')
                ->whereDate('fecha_registro', $fechaHoy)
                ->delete();

            \Log::info('Delete ejecutado sin transacción');

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
     * Obtiene el conteo de unidades con registro operativo hoy, agrupadas por tipo.
     */
/**
     * Obtiene el conteo de unidades con registro operativo hoy, agrupadas por tipo.
     */
    public function conteoUnidadesPorTipo()
    {
        $fechaHoy = Carbon::today()->toDateString();

        \Log::info('conteoUnidadesPorTipo - fechaHoy', ['fecha' => $fechaHoy]);

        // Corregido: apuntamos a informacion_operativa.tipo
        $conteos = DB::table('informacion_operativa')
            ->whereDate('fecha_registro', $fechaHoy)
            ->select('tipo', DB::raw('count(distinct unidad_id) as total'))
            ->groupBy('tipo')
            ->get();

        \Log::info('conteoUnidadesPorTipo - resultados crudos', $conteos->toArray());

        // Normalizar claves a minúsculas
        $resultado = [];
        foreach ($conteos as $item) {
            // Validamos que el tipo no sea null antes de procesar
            if (!empty($item->tipo)) {
                $tipo = strtolower(trim($item->tipo));
                $resultado[$tipo] = (int)$item->total;
            }
        }

        \Log::info('conteoUnidadesPorTipo - resultado final', $resultado);

        return response()->json($resultado, 200);
    }

    /**
     * Obtiene el listado de unidades que tienen registro operativo para hoy
     * y pertenecen al tipo de transporte solicitado.
     * Normaliza mayúsculas/minúsculas usando LOWER.
     */
    public function listarUnidadesPorTipo($tipo)
    {
        $tipoNormalizado = strtolower(trim($tipo));
        $fechaHoy = Carbon::today()->toDateString();

        $unidades = DB::table('unidades')
            ->join('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado]) // ← CAMBIO AQUÍ
            ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
            ->select('unidades.numero_eco')
            ->distinct()
            ->orderBy('unidades.numero_eco')
            ->get();

        return response()->json($unidades, 200);
    }
    /**
     * Obtiene información operativa filtrada por tipo de unidad
     * Normaliza mayúsculas/minúsculas usando LOWER.
     */
    public function obtenerPorTipo($tipo)
    {
        $tipoNormalizado = strtolower(trim($tipo));
        $fechaHoy = Carbon::today()->toDateString();

        return response()->json(
            DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
                ->whereRaw('LOWER(unidades.tipo) = ?', [$tipoNormalizado])
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
     * Normaliza mayúsculas/minúsculas usando LOWER.
     */
    // app/Http/Controllers/API/DespachoController.php

    public function obtenerDetalleUnidad($tipo, $numeroEco)
    {
        $tipoNormalizado = strtolower(trim($tipo));
        $numeroEcoClean = str_pad(trim($numeroEco), 3, '0', STR_PAD_LEFT);

        $info = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])  // ← CAMBIO AQUÍ
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

    /**
     * Actualiza los registros de informacion_operativa para el día actual
     * a partir de los datos enviados desde la vista previa.
     * Espera un array 'unidades' con los mismos campos que en la importación.
     */
        public function actualizar(Request $request)
    {
        $request->validate(['unidades' => 'required|array']);
        $unidadesExcel = $request->input('unidades');
        $fechaHoy = Carbon::today()->toDateString();
        
        // Obtenemos el mapa de unidades fuera del bucle para mejor rendimiento
        $unidadesMap = DB::table('unidades')->select('id', 'numero_eco')->get()->keyBy('numero_eco');
        
        $actualizados = 0;
        $errores = [];

        foreach ($unidadesExcel as $fila) {
            $numeroEco = ltrim(trim((string) ($fila['ECONOMICO'] ?? '')), '0');
            $numeroEcoClean = str_pad($numeroEco, 3, '0', STR_PAD_LEFT);
            
            $unidad = $unidadesMap->get($numeroEcoClean);
            if (!$unidad) {
                $errores[] = "ECO no encontrado: {$numeroEcoClean}";
                continue;
            }

            $registro = DB::table('informacion_operativa')
                ->where('unidad_id', $unidad->id)
                ->whereDate('fecha_registro', $fechaHoy)
                ->first();

            if ($registro) {
                try {
                    // Actualización individual con su propio contexto
                    // Forzamos el cast a (string) para que PostgreSQL reciba comillas
                    DB::table('informacion_operativa')
                        ->where('id', $registro->id)
                        ->update([
                            'ruta'             => (string) ($fila['RUTA'] ?? ''),
                            'numero_tarjeton'  => (string) ($fila['TARJETON'] ?? ''),
                            'nombre_conductor' => (string) ($fila['NOMBRE_CONDUCTOR'] ?? '')
                        ]);
                    
                    $actualizados++;
                } catch (\Exception $e) {
                    // Si esta fila falla, se registra y se continúa con la siguiente
                    \Log::error("Fallo individual en ID {$registro->id}: " . $e->getMessage());
                    $errores[] = "Error al actualizar ECO {$numeroEcoClean}: " . $e->getMessage();
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Proceso finalizado. Total actualizados: {$actualizados}",
            'errores' => $errores
        ], 200);
    }
}