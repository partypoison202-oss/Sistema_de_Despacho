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

        // 1. Mapeo único: Cada clave es única para evitar que PHP sobrescriba valores
        $mapeoRutas = [
            'T-01'  => 'T01', 
            'T-02'  => 'T02', 
            'T-04'  => 'T04', 
            'T-05'  => 'T05',
            'RA 2A' => '2A', 
            'RA 2B' => '2B', 
            '20B'   => '20B', // Definimos 20B como una categoría propia temporalmente
            'RA 2D' => '2D', 
            'RA 3'  => '03', 
            'RA 4'  => '04', 
            'RA 6'  => '06', 
            'RA 8'  => '08', 
            'RA 11' => '11', 
            'RA 14' => '14', 
            'RA 15A'=> '15A', 
            'RA 15B'=> '15B'
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
                // Usamos strpos con '=== 0' para asegurar que la ruta EMPIEZA con el prefijo
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

        // 2. Lógica de Suma: Sumar 20B dentro de RA 2B
        if (isset($data['20B']) && isset($data['RA 2B'])) {
            $data['RA 2B']['en_operacion'] += $data['20B']['en_operacion'];
            $data['RA 2B']['en_mantenimiento'] += $data['20B']['en_mantenimiento'];
            
            // Eliminamos 20B del reporte final para que no aparezca como fila duplicada
            unset($data['20B']);
        }

        // 3. Formatear resultados
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
}