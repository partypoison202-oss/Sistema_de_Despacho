<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Conductor;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

use Illuminate\Support\Facades\Schema;

class ItinerarioController extends Controller
{
    private function normalizarNombre($str)
    {
        if (empty($str)) return '';
        $str = mb_strtoupper(trim($str), 'UTF-8');
        $unwantedArray = [
            'Á'=>'A', 'É'=>'E', 'Í'=>'I', 'Ó'=>'O', 'Ú'=>'U', 'Ü'=>'U', 'Ñ'=>'N'
        ];
        $str = strtr($str, $unwantedArray);
        return preg_replace('/\s+/', ' ', $str);
    }

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

        // Mapeo de asistencias de Despacho (historial_operativo e informacion_operativa)
        $historialMap = []; // [tarjetonKey][YYYY-MM-DD] = true
        $nombreMap = [];    // [nombreNormalizado][YYYY-MM-DD] = true

        try {
            if (Schema::hasTable('historial_operativo')) {
                $registrosHistorial = DB::table('historial_operativo')
                    ->whereBetween('fecha_historial', [$desde->toDateString(), $hasta->toDateString()])
                    ->get();

                foreach ($registrosHistorial as $h) {
                    $fecha = $h->fecha_historial;

                    if (!empty($h->numero_tarjeton)) {
                        $tRaw = trim((string)$h->numero_tarjeton);
                        $tNum = (string)(int)preg_replace('/\D/', '', $tRaw);
                        $historialMap[$tRaw][$fecha] = true;
                        if ($tNum !== '0') {
                            $historialMap[$tNum][$fecha] = true;
                        }
                    }

                    if (!empty($h->nombre_conductor)) {
                        $nNorm = $this->normalizarNombre($h->nombre_conductor);
                        if ($nNorm) {
                            $nombreMap[$nNorm][$fecha] = true;
                        }
                    }

                    if (!empty($h->relevo_tarjeton)) {
                        $tRawRel = trim((string)$h->relevo_tarjeton);
                        $tNumRel = (string)(int)preg_replace('/\D/', '', $tRawRel);
                        $historialMap[$tRawRel][$fecha] = true;
                        if ($tNumRel !== '0') {
                            $historialMap[$tNumRel][$fecha] = true;
                        }
                    }

                    if (!empty($h->relevo_conductor)) {
                        $nNormRel = $this->normalizarNombre($h->relevo_conductor);
                        if ($nNormRel) {
                            $nombreMap[$nNormRel][$fecha] = true;
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            \Log::error('Error consultando historial_operativo en Itinerario: ' . $e->getMessage());
        }

        $hoy = Carbon::today()->format('Y-m-d');

        // Si hoy cae en el rango, incluir informacion_operativa para asistencias en tiempo real
        if ($hoy >= $desde->toDateString() && $hoy <= $hasta->toDateString()) {
            try {
                if (Schema::hasTable('informacion_operativa')) {
                    $hoyOps = DB::table('informacion_operativa')->get();

                    foreach ($hoyOps as $op) {
                        if (!empty($op->numero_tarjeton)) {
                            $tRaw = trim((string)$op->numero_tarjeton);
                            $tNum = (string)(int)preg_replace('/\D/', '', $tRaw);
                            $historialMap[$tRaw][$hoy] = true;
                            if ($tNum !== '0') {
                                $historialMap[$tNum][$hoy] = true;
                            }
                        }

                        if (!empty($op->nombre_conductor)) {
                            $nNorm = $this->normalizarNombre($op->nombre_conductor);
                            if ($nNorm) {
                                $nombreMap[$nNorm][$hoy] = true;
                            }
                        }

                        if (!empty($op->relevo_tarjeton)) {
                            $tRawRel = trim((string)$op->relevo_tarjeton);
                            $tNumRel = (string)(int)preg_replace('/\D/', '', $tRawRel);
                            $historialMap[$tRawRel][$hoy] = true;
                            if ($tNumRel !== '0') {
                                $historialMap[$tNumRel][$hoy] = true;
                            }
                        }

                        if (!empty($op->relevo_conductor)) {
                            $nNormRel = $this->normalizarNombre($op->relevo_conductor);
                            if ($nNormRel) {
                                $nombreMap[$nNormRel][$hoy] = true;
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                \Log::error('Error consultando informacion_operativa en Itinerario: ' . $e->getMessage());
            }
        }

        // Obtener todos los conductores activos
        $conductores = Conductor::where('estatus', 'activo')
                                ->orWhereNull('estatus')
                                ->orderBy('tarjeton')
                                ->get();

        $matriz = [];

        foreach ($conductores as $conductor) {
            $tarjetonRaw = trim((string)($conductor->tarjeton ?? ''));
            $tarjetonNum = (string)(int)preg_replace('/\D/', '', $tarjetonRaw);
            $nombreCondNorm = $this->normalizarNombre($conductor->nombres . ' ' . $conductor->apellidos);

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
            $permutas = $this->parseJsonPermutas($conductor->permutas_detalle);
            $retardos = $this->parseJsonDetalleConMotivo($conductor->retardos_detalle);

            // Si el estado de servicio es falta y hoy cae en el rango
            if ($conductor->estado_servicio === 'falta' && !isset($faltas[$hoy])) {
                $faltas[$hoy] = 'Falta activa en servicio';
            }

            foreach ($fechas as $fechaStr) {
                $estadoDia = '';
                $motivo = '';

                $tieneAsistencia = 
                    (isset($historialMap[$tarjetonRaw][$fechaStr])) ||
                    ($tarjetonNum !== '0' && isset($historialMap[$tarjetonNum][$fechaStr])) ||
                    ($nombreCondNorm && isset($nombreMap[$nombreCondNorm][$fechaStr])) ||
                    ($fechaStr === $hoy && $conductor->estado_servicio === 'en_servicio');

                // Prioridad: F > I > V > D > AP > DP > R > A > (-) día futuro > (vacío)
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
                } elseif (isset($permutas[$fechaStr])) {
                    $itemP = $permutas[$fechaStr];
                    $tipoP = is_array($itemP) ? ($itemP['tipo'] ?? null) : null;
                    $motivoP = is_array($itemP) ? ($itemP['motivo'] ?? '') : (is_string($itemP) ? $itemP : '');

                    if ($tipoP === 'DP') {
                        $estadoDia = 'DP';
                        $motivo = $motivoP ?: 'Descanso (Permuta)';
                    } elseif ($tipoP === 'AP') {
                        $estadoDia = 'AP';
                        $motivo = $motivoP ?: 'Asistencia (Permuta)';
                    } else {
                        if ($tieneAsistencia) {
                            $estadoDia = 'AP';
                            $motivo = $motivoP ? ($motivoP . ' (Asistencia registrada)') : 'Asistencia (Permuta)';
                        } else {
                            $estadoDia = 'DP';
                            $motivo = $motivoP ? ($motivoP . ' (Descanso)') : 'Descanso (Permuta)';
                        }
                    }
                } elseif (isset($retardos[$fechaStr])) {
                    $estadoDia = 'R';
                    $motivo = $retardos[$fechaStr];
                } elseif ($tieneAsistencia) {
                    $estadoDia = 'A';
                    $motivo = 'Asistencia registrada en Despacho';
                } elseif ($fechaStr > $hoy) {
                    $estadoDia = '-';
                }

                $fila['dias'][$fechaStr] = $estadoDia;
                if ($motivo) {
                    $fila['motivos'][$fechaStr] = $motivo;
                }
                
                // Incrementar totales sólo para estados A, D, V, I, F, AP, DP, R
                if (!isset($fila['totales']['AP'])) $fila['totales']['AP'] = 0;
                if (!isset($fila['totales']['DP'])) $fila['totales']['DP'] = 0;
                if (!isset($fila['totales']['R'])) $fila['totales']['R'] = 0;
                
                if (isset($fila['totales'][$estadoDia])) {
                    $fila['totales'][$estadoDia]++;
                }
            }

            $matriz[] = $fila;
        }

        // Ordenar por número numérico de tarjetón
        usort($matriz, function ($a, $b) {
            $numA = (int)preg_replace('/\D/', '', $a['tarjeton'] ?? '');
            $numB = (int)preg_replace('/\D/', '', $b['tarjeton'] ?? '');
            return $numA <=> $numB;
        });

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
            'estado' => 'required|in:falta,descanso,vacaciones,incapacidad,permuta,retardo',
            'desde' => 'required|date',
            'hasta' => 'required|date|after_or_equal:desde',
            'motivo' => 'nullable|string',
            'conductor_relacionado_id' => 'nullable|exists:conductores,id'
        ]);

        $conductor = Conductor::findOrFail($request->input('conductor_id'));
        $estado = $request->input('estado');
        
        $desde = Carbon::parse($request->input('desde'));
        $hasta = Carbon::parse($request->input('hasta'));
        $period = CarbonPeriod::create($desde, $hasta);

        // Lógica especial para PERMUTA (Involucra a 2 conductores: 1 descansa [DP], 2 asiste [AP])
        if ($estado === 'permuta') {
            $relacionadoId = $request->input('conductor_relacionado_id');
            if (!$relacionadoId || (string)$relacionadoId === (string)$conductor->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Para asignar una permuta debes seleccionar a ambos conductores (el que descansa y el que cubre la asistencia).'
                ], 422);
            }

            $conductor2 = Conductor::find($relacionadoId);
            if (!$conductor2) {
                return response()->json([
                    'success' => false,
                    'message' => 'El segundo conductor seleccionado no fue encontrado.'
                ], 404);
            }

            $motivoBase = trim($request->input('motivo') ?? '');

            // Detalle Conductor 1 (Persona que descansa -> DP)
            $rawDetalle1 = $conductor->permutas_detalle;
            $detalle1 = is_string($rawDetalle1) ? (json_decode($rawDetalle1, true) ?: []) : (is_array($rawDetalle1) ? $rawDetalle1 : []);
            $fechasExistentes1 = array_column($detalle1, 'fecha');

            // Detalle Conductor 2 (Persona que asiste -> AP)
            $rawDetalle2 = $conductor2->permutas_detalle;
            $detalle2 = is_string($rawDetalle2) ? (json_decode($rawDetalle2, true) ?: []) : (is_array($rawDetalle2) ? $rawDetalle2 : []);
            $fechasExistentes2 = array_column($detalle2, 'fecha');

            $diasAgregados1 = 0;
            $diasAgregados2 = 0;

            foreach ($period as $date) {
                $fechaStr = $date->format('Y-m-d');

                // Conductor 1 (Descansa - DP)
                if (!in_array($fechaStr, $fechasExistentes1)) {
                    $detalle1[] = [
                        'id' => 'permuta_dp_' . time() . '_' . random_int(1000, 9999),
                        'fecha' => $fechaStr,
                        'tipo' => 'DP',
                        'motivo' => "Permuta con {$conductor2->tarjeton} - {$conductor2->nombres} {$conductor2->apellidos}" . ($motivoBase ? " ({$motivoBase})" : ''),
                        'conductor_relacionado_id' => $conductor2->id,
                        'conductor_relacionado_tarjeton' => $conductor2->tarjeton,
                        'conductor_relacionado_nombre' => trim("{$conductor2->nombres} {$conductor2->apellidos}"),
                        'estado' => 'aprobada',
                        'justificada' => true
                    ];
                    $diasAgregados1++;
                }

                // Conductor 2 (Asiste - AP)
                if (!in_array($fechaStr, $fechasExistentes2)) {
                    $detalle2[] = [
                        'id' => 'permuta_ap_' . time() . '_' . random_int(1000, 9999),
                        'fecha' => $fechaStr,
                        'tipo' => 'AP',
                        'motivo' => "Permuta con {$conductor->tarjeton} - {$conductor->nombres} {$conductor->apellidos}" . ($motivoBase ? " ({$motivoBase})" : ''),
                        'conductor_relacionado_id' => $conductor->id,
                        'conductor_relacionado_tarjeton' => $conductor->tarjeton,
                        'conductor_relacionado_nombre' => trim("{$conductor->nombres} {$conductor->apellidos}"),
                        'estado' => 'aprobada',
                        'justificada' => true
                    ];
                    $diasAgregados2++;
                }
            }

            $conductor->permutas_detalle = $detalle1;
            $conductor->permutas = ((int)($conductor->permutas ?? 0)) + $diasAgregados1;
            $conductor->save();

            $conductor2->permutas_detalle = $detalle2;
            $conductor2->permutas = ((int)($conductor2->permutas ?? 0)) + $diasAgregados2;
            $conductor2->save();

            return response()->json([
                'success' => true,
                'message' => "Permuta asignada correctamente: {$conductor->nombres} (DP - Descanso) y {$conductor2->nombres} (AP - Asistencia)."
            ]);
        }

        $campoMap = [
            'falta' => 'faltas_detalle',
            'descanso' => 'descansos_detalle',
            'vacaciones' => 'vacaciones_detalle',
            'incapacidad' => 'incapacidades_detalle',
            'retardo' => 'retardos_detalle'
        ];
        
        $campo = $campoMap[$estado];

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

    private function parseJsonPermutas($json)
    {
        if (empty($json)) return [];
        $decoded = is_string($json) ? json_decode($json, true) : $json;
        if (!is_array($decoded)) return [];
        
        $result = [];
        foreach ($decoded as $item) {
            if (isset($item['fecha'])) {
                $result[$item['fecha']] = $item;
            }
        }
        return $result;
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
