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
        $request->validate([
            'unidades' => 'required|array',
        ]);

        $unidadesExcel = $request->input('unidades');
        $fechaHoy = Carbon::today()->toDateString();

        try {
            DB::transaction(function () use ($unidadesExcel, $fechaHoy) {

                // Limpieza del día actual antes de importar
                DB::table('informacion_operativa')
                    ->whereDate('fecha_registro', $fechaHoy)
                    ->delete();

                foreach ($unidadesExcel as $fila) {
                    $numeroEco = $fila['ECONOMICO'] ?? null;
                    $nombreConductor = $fila['NOMBRE_CONDUCTOR'] ?? '';

                    if (!$numeroEco || strtoupper(trim($nombreConductor)) === 'FALTA DE UNIDAD') {
                        continue;
                    }

                    $numeroEcoClean = str_pad(trim((string)$numeroEco), 3, '0', STR_PAD_LEFT);

                    // Buscar la unidad por número ECO (asumiendo que ya existe en la BD)
                    $unidad = DB::table('unidades')
                        ->where('numero_eco', $numeroEcoClean)
                        ->first();

                    if ($unidad) {
                        InformacionOperativa::create([
                            'unidad_id'        => $unidad->id,
                            'ruta'             => $fila['RUTA'] ?? null,
                            'numero_tarjeton'  => $fila['TARJETON'] ?? null,
                            'nombre_conductor' => $nombreConductor,
                            'fecha_registro'   => Carbon::now()
                        ]);
                    }
                }
            });

            return response()->json(['status' => 'success', 'message' => 'Importación exitosa.'], 201);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Obtiene información operativa filtrada por tipo de unidad (usando la columna 'tipo' de la tabla unidades)
     */
    public function obtenerPorTipo($tipo)
    {
        $fechaHoy = Carbon::today()->toDateString();

        return response()->json(
            DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
                ->whereRaw('UPPER(TRIM(unidades.tipo)) = ?', [strtoupper($tipo)])
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

        $info = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('UPPER(TRIM(unidades.tipo)) = ?', [strtoupper($tipo)])
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