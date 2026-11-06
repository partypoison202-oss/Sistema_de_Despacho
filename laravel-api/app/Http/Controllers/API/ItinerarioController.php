<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Conductor;
use App\Helpers\BitacoraConductorHelper;
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
            if (is_array($item) && isset($item['fecha'])) {
                $fKey = substr(trim((string)$item['fecha']), 0, 10);
                $result[$fKey] = $item['motivo'] ?? '';
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

        $hoyActual = Carbon::today('America/Mexico_City');
        $desde = Carbon::parse($request->input('desde'));
        if ($desde->gt($hoyActual)) {
            $desde = $hoyActual->copy();
        }
        $hasta = Carbon::parse($request->input('hasta'));
        if ($desde->gt($hasta)) {
            $hasta = $desde->copy();
        }
        
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
                    if (is_array($item) && isset($item['fecha'])) {
                        $fKey = substr(trim((string)$item['fecha']), 0, 10);
                        if (isset($item['estado']) && $item['estado'] === 'retardo') {
                            $retardos[$fKey] = $item['motivo'] ?? '';
                        } else {
                            $faltas[$fKey] = $item['motivo'] ?? '';
                        }
                    }
                }
            }

            $descansos = $this->parseJsonDetalleConMotivo($conductor->descansos_detalle);
            $vacaciones = $this->parseJsonDetalleConMotivo($conductor->vacaciones_detalle);
            $incapacidades = $this->parseJsonDetalleConMotivo($conductor->incapacidades_detalle);
            $permutas = $this->parseJsonPermutas($conductor->permutas_detalle ?? []);
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

                // Prioridad de simbología:
                // 1. Permutas explícitas asignadas (DP = Descanso Permuta, AP = Asistencia Permuta)
                if (isset($permutas[$fechaStr])) {
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
                        $estadoDia = $tieneAsistencia ? 'AP' : 'DP';
                        $motivo = $motivoP ?: ($tieneAsistencia ? 'Asistencia (Permuta)' : 'Descanso (Permuta)');
                    }
                } elseif (isset($faltas[$fechaStr])) {
                    $estadoDia = 'F';
                    $motivo = $faltas[$fechaStr] ?: 'Falta registrada';
                } elseif (isset($retardos[$fechaStr])) {
                    $estadoDia = 'R';
                    $motivo = $retardos[$fechaStr] ?: 'Retardo registrado';
                } elseif (isset($incapacidades[$fechaStr])) {
                    $estadoDia = 'I';
                    $motivo = $incapacidades[$fechaStr] ?: 'Incapacidad médica';
                } elseif (isset($vacaciones[$fechaStr])) {
                    $estadoDia = 'V';
                    $motivo = $vacaciones[$fechaStr] ?: 'Vacaciones';
                } elseif (isset($descansos[$fechaStr])) {
                    $estadoDia = 'D';
                    $motivo = $descansos[$fechaStr] ?: 'Descanso';
                } elseif (isset($asistenciasManuales[$fechaStr])) {
                    $estadoDia = 'A';
                    $motivo = $asistenciasManuales[$fechaStr] ?: 'Asistencia registrada';
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

        // Si es falta, rechazar cualquier asignación para fechas futuras
        if ($estado === 'falta' && $hasta->toDateString() > Carbon::today('America/Mexico_City')->toDateString()) {
            return response()->json([
                'success' => false,
                'message' => 'No es posible registrar una falta con fecha futura. Solo se permiten inasistencias del día de hoy o fechas pasadas.'
            ], 422);
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

            $fechasPeriodo = [];
            foreach ($period as $date) {
                $fechasPeriodo[] = $date->format('Y-m-d');
            }

            // Función para limpiar estados conflictivos de estas fechas en los operadores de la permuta
            $limpiarEstadosConflictivos = function ($cond) use ($fechasPeriodo) {
                // 1. Limpiar faltas
                if (!empty($cond->faltas_detalle)) {
                    $arrF = is_string($cond->faltas_detalle) ? (json_decode($cond->faltas_detalle, true) ?: []) : (is_array($cond->faltas_detalle) ? $cond->faltas_detalle : []);
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
                        $cond->faltas_detalle = $nuevasF;
                        $cond->faltas = max(0, ((int)($cond->faltas ?? 0)) - $remF);
                    }
                }
                // 2. Limpiar retardos
                if (!empty($cond->retardos_detalle)) {
                    $arrR = is_string($cond->retardos_detalle) ? (json_decode($cond->retardos_detalle, true) ?: []) : (is_array($cond->retardos_detalle) ? $cond->retardos_detalle : []);
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
                        $cond->retardos_detalle = $nuevosR;
                        $cond->retardos = max(0, ((int)($cond->retardos ?? 0)) - $remR);
                    }
                }
                // 3. Limpiar descansos
                if (!empty($cond->descansos_detalle)) {
                    $arrD = is_string($cond->descansos_detalle) ? (json_decode($cond->descansos_detalle, true) ?: []) : (is_array($cond->descansos_detalle) ? $cond->descansos_detalle : []);
                    $cond->descansos_detalle = array_values(array_filter($arrD, fn($item) => !in_array($item['fecha'] ?? '', $fechasPeriodo)));
                }
                // 4. Limpiar asistencias manuales
                if (!empty($cond->asistencias_detalle)) {
                    $arrA = is_string($cond->asistencias_detalle) ? (json_decode($cond->asistencias_detalle, true) ?: []) : (is_array($cond->asistencias_detalle) ? $cond->asistencias_detalle : []);
                    $cond->asistencias_detalle = array_values(array_filter($arrA, fn($item) => !in_array($item['fecha'] ?? '', $fechasPeriodo)));
                }
            };

            $limpiarEstadosConflictivos($conductor);
            $limpiarEstadosConflictivos($conductor2);

            // Detalle Conductor 1 (Persona que descansa -> DP)
            $rawDetalle1 = $conductor->permutas_detalle;
            $detalle1 = is_string($rawDetalle1) ? (json_decode($rawDetalle1, true) ?: []) : (is_array($rawDetalle1) ? $rawDetalle1 : []);

            // Detalle Conductor 2 (Persona que asiste -> AP)
            $rawDetalle2 = $conductor2->permutas_detalle;
            $detalle2 = is_string($rawDetalle2) ? (json_decode($rawDetalle2, true) ?: []) : (is_array($rawDetalle2) ? $rawDetalle2 : []);

            $diasAgregados1 = 0;
            $diasAgregados2 = 0;

            foreach ($period as $date) {
                $fechaStr = $date->format('Y-m-d');

                // Conductor 1 (Descansa - DP)
                $act1 = false;
                foreach ($detalle1 as &$item) {
                    if (($item['fecha'] ?? '') === $fechaStr) {
                        $item['tipo'] = 'DP';
                        $item['motivo'] = "Permuta con {$conductor2->tarjeton} - {$conductor2->nombres} {$conductor2->apellidos}" . ($motivoBase ? " ({$motivoBase})" : '');
                        $item['conductor_relacionado_id'] = $conductor2->id;
                        $item['conductor_relacionado_tarjeton'] = $conductor2->tarjeton;
                        $item['conductor_relacionado_nombre'] = trim("{$conductor2->nombres} {$conductor2->apellidos}");
                        $item['estado'] = 'aprobada';
                        $item['justificada'] = true;
                        $act1 = true;
                        break;
                    }
                }
                unset($item);

                if (!$act1) {
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
                $act2 = false;
                foreach ($detalle2 as &$item) {
                    if (($item['fecha'] ?? '') === $fechaStr) {
                        $item['tipo'] = 'AP';
                        $item['motivo'] = "Permuta con {$conductor->tarjeton} - {$conductor->nombres} {$conductor->apellidos}" . ($motivoBase ? " ({$motivoBase})" : '');
                        $item['conductor_relacionado_id'] = $conductor->id;
                        $item['conductor_relacionado_tarjeton'] = $conductor->tarjeton;
                        $item['conductor_relacionado_nombre'] = trim("{$conductor->nombres} {$conductor->apellidos}");
                        $item['estado'] = 'aprobada';
                        $item['justificada'] = true;
                        $act2 = true;
                        break;
                    }
                }
                unset($item);

                if (!$act2) {
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

            $rangoTexto = $desde->toDateString() === $hasta->toDateString()
                ? $desde->toDateString()
                : "{$desde->toDateString()} al {$hasta->toDateString()}";
            BitacoraConductorHelper::registrarAccion(
                $conductor,
                'PERMUTA',
                "Permuta (DP - Descanso) asignada con {$conductor2->tarjeton} - {$conductor2->nombres} {$conductor2->apellidos} ({$rangoTexto})" . ($motivoBase ? ". Motivo: {$motivoBase}" : '')
            );
            BitacoraConductorHelper::registrarAccion(
                $conductor2,
                'PERMUTA',
                "Permuta (AP - Asistencia) asignada con {$conductor->tarjeton} - {$conductor->nombres} {$conductor->apellidos} ({$rangoTexto})" . ($motivoBase ? ". Motivo: {$motivoBase}" : '')
            );

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

                    $rangoTexto = $desde->toDateString() === $hasta->toDateString()
                        ? $desde->toDateString()
                        : "{$desde->toDateString()} al {$hasta->toDateString()}";
                    BitacoraConductorHelper::registrarAccion(
                        $conductor,
                        'ASISTENCIA',
                        "Asistencia asignada ({$rangoTexto}). Motivo: {$motivo}"
                    );

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

                $fechasPeriodo = [];
                foreach ($period as $date) {
                    $fechasPeriodo[] = $date->format('Y-m-d');
                }

                // 1. Limpiar asistencias_detalle si se asigna otro estatus
                $rawAsist = $conductor->asistencias_detalle;
                if (!empty($rawAsist)) {
                    $arrAsist = is_string($rawAsist) ? (json_decode($rawAsist, true) ?: []) : (is_array($rawAsist) ? $rawAsist : []);
                    $conductor->asistencias_detalle = array_values(array_filter($arrAsist, fn($item) => !in_array($item['fecha'] ?? '', $fechasPeriodo)));
                }

                // 2. Limpiar faltas_detalle si el nuevo estado NO es falta
                if ($estado !== 'falta' && !empty($conductor->faltas_detalle)) {
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
                }

                // 3. Limpiar retardos_detalle si el nuevo estado NO es retardo
                if ($estado !== 'retardo' && !empty($conductor->retardos_detalle)) {
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

                // 4. Limpiar descansos_detalle si el nuevo estado NO es descanso
                if ($estado !== 'descanso' && !empty($conductor->descansos_detalle)) {
                    $arrD = is_string($conductor->descansos_detalle) ? (json_decode($conductor->descansos_detalle, true) ?: []) : (is_array($conductor->descansos_detalle) ? $conductor->descansos_detalle : []);
                    $conductor->descansos_detalle = array_values(array_filter($arrD, fn($item) => !in_array($item['fecha'] ?? '', $fechasPeriodo)));
                }

                // 5. Limpiar vacaciones_detalle si el nuevo estado NO es vacaciones
                if ($estado !== 'vacaciones' && !empty($conductor->vacaciones_detalle)) {
                    $arrV = is_string($conductor->vacaciones_detalle) ? (json_decode($conductor->vacaciones_detalle, true) ?: []) : (is_array($conductor->vacaciones_detalle) ? $conductor->vacaciones_detalle : []);
                    $conductor->vacaciones_detalle = array_values(array_filter($arrV, fn($item) => !in_array($item['fecha'] ?? '', $fechasPeriodo)));
                }

                // 6. Limpiar incapacidades_detalle si el nuevo estado NO es incapacidad
                if ($estado !== 'incapacidad' && !empty($conductor->incapacidades_detalle)) {
                    $arrI = is_string($conductor->incapacidades_detalle) ? (json_decode($conductor->incapacidades_detalle, true) ?: []) : (is_array($conductor->incapacidades_detalle) ? $conductor->incapacidades_detalle : []);
                    $conductor->incapacidades_detalle = array_values(array_filter($arrI, fn($item) => !in_array($item['fecha'] ?? '', $fechasPeriodo)));
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
                    } else {
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

                    $tipoBitacoraMap = [
                        'falta' => 'FALTA_REGISTRADA',
                        'retardo' => 'RETARDO',
                        'descanso' => 'DESCANSO',
                        'vacaciones' => 'VACACIONES',
                        'incapacidad' => 'INCAPACIDAD',
                    ];
                    $tipoBitacora = $tipoBitacoraMap[$estado] ?? strtoupper($estado);
                    $rangoTexto = $desde->toDateString() === $hasta->toDateString()
                        ? $desde->toDateString()
                        : "{$desde->toDateString()} al {$hasta->toDateString()}";
                    BitacoraConductorHelper::registrarAccion(
                        $conductor,
                        $tipoBitacora,
                        ucfirst($estado) . " registrado ({$rangoTexto}). Motivo: {$motivo}"
                    );

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
            if (is_array($item) && isset($item['fecha'])) {
                $fKey = substr(trim((string)$item['fecha']), 0, 10);
                $result[$fKey] = $item;
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
