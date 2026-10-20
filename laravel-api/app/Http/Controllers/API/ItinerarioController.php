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

    private function normalizarNombreTokens($str)
    {
        $base = $this->normalizarNombre($str);
        if (empty($base)) return '';
        $clean = preg_replace('/[^A-Z0-9\s]/', ' ', $base);
        $words = preg_split('/\s+/', $clean, -1, PREG_SPLIT_NO_EMPTY);
        sort($words);
        return implode(' ', $words);
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
        $historialMap = [];      // [tarjetonKey][YYYY-MM-DD] = true
        $nombreMap = [];         // [nombreNormalizado][YYYY-MM-DD] = true
        $nombreTokensMap = [];   // [nombreTokens][YYYY-MM-DD] = true

        try {
            $registrosHistorial = DB::table('historial_operativo')
                ->whereBetween('fecha_historial', [$desde->toDateString(), $hasta->toDateString()])
                ->select(['fecha_historial', 'numero_tarjeton', 'nombre_conductor', 'relevo_tarjeton', 'relevo_conductor'])
                ->get();

            foreach ($registrosHistorial as $h) {
                $fecha = $h->fecha_historial;

                if (!empty($h->numero_tarjeton)) {
                    $candidatos = PlataformaController::obtenerCandidatosTarjeton($h->numero_tarjeton);
                    foreach ($candidatos as $cand) {
                        $historialMap[$cand][$fecha] = true;
                    }
                    $tNum = (string)(int)preg_replace('/\D/', '', (string)$h->numero_tarjeton);
                    if ($tNum !== '0') {
                        $historialMap[$tNum][$fecha] = true;
                    }
                }

                if (!empty($h->nombre_conductor)) {
                    $nNorm = $this->normalizarNombre($h->nombre_conductor);
                    $nTokens = $this->normalizarNombreTokens($h->nombre_conductor);
                    if ($nNorm) {
                        $nombreMap[$nNorm][$fecha] = true;
                    }
                    if ($nTokens) {
                        $nombreTokensMap[$nTokens][$fecha] = true;
                    }
                }

                if (!empty($h->relevo_tarjeton)) {
                    $candidatosRel = PlataformaController::obtenerCandidatosTarjeton($h->relevo_tarjeton);
                    foreach ($candidatosRel as $candRel) {
                        $historialMap[$candRel][$fecha] = true;
                    }
                    $tNumRel = (string)(int)preg_replace('/\D/', '', (string)$h->relevo_tarjeton);
                    if ($tNumRel !== '0') {
                        $historialMap[$tNumRel][$fecha] = true;
                    }
                }

                if (!empty($h->relevo_conductor)) {
                    $nNormRel = $this->normalizarNombre($h->relevo_conductor);
                    $nTokensRel = $this->normalizarNombreTokens($h->relevo_conductor);
                    if ($nNormRel) {
                        $nombreMap[$nNormRel][$fecha] = true;
                    }
                    if ($nTokensRel) {
                        $nombreTokensMap[$nTokensRel][$fecha] = true;
                    }
                }
            }
        } catch (\Throwable $e) {
            \Log::error('Error consultando historial_operativo en Itinerario: ' . $e->getMessage());
        }

        $hoy = Carbon::today()->format('Y-m-d');

        // Si hoy cae en el rango, sincronizar asistencias activas e incluir informacion_operativa
        if ($hoy >= $desde->toDateString() && $hoy <= $hasta->toDateString()) {
            try {
                DespachoController::sincronizarAsistenciasHoy();

                $hoyOps = DB::table('informacion_operativa')
                    ->select(['numero_tarjeton', 'nombre_conductor', 'relevo_tarjeton', 'relevo_conductor', 'hora_real_salida_patio', 'estatus'])
                    ->get();

                foreach ($hoyOps as $op) {
                    if (!empty($op->numero_tarjeton)) {
                        $candidatos = PlataformaController::obtenerCandidatosTarjeton($op->numero_tarjeton);
                        foreach ($candidatos as $cand) {
                            $historialMap[$cand][$hoy] = true;
                        }
                        $tNum = (string)(int)preg_replace('/\D/', '', (string)$op->numero_tarjeton);
                        if ($tNum !== '0') {
                            $historialMap[$tNum][$hoy] = true;
                        }
                    }

                    if (!empty($op->nombre_conductor)) {
                        $nNorm = $this->normalizarNombre($op->nombre_conductor);
                        $nTokens = $this->normalizarNombreTokens($op->nombre_conductor);
                        if ($nNorm) {
                            $nombreMap[$nNorm][$hoy] = true;
                        }
                        if ($nTokens) {
                            $nombreTokensMap[$nTokens][$hoy] = true;
                        }
                    }

                    if (!empty($op->relevo_tarjeton)) {
                        $candidatosRel = PlataformaController::obtenerCandidatosTarjeton($op->relevo_tarjeton);
                        foreach ($candidatosRel as $candRel) {
                            $historialMap[$candRel][$hoy] = true;
                        }
                        $tNumRel = (string)(int)preg_replace('/\D/', '', (string)$op->relevo_tarjeton);
                        if ($tNumRel !== '0') {
                            $historialMap[$tNumRel][$hoy] = true;
                        }
                    }

                    if (!empty($op->relevo_conductor)) {
                        $nNormRel = $this->normalizarNombre($op->relevo_conductor);
                        $nTokensRel = $this->normalizarNombreTokens($op->relevo_conductor);
                        if ($nNormRel) {
                            $nombreMap[$nNormRel][$hoy] = true;
                        }
                        if ($nTokensRel) {
                            $nombreTokensMap[$nTokensRel][$hoy] = true;
                        }
                    }
                }
            } catch (\Throwable $e) {
                \Log::error('Error consultando informacion_operativa en Itinerario: ' . $e->getMessage());
            }
        }

        // Obtener todos los conductores activos con solo las columnas necesarias
        $conductores = DB::table('conductores')
            ->where(function($q) {
                $q->where('estatus', 'activo')->orWhereNull('estatus');
            })
            ->select([
                'id', 'tarjeton', 'nombres', 'apellidos', 'estado_servicio',
                'faltas_detalle', 'retardos_detalle', 'descansos_detalle',
                'vacaciones_detalle', 'incapacidades_detalle', 'permutas_detalle', 'asistencias_detalle'
            ])
            ->orderBy('tarjeton')
            ->get();

        $matriz = [];

        foreach ($conductores as $conductor) {
            $tarjetonRaw = trim((string)($conductor->tarjeton ?? ''));
            $candidatosTarjetonCond = PlataformaController::obtenerCandidatosTarjeton($tarjetonRaw);
            $tarjetonNum = (string)(int)preg_replace('/\D/', '', $tarjetonRaw);
            $nombreCondNorm = $this->normalizarNombre($conductor->nombres . ' ' . $conductor->apellidos);
            $nombreCondTokens = $this->normalizarNombreTokens($conductor->nombres . ' ' . $conductor->apellidos);

            $fila = [
                'id' => $conductor->id,
                'tarjeton' => $conductor->tarjeton,
                'nombre' => $conductor->nombres . ' ' . $conductor->apellidos,
                'totales' => ['A' => 0, 'D' => 0, 'V' => 0, 'I' => 0, 'F' => 0],
                'dias' => [],
                'motivos' => []
            ];

            // Parsear JSONs con motivo
            $faltas = [];
            $retardos = $this->parseJsonDetalleConMotivo($conductor->retardos_detalle ?? []);
            
            $faltasDecoded = is_string($conductor->faltas_detalle) ? json_decode($conductor->faltas_detalle, true) : $conductor->faltas_detalle;
            if (is_array($faltasDecoded)) {
                foreach ($faltasDecoded as $item) {
                    if (isset($item['fecha'])) {
                        if (isset($item['estado']) && $item['estado'] === 'retardo') {
                            $retardos[$item['fecha']] = $item['motivo'] ?? '';
                        } else {
                            $faltas[$item['fecha']] = $item['motivo'] ?? '';
                        }
                    }
                }
            }

            $descansos = $this->parseJsonDetalleConMotivo($conductor->descansos_detalle);
            $vacaciones = $this->parseJsonDetalleConMotivo($conductor->vacaciones_detalle);
            $incapacidades = $this->parseJsonDetalleConMotivo($conductor->incapacidades_detalle);
            $permutas = $this->parseJsonDetalleConMotivo($conductor->permutas_detalle ?? []);
            $asistenciasManuales = $this->parseJsonDetalleConMotivo($conductor->asistencias_detalle ?? []);

            // Si el estado de servicio es falta y hoy cae en el rango
            if ($conductor->estado_servicio === 'falta' && !isset($faltas[$hoy])) {
                $faltas[$hoy] = 'Falta activa en servicio';
            }

            foreach ($fechas as $fechaStr) {
                $estadoDia = '';
                $motivo = '';

                $tieneAsistencia = false;
                foreach ($candidatosTarjetonCond as $cand) {
                    if (isset($historialMap[$cand][$fechaStr])) {
                        $tieneAsistencia = true;
                        break;
                    }
                }
                if (!$tieneAsistencia && $tarjetonNum !== '0' && isset($historialMap[$tarjetonNum][$fechaStr])) {
                    $tieneAsistencia = true;
                }
                if (!$tieneAsistencia && $nombreCondNorm && isset($nombreMap[$nombreCondNorm][$fechaStr])) {
                    $tieneAsistencia = true;
                }
                if (!$tieneAsistencia && $nombreCondTokens && isset($nombreTokensMap[$nombreCondTokens][$fechaStr])) {
                    $tieneAsistencia = true;
                }
                if (!$tieneAsistencia && isset($asistenciasManuales[$fechaStr])) {
                    $tieneAsistencia = true;
                }
                if (!$tieneAsistencia && $fechaStr === $hoy && $conductor->estado_servicio === 'en_servicio') {
                    $tieneAsistencia = true;
                }

                // Prioridad: Asistencia Registrada/Manual > F > I > V > D > AP > DP > R > A (Despacho) > (-) día futuro > (vacío)
                if (isset($asistenciasManuales[$fechaStr])) {
                    $estadoDia = 'A';
                    $motivo = $asistenciasManuales[$fechaStr] ?: 'Asistencia registrada';
                } elseif (isset($faltas[$fechaStr])) {
                    if ($tieneAsistencia) {
                        $estadoDia = 'A';
                        $motivo = 'Asistencia registrada en Despacho';
                    } else {
                        $estadoDia = 'F';
                        $motivo = $faltas[$fechaStr];
                    }
                } elseif (isset($incapacidades[$fechaStr])) {
                    $estadoDia = 'I';
                    $motivo = $incapacidades[$fechaStr];
                } elseif (isset($vacaciones[$fechaStr])) {
                    $estadoDia = 'V';
                    $motivo = $vacaciones[$fechaStr];
                } elseif (isset($descansos[$fechaStr])) {
                    if ($tieneAsistencia) {
                        $estadoDia = 'A';
                        $motivo = 'Asistencia en Despacho (Día programado de descanso laborado)';
                    } else {
                        $estadoDia = 'D';
                        $motivo = $descansos[$fechaStr];
                    }
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
            'conductor_id' => 'nullable|exists:conductores,id',
            'conductor_ids' => 'nullable|array',
            'conductor_ids.*' => 'exists:conductores,id',
            'estado' => 'required|in:asistencia,falta,descanso,vacaciones,incapacidad,permuta,retardo',
            'desde' => 'required|date',
            'hasta' => 'required|date|after_or_equal:desde',
            'motivo' => 'nullable|string',
            'conductor_relacionado_id' => 'nullable|exists:conductores,id'
        ]);

        $conductorIds = [];
        if ($request->has('conductor_ids') && is_array($request->input('conductor_ids')) && !empty($request->input('conductor_ids'))) {
            $conductorIds = array_values(array_unique(array_filter($request->input('conductor_ids'))));
        } elseif ($request->filled('conductor_id')) {
            $conductorIds = [$request->input('conductor_id')];
        }

        if (empty($conductorIds)) {
            return response()->json([
                'success' => false,
                'message' => 'Por favor selecciona al menos una persona conductora.'
            ], 422);
        }

        $estado = $request->input('estado');
        
        $desde = Carbon::parse($request->input('desde'));
        $hasta = Carbon::parse($request->input('hasta'));
        $period = CarbonPeriod::create($desde, $hasta);

        // Si es vacaciones, incapacidad o descanso, validar que el rango no supere 5 días
        if (in_array($estado, ['vacaciones', 'incapacidad', 'descanso'])) {
            $totalDias = $desde->diffInDays($hasta) + 1;
            if ($totalDias > 5) {
                return response()->json([
                    'success' => false,
                    'message' => "El periodo máximo permitido para {$estado} es de 5 días (has seleccionado {$totalDias} días)."
                ], 422);
            }
        }

        // Lógica especial para PERMUTA (Involucra a 2 conductores: 1 descansa [DP], 2 asiste [AP])
        if ($estado === 'permuta') {
            $conductor = Conductor::findOrFail($conductorIds[0]);
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

        // Lógica para asignación individual o por TANDA (Múltiples conductores)
        $conductores = Conductor::whereIn('id', $conductorIds)->get();
        if ($conductores->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontraron las personas conductoras seleccionadas.'
            ], 404);
        }

        $origen = $request->input('origen') ?: 'Itinerario de Asistencias';
        $totalProcesados = 0;

        DB::beginTransaction();
        try {
            foreach ($conductores as $conductor) {
                // Caso ASISTENCIA MANUAL
                if ($estado === 'asistencia') {
                    $rawAsist = $conductor->asistencias_detalle;
                    $detalle = is_string($rawAsist) ? (json_decode($rawAsist, true) ?: []) : (is_array($rawAsist) ? $rawAsist : []);

                    $fechasPeriodo = [];
                    foreach ($period as $date) {
                        $fechasPeriodo[] = $date->format('Y-m-d');
                    }

                    // Limpiar de faltas para evitar contradicciones
                    $rawF = $conductor->faltas_detalle;
                    $arrF = is_string($rawF) ? (json_decode($rawF, true) ?: []) : (is_array($rawF) ? $rawF : []);
                    $nuevasF = [];
                    $remF = 0;
                    foreach ($arrF as $item) {
                        $fFecha = is_array($item) ? ($item['fecha'] ?? null) : null;
                        if (in_array($fFecha, $fechasPeriodo)) {
                            $remF++;
                        } else {
                            $nuevasF[] = $item;
                        }
                    }
                    if ($remF > 0) {
                        $conductor->faltas_detalle = $nuevasF;
                        $conductor->faltas = max(0, ((int)($conductor->faltas ?? 0)) - $remF);
                    }

                    // Limpiar de retardos
                    $rawR = $conductor->retardos_detalle;
                    $arrR = is_string($rawR) ? (json_decode($rawR, true) ?: []) : (is_array($rawR) ? $rawR : []);
                    $nuevosR = [];
                    $remR = 0;
                    foreach ($arrR as $item) {
                        $rFecha = is_array($item) ? ($item['fecha'] ?? null) : null;
                        if (in_array($rFecha, $fechasPeriodo)) {
                            $remR++;
                        } else {
                            $nuevosR[] = $item;
                        }
                    }
                    if ($remR > 0) {
                        $conductor->retardos_detalle = $nuevosR;
                        $conductor->retardos = max(0, ((int)($conductor->retardos ?? 0)) - $remR);
                    }

                    // Limpiar de descansos
                    $rawD = $conductor->descansos_detalle;
                    $arrD = is_string($rawD) ? (json_decode($rawD, true) ?: []) : (is_array($rawD) ? $rawD : []);
                    $conductor->descansos_detalle = array_values(array_filter($arrD, fn($item) => !in_array($item['fecha'] ?? '', $fechasPeriodo)));

                    $motivo = $request->input('motivo') ?: "Asistencia registrada desde {$origen}";

                    foreach ($fechasPeriodo as $fStr) {
                        $actualizado = false;
                        foreach ($detalle as &$item) {
                            if (($item['fecha'] ?? '') === $fStr) {
                                $item['motivo'] = $motivo;
                                $item['estado'] = 'asistencia';
                                $actualizado = true;
                                break;
                            }
                        }
                        unset($item);

                        if (!$actualizado) {
                            $detalle[] = [
                                'id' => 'asistencia_' . time() . '_' . random_int(1000, 9999),
                                'fecha' => $fStr,
                                'motivo' => $motivo,
                                'estado' => 'asistencia'
                            ];
                        }
                    }

                    $conductor->asistencias_detalle = $detalle;
                    $conductor->save();
                    $totalProcesados++;
                    continue;
                }

                // Caso FALTA, DESCANSO, VACACIONES, INCAPACIDAD, RETARDO
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

                // Si es falta o retardo, cruzamos con el otro campo para evitar empalmes
                $fechasCruzadas = [];
                if ($estado === 'falta' || $estado === 'retardo') {
                    $otroCampo = $estado === 'falta' ? 'retardos_detalle' : 'faltas_detalle';
                    $rawOtro = $conductor->$otroCampo;
                    $detalleOtro = is_string($rawOtro) ? (json_decode($rawOtro, true) ?: []) : (is_array($rawOtro) ? $rawOtro : []);
                    $fechasCruzadas = array_column($detalleOtro, 'fecha');
                }

                // Limpiar de asistencias_detalle si se asigna falta, retardo, descanso, vacaciones o incapacidad
                $rawAsist = $conductor->asistencias_detalle;
                if (!empty($rawAsist)) {
                    $arrAsist = is_string($rawAsist) ? (json_decode($rawAsist, true) ?: []) : (is_array($rawAsist) ? $rawAsist : []);
                    $fechasPeriodo = [];
                    foreach ($period as $date) {
                        $fechasPeriodo[] = $date->format('Y-m-d');
                    }
                    $conductor->asistencias_detalle = array_values(array_filter($arrAsist, fn($item) => !in_array($item['fecha'] ?? '', $fechasPeriodo)));
                }

                // Si es vacaciones, incapacidad o descanso, limpiar faltas o retardos previos en esas fechas
                if ($estado === 'vacaciones' || $estado === 'incapacidad' || $estado === 'descanso') {
                    $fechasPeriodo = [];
                    foreach ($period as $date) {
                        $fechasPeriodo[] = $date->format('Y-m-d');
                    }

                    // Limpiar faltas
                    $rawF = $conductor->faltas_detalle;
                    $arrF = is_string($rawF) ? (json_decode($rawF, true) ?: []) : (is_array($rawF) ? $rawF : []);
                    $nuevasF = [];
                    $remF = 0;
                    foreach ($arrF as $item) {
                        $fFecha = is_array($item) ? ($item['fecha'] ?? null) : null;
                        if (in_array($fFecha, $fechasPeriodo)) {
                            $remF++;
                        } else {
                            $nuevasF[] = $item;
                        }
                    }
                    if ($remF > 0) {
                        $conductor->faltas_detalle = $nuevasF;
                        $conductor->faltas = max(0, ((int)($conductor->faltas ?? 0)) - $remF);
                    }

                    // Limpiar retardos
                    $rawR = $conductor->retardos_detalle;
                    $arrR = is_string($rawR) ? (json_decode($rawR, true) ?: []) : (is_array($rawR) ? $rawR : []);
                    $nuevosR = [];
                    $remR = 0;
                    foreach ($arrR as $item) {
                        $rFecha = is_array($item) ? ($item['fecha'] ?? null) : null;
                        if (in_array($rFecha, $fechasPeriodo)) {
                            $remR++;
                        } else {
                            $nuevosR[] = $item;
                        }
                    }
                    if ($remR > 0) {
                        $conductor->retardos_detalle = $nuevosR;
                        $conductor->retardos = max(0, ((int)($conductor->retardos ?? 0)) - $remR);
                    }
                }

                $defaultMotivos = [
                    'falta' => "Falta registrada desde {$origen}",
                    'retardo' => "Retardo registrado desde {$origen}",
                    'descanso' => "Descanso registrado desde {$origen}",
                    'vacaciones' => "Vacaciones registradas desde {$origen}",
                    'incapacidad' => "Incapacidad registrada desde {$origen}",
                    'permuta' => "Permuta registrada desde {$origen}"
                ];
                $motivo = $request->input('motivo') ?: ($defaultMotivos[$estado] ?? "Registrado desde {$origen}");
                $diasAgregados = 0;

                foreach ($period as $date) {
                    $fechaStr = $date->format('Y-m-d');
                    if (in_array($fechaStr, $fechasExistentes)) {
                        // Si la fecha ya existía en este estado, actualizar motivo
                        foreach ($detalle as &$item) {
                            if (($item['fecha'] ?? '') === $fechaStr) {
                                $item['motivo'] = $motivo;
                                $diasAgregados++;
                                break;
                            }
                        }
                        unset($item);
                    } elseif (!in_array($fechaStr, $fechasCruzadas)) {
                        $detalle[] = [
                            'id' => $estado . '_' . time() . '_' . random_int(1000, 9999),
                            'fecha' => $fechaStr,
                            'motivo' => $motivo,
                            'estado' => $estado === 'retardo' ? 'retardo' : 'pendiente',
                            'justificada' => false
                        ];
                        $diasAgregados++;
                    }
                }

                if ($diasAgregados > 0) {
                    $conductor->$campo = $detalle;
                    if ($estado === 'falta') {
                        $conductor->faltas = ((int)($conductor->faltas ?? 0)) + $diasAgregados;
                    } elseif ($estado === 'retardo') {
                        $conductor->retardos = ((int)($conductor->retardos ?? 0)) + $diasAgregados;
                    }
                    $conductor->save();
                    $totalProcesados++;
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            \Log::error('Error asignando bloque: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Ocurrió un error al procesar la asignación: ' . $e->getMessage()
            ], 500);
        }

        if ($totalProcesados === 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo asignar. Es posible que el operador o los operadores ya tengan un registro previo en esas fechas.'
            ], 400);
        }

        $mensajeFinal = count($conductorIds) > 1 
            ? "Bloque asignado correctamente a {$totalProcesados} conductores." 
            : "Bloque asignado correctamente.";

        return response()->json([
            'success' => true,
            'message' => $mensajeFinal
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
