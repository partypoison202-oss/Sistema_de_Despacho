<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Conductor;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class ItinerarioController extends Controller
{
    /**
     * Obtiene la matriz de asistencias en un rango de fechas
     */
    private function parseJsonDetalleConMotivo($json)
    {
        if (empty($json)) return [];
        $decoded = is_string($json) ? json_decode($json, true) : $json;
        if (!is_array($decoded)) return [];
        
        $result = [];
        foreach ($decoded as $item) {
            if (isset($item['fecha'])) {
                $result[$item['fecha']] = $item['motivo'] ?? '';
            }
        }
        return $result;
    }

    public function getItinerario(Request $request)
    {
        $request->validate([
            'desde' => 'required|date',
            'hasta' => 'required|date|after_or_equal:desde'
        ]);

        $desde = Carbon::parse($request->input('desde'));
        $hasta = Carbon::parse($request->input('hasta'));
        
        // Limitar a máximo 60 días para evitar payloads gigantes
        if ($desde->diffInDays($hasta) > 60) {
            return response()->json(['error' => 'El rango máximo permitido es de 60 días.'], 400);
        }

        $period = CarbonPeriod::create($desde, $hasta);
        $fechas = [];
        foreach ($period as $date) {
            $fechas[] = $date->format('Y-m-d');
        }

        // Obtener todos los conductores activos
        $conductores = Conductor::where('estatus', 'activo')
                                ->orderBy('tarjeton')
                                ->get();

        $matriz = [];

        foreach ($conductores as $conductor) {
            $fila = [
                'id' => $conductor->id,
                'tarjeton' => $conductor->tarjeton,
                'nombre' => $conductor->nombres . ' ' . $conductor->apellidos,
                'totales' => ['A' => 0, 'D' => 0, 'V' => 0, 'I' => 0, 'F' => 0],
                'dias' => [],
                'motivos' => []
            ];

            // Parsear JSONs con motivo
            $faltas = $this->parseJsonDetalleConMotivo($conductor->faltas_detalle);
            $descansos = $this->parseJsonDetalleConMotivo($conductor->descansos_detalle);
            $vacaciones = $this->parseJsonDetalleConMotivo($conductor->vacaciones_detalle);
            $incapacidades = $this->parseJsonDetalleConMotivo($conductor->incapacidades_detalle);

            foreach ($fechas as $fechaStr) {
                $estadoDia = 'A'; // Por defecto Asistencia
                $motivo = '';

                // Prioridad: F > I > V > D > A
                if (isset($faltas[$fechaStr])) {
                    $estadoDia = 'F';
                    $motivo = $faltas[$fechaStr];
                } elseif (isset($incapacidades[$fechaStr])) {
                    $estadoDia = 'I';
                    $motivo = $incapacidades[$fechaStr];
                } elseif (isset($vacaciones[$fechaStr])) {
                    $estadoDia = 'V';
                    $motivo = $vacaciones[$fechaStr];
                } elseif (isset($descansos[$fechaStr])) {
                    $estadoDia = 'D';
                    $motivo = $descansos[$fechaStr];
                }

                $fila['dias'][$fechaStr] = $estadoDia;
                if ($motivo) {
                    $fila['motivos'][$fechaStr] = $motivo;
                }
                $fila['totales'][$estadoDia]++;
            }

            $matriz[] = $fila;
        }

        return response()->json([
            'fechas' => $fechas,
            'matriz' => $matriz
        ]);
    }

    /**
     * Asigna un bloque de fechas (V, I, D, F) a un conductor
     */
    public function asignarBloque(Request $request)
    {
        $request->validate([
            'conductor_id' => 'required|exists:conductores,id',
            'estado' => 'required|in:falta,descanso,vacaciones,incapacidad',
            'desde' => 'required|date',
            'hasta' => 'required|date|after_or_equal:desde',
            'motivo' => 'nullable|string'
        ]);

        $conductor = Conductor::findOrFail($request->input('conductor_id'));
        $estado = $request->input('estado');
        
        $campo = $estado === 'falta' ? 'faltas_detalle' : 
                 ($estado === 'descanso' ? 'descansos_detalle' : 
                 ($estado === 'vacaciones' ? 'vacaciones_detalle' : 'incapacidades_detalle'));

        $desde = Carbon::parse($request->input('desde'));
        $hasta = Carbon::parse($request->input('hasta'));
        $period = CarbonPeriod::create($desde, $hasta);

        $rawDetalle = $conductor->$campo;
        $detalle = is_string($rawDetalle) ? (json_decode($rawDetalle, true) ?: []) : (is_array($rawDetalle) ? $rawDetalle : []);
        $fechasExistentes = array_column($detalle, 'fecha');

        $motivo = $request->input('motivo') ?: 'Asignación manual';
        $diasAgregados = 0;

        foreach ($period as $date) {
            $fechaStr = $date->format('Y-m-d');
            if (!in_array($fechaStr, $fechasExistentes)) {
                $detalle[] = [
                    'id' => $estado . '_' . time() . '_' . random_int(1000, 9999),
                    'fecha' => $fechaStr,
                    'motivo' => $motivo,
                    'estado' => 'pendiente',
                    'justificada' => false
                ];
                $diasAgregados++;
            }
        }

        $conductor->$campo = $detalle;
        
        if ($estado === 'falta') {
            $conductor->faltas = ((int)($conductor->faltas ?? 0)) + $diasAgregados;
        }

        $conductor->save();

        return response()->json([
            'success' => true,
            'message' => 'Bloque asignado correctamente.'
        ]);
    }

    private function parseJsonDetalle($raw)
    {
        $fechas = [];
        if (is_string($raw) && !empty($raw)) {
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) {
                foreach ($parsed as $item) {
                    if (isset($item['fecha'])) {
                        $fechas[] = substr($item['fecha'], 0, 10);
                    }
                }
            }
        } elseif (is_array($raw)) {
            foreach ($raw as $item) {
                if (isset($item['fecha'])) {
                    $fechas[] = substr($item['fecha'], 0, 10);
                }
            }
        }
        return $fechas;
    }
}
