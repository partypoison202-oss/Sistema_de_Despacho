<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReporteController extends Controller
{
    public function generarReporteGeneralData()
    {
        $fechaHoy = Carbon::today()->toDateString();

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

        $registros = DB::table('informacion_operativa')
            ->whereDate('fecha_registro', $fechaHoy)
            ->get();

        foreach ($registros as $reg) {
            $estatus = trim(strtoupper($reg->estatus));
            $rutaExcel = trim(strtoupper($reg->ruta)); 

            foreach ($mapeoRutas as $nombreReporte => $prefijoExcel) {
                if (strpos($rutaExcel, $prefijoExcel) === 0) {
                    if ($estatus === 'OPERACION') {
                        $data[$nombreReporte]['en_operacion']++;
                    } elseif ($estatus === 'MANTENIMIENTO') {
                        $data[$nombreReporte]['en_mantenimiento']++;
                    }
                    break; 
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

    // Endpoint para reporte de unidades por tipo
    
        public function generarReporteUnidades()
    {
        try {
            $fechaHoy = Carbon::today()->toDateString();
            // Definimos el mapa de imágenes
            $mapeoImagenes = [
                'URBANUS'   => 'urbanu.png',
                'ZAFIRO'    => 'zafiro.png',
                'ORION'     => 'orionlateral.PNG',
                'VAGONETA'  => 'vagoneta lateral.png'
            ];
            
            $tipos = ['URBANUS', 'ZAFIRO', 'ORION', 'VAGONETA'];
            $resultado = [];

            foreach ($tipos as $tipo) {
                $programadas = DB::table('informacion_operativa')
                    ->whereDate('fecha_registro', $fechaHoy)
                    ->where('tipo', $tipo)
                    ->count();

                $en_servicio = DB::table('informacion_operativa')
                    ->whereDate('fecha_registro', $fechaHoy)
                    ->where('tipo', $tipo)
                    ->where('estatus', 'OPERACION')
                    ->count();

                // Agregamos la imagen al array de resultado
                $resultado[] = [
                    'tipo' => $tipo,
                    'programadas' => $programadas,
                    'en_servicio' => $en_servicio,
                    'imagen' => $mapeoImagenes[$tipo] ?? 'default.png'
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