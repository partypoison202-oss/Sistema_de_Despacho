<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReporteController extends Controller
{
    public function generarReporteGeneralData()
    {
        $mapeoRutas = [
            'T-01'  => 'T01', 'T-02'  => 'T02', 'T-04'  => 'T04', 'T-05'  => 'T05',
            'RA 2A' => '2A',  'RA 2B' => '2B',  '20B'   => '20B', 'RA 2D' => '2D', 
            'RA 3'  => '03',  'RA 4'  => '04',  'RA 6'  => '06',  'RA 8'  => '08', 
            'RA 11' => '11',  'RA 14' => '14',  'RA 15A'=> '15A', 'RA 15B'=> '15B',
        ];
        
        $data = [];
        foreach (array_keys($mapeoRutas) as $ruta) {
            $data[$ruta] = ['en_operacion' => 0, 'en_mantenimiento' => 0];
        }
        $data['T-SIN ASIGNAR'] = ['en_operacion' => 0, 'en_mantenimiento' => 0];
        $data['RA-SIN ASIGNAR'] = ['en_operacion' => 0, 'en_mantenimiento' => 0];

        $registros = DB::table('informacion_operativa')->get();

        foreach ($registros as $reg) {
            $estatus = trim(strtoupper($reg->estatus ?? ''));
            $tipo = trim(strtoupper($reg->tipo ?? ''));
            $horaSalida = !empty($reg->hora_real_salida_patio) ? $reg->hora_real_salida_patio : (!empty($reg->hora_salida) ? $reg->hora_salida : '');
            $isOper = str_contains($estatus, 'OPERACI') && (!empty($horaSalida) || !empty($reg->motivo_estatus) || !empty($reg->cambio_desde));
            $isManto = str_contains($estatus, 'MANTENIMIENTO');

            $rutaExcel = trim(strtoupper($reg->mantenimiento_ruta ?? $reg->ruta ?? ''));
            $matched = false;

            foreach ($mapeoRutas as $nombreReporte => $prefijoExcel) {
                if (str_contains($rutaExcel, $prefijoExcel) || str_contains($rutaExcel, $nombreReporte)) {
                    if ($isOper) $data[$nombreReporte]['en_operacion']++;
                    elseif ($isManto) $data[$nombreReporte]['en_mantenimiento']++;
                    $matched = true;
                    break;
                }
            }

            if (!$matched && ($isOper || $isManto)) {
                if ($tipo === 'URBANUS' || $tipo === 'URBANUSS') {
                    if ($isOper) $data['T-SIN ASIGNAR']['en_operacion']++;
                    elseif ($isManto) $data['T-SIN ASIGNAR']['en_mantenimiento']++;
                } else {
                    if ($isOper) $data['RA-SIN ASIGNAR']['en_operacion']++;
                    elseif ($isManto) $data['RA-SIN ASIGNAR']['en_mantenimiento']++;
                }
            }
        }

        if (isset($data['20B']) && isset($data['RA 2B'])) {
            $data['RA 2B']['en_operacion'] += $data['20B']['en_operacion'];
            $data['RA 2B']['en_mantenimiento'] += $data['20B']['en_mantenimiento'];
            unset($data['20B']);
        }

        $resultado = [];
        foreach ($data as $ruta => $valores) {
            $resultado[] = [
                'ruta' => $ruta,
                'en_operacion' => $valores['en_operacion'],
                'en_mantenimiento' => $valores['en_mantenimiento'],
                'total' => $valores['en_operacion'] + $valores['en_mantenimiento']
            ];
        }

        return response()->json($resultado);
    }

    public function generarReporteUnidades()
    {
        try {
            $tiposConfig = [
                ['id' => 'URBANUS', 'pattern' => 'URBANU'],
                ['id' => 'ZAFIRO', 'pattern' => 'ZAFIRO'],
                ['id' => 'VAGONETA', 'pattern' => 'VAGONETA'],
                ['id' => 'ORION', 'pattern' => 'ORION']
            ];

            $registros = DB::table('informacion_operativa')->get();
            $resultado = [];

            foreach ($tiposConfig as $tc) {
                $units = $registros->filter(function ($d) use ($tc) {
                    $tipo = strtoupper(trim($d->tipo ?? ''));
                    $est = strtolower(trim($d->estatus ?? ''));
                    $isNoProg = $est === 'no_programada' || $est === 'no programada';
                    return str_contains($tipo, $tc['pattern']) && !$isNoProg;
                });

                $programadas = $units->count();
                $en_servicio = $units->filter(function ($d) {
                    $est = strtoupper(trim($d->estatus ?? ''));
                    return str_contains($est, 'OPERACI') || (!str_contains($est, 'MANTENIMIENTO') && !str_contains($est, 'RESERVA') && !str_contains($est, 'PERCANCE'));
                })->count();

                $resultado[] = [
                    'tipo' => $tc['id'],
                    'programadas' => $programadas,
                    'en_servicio' => $en_servicio,
                    'imagen' => 'default.png'
                ];
            }

            $totales = [
                'programadas' => array_sum(array_column($resultado, 'programadas')),
                'en_servicio' => array_sum(array_column($resultado, 'en_servicio')),
            ];

            return response()->json(['tipos' => $resultado, 'totales' => $totales]);

        } catch (\Exception $e) {
            \Log::error('Error en generarReporteUnidades: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}