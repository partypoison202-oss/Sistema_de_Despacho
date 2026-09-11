<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Helpers\BitacoraHelper;

class PlataformaController extends Controller
{
    public function registrarMovimiento(Request $request)
    {
        $request->validate([
            'numero_eco' => 'required|string',
            'tipo' => 'required|string',
            'tipo_movimiento' => 'required|string|in:INCORPORACION,DESINCORPORACION,ASIGNACION_CONDUCTOR,RETIRO_CONDUCTOR',
            'conductor' => 'nullable|string',
            'ruta' => 'nullable|string',
            'motivo' => 'nullable|string',
            'estatus_nuevo' => 'nullable|string|in:RESERVA,MANTENIMIENTO,PATIO NORTE,PERCANCE',
            'reemplazo_activo' => 'nullable|boolean',
            'eco_reemplazo' => 'nullable|string',
            'unidad_reemplazo' => 'nullable|string',
            'tarjeton_reemplazo' => 'nullable|string',
            'conductor_reemplazo' => 'nullable|string',
            'ruta_reemplazo' => 'nullable|string',
            'corrida_reemplazo' => 'nullable|string',
            'cambio_operador_activo' => 'nullable|boolean',
            'numero_tarjeton_nuevo' => 'nullable|string',
            'numero_tarjeton' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $numeroEco = trim((string) $request->numero_eco);
            $numeroEcoClean = ltrim($numeroEco, '0');
            $numeroEcoPad = str_pad($numeroEcoClean === '' ? '0' : $numeroEcoClean, 3, '0', STR_PAD_LEFT);
            $ecoCandidates = array_values(array_unique([$numeroEco, $numeroEcoClean, $numeroEcoPad]));
            $tipoMovimiento = $request->tipo_movimiento;
            $usuarioId = auth()->id();

            Log::info('Buscando unidad con numero_eco:', ['numero_eco' => $numeroEco, 'candidatos' => $ecoCandidates, 'movimiento' => $tipoMovimiento]);

            $unidad = DB::table('unidades')
                ->whereIn('numero_eco', $ecoCandidates)
                ->first();

            if (!$unidad) {
                Log::warning('Unidad no encontrada', ['numero_eco' => $numeroEco, 'candidatos' => $ecoCandidates]);
                return response()->json([
                    'error' => 'Unidad no encontrada',
                    'busqueda' => ['numero_eco' => $numeroEco]
                ], 404);
            }

            $unidadId = $unidad->id;

            $registroOperativo = DB::table('informacion_operativa')
                ->where('unidad_id', $unidadId)
                ->first();

            $estatusAnteriorRaw = $registroOperativo->estatus ?? 'RESERVA';
            $estatusAnterior = strtoupper(trim($estatusAnteriorRaw));
            $estatusNuevo = $estatusAnterior;

            $datosUpdate = [];
            $mensajeBitacora = "";

            if ($tipoMovimiento === 'INCORPORACION') {
                if ($estatusAnterior === 'OPERACION') {
                    return response()->json(['error' => 'La unidad ya está en operación'], 422);
                }
                $estatusNuevo = 'OPERACION';
                $datosUpdate['estatus'] = strtolower($estatusNuevo);
                $datosUpdate['hora_salida'] = !empty($registroOperativo->hora_salida) ? $registroOperativo->hora_salida : date('H:i:s');
                $datosUpdate['motivo_estatus'] = 'INCORPORACION';
                $datosUpdate['falla'] = null;
                $datosUpdate['motivo'] = null;
                
                // Asignar conductor y ruta al incorporar
                $datosUpdate['numero_tarjeton'] = $request->conductor;
                if ($request->conductor) {
                    $cond = DB::table('conductores')
                        ->where('tarjeton', $request->conductor)
                        ->orWhere('id', is_numeric($request->conductor) ? (int)$request->conductor : 0)
                        ->first();
                    if ($cond) {
                        $datosUpdate['numero_tarjeton'] = $cond->tarjeton;
                        $datosUpdate['nombre_conductor'] = trim($cond->nombres . ' ' . $cond->apellidos);
                        DB::table('conductores')->where('id', $cond->id)->update(['estado_servicio' => 'en_servicio']);
                    }
                }
                $datosUpdate['ruta'] = $request->ruta;

                $mensajeBitacora = "INCORPORACIÓN - CONDUCTOR: " . strtoupper($request->conductor ?? 'SIN ASIGNAR') . ", RUTA: " . strtoupper($request->ruta ?? 'SIN RUTA');

            } else if ($tipoMovimiento === 'DESINCORPORACION') {
                if ($estatusAnterior !== 'OPERACION') {
                    return response()->json(['error' => 'La unidad no está en operación, no se puede desincorporar'], 422);
                }
                $estatusNuevo = $request->estatus_nuevo ?? 'RESERVA';
                $datosUpdate['estatus'] = strtolower($estatusNuevo);
                $datosUpdate['motivo_estatus'] = $request->motivo ? strtoupper($request->motivo) : strtoupper($estatusNuevo);
                $datosUpdate['motivo'] = $request->motivo ? strtoupper($request->motivo) : strtoupper($estatusNuevo);
                if (strtoupper($estatusNuevo) === 'MANTENIMIENTO') {
                    $datosUpdate['falla'] = $request->motivo ? strtoupper($request->motivo) : 'MANTENIMIENTO';
                }
                
                // Limpiar conductor y ruta al desincorporar
                if ($registroOperativo && $registroOperativo->numero_tarjeton) {
                    DB::table('conductores')
                        ->where('tarjeton', $registroOperativo->numero_tarjeton)
                        ->update(['estado_servicio' => 'disponible']);
                }
                $datosUpdate['nombre_conductor'] = null;
                $datosUpdate['numero_tarjeton'] = null;
                $datosUpdate['ruta'] = null;
                $datosUpdate['corridas'] = null;
                $datosUpdate['ciclo'] = null;
                if (strtoupper($estatusNuevo) !== 'MANTENIMIENTO') {
                    $datosUpdate['falla'] = null;
                }
                $datosUpdate['hora_programada'] = null;
                $datosUpdate['acople'] = null;
                $datosUpdate['hora_salida'] = null;
                $datosUpdate['relevo_tarjeton'] = null;
                $datosUpdate['relevo_conductor'] = null;
                $datosUpdate['relevo_hora'] = null;
                $datosUpdate['tarjeton_maniobrista'] = null;
                $datosUpdate['nombre_maniobrista'] = null;
                $datosUpdate['patio_norte'] = 'false';
                $datosUpdate['transporte_patio_norte'] = 'false';

                $mensajeBitacora = "DESINCORPORACIÓN A " . strtoupper($estatusNuevo) . ($request->motivo ? " - MOTIVO: " . strtoupper($request->motivo) : "");

                // ✅ Procesar unidad de reemplazo
                if ($request->reemplazo_activo && $request->eco_reemplazo) {
                    $ecoReemplazo = trim((string) $request->eco_reemplazo);
                    $ecoReemplazoClean = ltrim($ecoReemplazo, '0');
                    $ecoReemplazoPad = str_pad($ecoReemplazoClean === '' ? '0' : $ecoReemplazoClean, 3, '0', STR_PAD_LEFT);
                    $reemplazoCandidates = array_values(array_unique([$ecoReemplazo, $ecoReemplazoClean, $ecoReemplazoPad]));

                    $unidadReemplazo = DB::table('unidades')
                        ->whereIn('numero_eco', $reemplazoCandidates)
                        ->first();

                    if (!$unidadReemplazo) {
                        return response()->json(['error' => 'Unidad de reemplazo no encontrada: ' . $ecoReemplazo], 404);
                    }

                    $registroReemplazo = DB::table('informacion_operativa')
                        ->where('unidad_id', $unidadReemplazo->id)
                        ->first();

                    $estatusAnteriorReemplazo = strtoupper(trim($registroReemplazo->estatus ?? 'RESERVA'));

                    // 1. Tipo de transporte (esencial para filtros y vistas)
                    $tipoParaReemplazo = !empty($registroOperativo->tipo)
                        ? strtolower(trim($registroOperativo->tipo))
                        : strtolower(trim($request->tipo ?? 'urbanuss'));

                    // 2. Tarjetón y Conductor
                    $tarjetonReemplazo = !empty($request->tarjeton_reemplazo)
                        ? trim($request->tarjeton_reemplazo)
                        : ($registroOperativo->numero_tarjeton ?? null);

                    $nombreConductorReemplazo = null;
                    if ($tarjetonReemplazo) {
                        $tarjetonClean = ltrim($tarjetonReemplazo, '0');
                        $tarjetonPad = str_pad($tarjetonClean === '' ? '0' : $tarjetonClean, 4, '0', STR_PAD_LEFT);
                        $tarjetonCandidates = array_values(array_unique([$tarjetonReemplazo, $tarjetonClean, $tarjetonPad]));

                        $conductorR = DB::table('conductores')
                            ->whereIn('tarjeton', $tarjetonCandidates)
                            ->orWhere('id', is_numeric($tarjetonReemplazo) ? (int)$tarjetonReemplazo : 0)
                            ->first();

                        if ($conductorR) {
                            $tarjetonReemplazo = $conductorR->tarjeton;
                            $nombreConductorReemplazo = trim(($conductorR->nombres ?? '') . ' ' . ($conductorR->apellidos ?? ''));
                            if (empty($nombreConductorReemplazo)) {
                                $nombreConductorReemplazo = trim(($conductorR->apellidos ?? '') . ' ' . ($conductorR->nombres ?? ''));
                            }
                            // Marcar al conductor en servicio
                            DB::table('conductores')->where('id', $conductorR->id)->update(['estado_servicio' => 'en_servicio']);
                        }
                    }

                    if (empty($nombreConductorReemplazo)) {
                        $nombreConductorReemplazo = !empty($request->conductor_reemplazo)
                            ? trim($request->conductor_reemplazo)
                            : ($registroOperativo->nombre_conductor ?? null);
                    }

                    // Si hay tarjetón, evitar duplicidad en cualquier otra unidad
                    if ($tarjetonReemplazo) {
                        DB::table('informacion_operativa')
                            ->where('unidad_id', '!=', $unidadReemplazo->id)
                            ->where('numero_tarjeton', $tarjetonReemplazo)
                            ->update([
                                'numero_tarjeton' => null,
                                'nombre_conductor' => null
                            ]);
                    }

                    // 3. Ruta y Corridas
                    $rutaReemplazo = (!empty($request->ruta_reemplazo) && !in_array($request->ruta_reemplazo, ['Sin ruta', 'Sin ruta asignada', 'SELECCIONAR'], true))
                        ? trim($request->ruta_reemplazo)
                        : ($registroOperativo->ruta ?? null);

                    $corridaReemplazo = ($request->corrida_reemplazo !== null && trim((string)$request->corrida_reemplazo) !== '')
                        ? trim((string)$request->corrida_reemplazo)
                        : ($registroOperativo->corridas ?? null);

                    // 4. Horas y ciclo
                    $horaProgramadaParaReemplazo = !empty($registroOperativo->hora_programada)
                        ? $registroOperativo->hora_programada
                        : null;

                    $acopleParaReemplazo = !empty($registroOperativo->acople)
                        ? $registroOperativo->acople
                        : null;

                    $horaSalidaParaReemplazo = !empty($registroOperativo->hora_salida)
                        ? $registroOperativo->hora_salida
                        : date('H:i:s');

                    $cicloParaReemplazo = !empty($registroOperativo->ciclo)
                        ? $registroOperativo->ciclo
                        : null;

                    // 5. Relevos y maniobristas
                    $relevoTarjeton = $registroOperativo->relevo_tarjeton ?? null;
                    $relevoConductor = $registroOperativo->relevo_conductor ?? null;
                    $relevoHora = $registroOperativo->relevo_hora ?? null;
                    $tarjetonManiobrista = $registroOperativo->tarjeton_maniobrista ?? null;
                    $nombreManiobrista = $registroOperativo->nombre_maniobrista ?? null;
                    $transportePatioNorte = $registroOperativo->transporte_patio_norte ?? 'false';
                    $patioNorte = $registroOperativo->patio_norte ?? 'false';

                    $datosReemplazo = [
                        'tipo'                  => $tipoParaReemplazo,
                        'estatus'               => 'operacion',
                        'numero_tarjeton'       => $tarjetonReemplazo,
                        'nombre_conductor'      => $nombreConductorReemplazo,
                        'ruta'                  => $rutaReemplazo,
                        'corridas'              => ($corridaReemplazo !== null && $corridaReemplazo !== '') ? (int)$corridaReemplazo : null,
                        'hora_programada'       => $horaProgramadaParaReemplazo,
                        'acople'                => $acopleParaReemplazo,
                        'hora_salida'           => $horaSalidaParaReemplazo,
                        'ciclo'                 => $cicloParaReemplazo,
                        'relevo_tarjeton'       => $relevoTarjeton,
                        'relevo_conductor'      => $relevoConductor,
                        'relevo_hora'           => $relevoHora,
                        'tarjeton_maniobrista'  => $tarjetonManiobrista,
                        'nombre_maniobrista'    => $nombreManiobrista,
                        'transporte_patio_norte'=> $transportePatioNorte,
                        'patio_norte'           => $patioNorte,
                        'motivo_estatus'        => 'REEMPLAZO DE ECO ' . $numeroEco,
                        'cambio_desde'          => $numeroEco,
                        'cambio_motivo'         => $request->motivo ? strtoupper($request->motivo) : 'REEMPLAZO',
                        'falla'                 => null,
                        'motivo'                => null,
                        'updated_at'            => Carbon::now(),
                    ];
                    
                    // Limpiamos el conductor de la unidad original, ya que se pasó al reemplazo
                    $datosUpdate['numero_tarjeton'] = null;
                    $datosUpdate['nombre_conductor'] = null;

                    if ($registroReemplazo) {
                        DB::table('informacion_operativa')
                            ->where('id', $registroReemplazo->id)
                            ->update($datosReemplazo);
                    } else {
                        DB::table('informacion_operativa')->insert(array_merge(
                            $datosReemplazo,
                            [
                                'unidad_id'      => $unidadReemplazo->id,
                                'fecha_registro' => Carbon::now(),
                                'created_at'     => Carbon::now(),
                            ]
                        ));
                    }

                    // Registrar en historial_operativo que la unidad original fue reemplazada/desincorporada
                    $horaEncierroSaliente = date('H:i:s');
                    DB::table('historial_operativo')->insert([
                        'unidad_id'       => $unidadId,
                        'ruta'            => $registroOperativo->ruta ?? null,
                        'numero_tarjeton' => $registroOperativo->numero_tarjeton ?? null,
                        'nombre_conductor'=> $registroOperativo->nombre_conductor ?? null,
                        'corridas'        => $registroOperativo->corridas ?? null,
                        'tipo'            => $registroOperativo->tipo ?? $tipoParaReemplazo,
                        'estatus'         => strtolower($estatusNuevo),
                        'motivo_estatus'  => "DESINCORPORADA / REEMPLAZADA POR ECO " . $ecoReemplazo . ($request->motivo ? " - " . strtoupper($request->motivo) : ""),
                        'momento'         => 'ENCIERRO',
                        'hora_encierro'   => $horaEncierroSaliente,
                        'fecha_historial' => date('Y-m-d'),
                        'fecha_registro'  => Carbon::now(),
                        'created_at'      => Carbon::now(),
                        'updated_at'      => Carbon::now(),
                    ]);

                    DB::table('plataforma_movimientos')->insert([
                        'unidad_id'          => $unidadReemplazo->id,
                        'usuario_id'         => $usuarioId,
                        'tipo_movimiento'    => 'INCORPORACION',
                        'estatus_anterior'   => $estatusAnteriorReemplazo,
                        'estatus_nuevo'      => 'OPERACION',
                        'conductor_asignado' => $tarjetonReemplazo ?? $nombreConductorReemplazo,
                        'ruta_asignada'      => $rutaReemplazo,
                        'motivo'             => 'REEMPLAZO DE ECO ' . $numeroEco,
                        'created_at'         => Carbon::now(),
                        'updated_at'         => Carbon::now(),
                    ]);

                    BitacoraHelper::registrarCambio(
                        $unidadReemplazo->id,
                        'INCORPORACION',
                        'INCORPORACIÓN POR REEMPLAZO DE ECO ' . $numeroEco
                            . ' - CONDUCTOR: ' . ($nombreConductorReemplazo ?? 'SIN ASIGNAR')
                            . ', TARJETÓN: ' . ($tarjetonReemplazo ?? 'SIN ASIGNAR')
                            . ', RUTA: '      . ($rutaReemplazo ?? 'SIN RUTA')
                            . ', CORRIDA: '   . ($corridaReemplazo ?? 'SIN CORRIDA'),
                        $estatusAnteriorReemplazo,
                        'OPERACION'
                    );
                } // fin if reemplazo_activo

            } else if ($tipoMovimiento === 'ASIGNACION_CONDUCTOR') {
                if (!$registroOperativo) {
                    return response()->json(['error' => 'No hay registro operativo para esta unidad.'], 422);
                }
                $conductorNuevo = DB::table('conductores')
                    ->where('tarjeton', $request->numero_tarjeton)
                    ->orWhere('id', is_numeric($request->numero_tarjeton) ? (int)$request->numero_tarjeton : 0)
                    ->first();
                if (!$conductorNuevo) {
                    return response()->json(['error' => 'Conductor no encontrado en el sistema.'], 404);
                }
                $datosUpdate['numero_tarjeton'] = $conductorNuevo->tarjeton;
                $nombreCompletoAsig = trim($conductorNuevo->nombres . ' ' . $conductorNuevo->apellidos);
                $datosUpdate['nombre_conductor'] = $nombreCompletoAsig;

                DB::table('conductores')->where('id', $conductorNuevo->id)->update(['estado_servicio' => 'en_servicio']);
                $mensajeBitacora = "ASIGNACIÓN DE CONDUCTOR: " . $conductorNuevo->tarjeton . " - " . $nombreCompletoAsig . ($request->motivo ? " - MOTIVO: " . strtoupper($request->motivo) : "");

            } else if ($tipoMovimiento === 'RETIRO_CONDUCTOR') {
                if (!$registroOperativo && !$request->cambio_operador_activo) {
                    return response()->json(['error' => 'No hay conductor asignado actualmente a esta unidad en Plataforma.'], 400);
                }

                // 1) Liberar conductor anterior
                if ($registroOperativo && $registroOperativo->numero_tarjeton) {
                    DB::table('conductores')->where('tarjeton', $registroOperativo->numero_tarjeton)->update(['estado_servicio' => 'disponible']);
                }

                // 2) Actualizar registro con nuevo conductor (si hay reemplazo)
                if ($request->has('numero_tarjeton_nuevo') && $request->numero_tarjeton_nuevo) {
                    $tarjetonNuevo = $request->numero_tarjeton_nuevo;
                    $conductorNuevo = DB::table('conductores')
                        ->where('tarjeton', $tarjetonNuevo)
                        ->orWhere('id', is_numeric($tarjetonNuevo) ? (int)$tarjetonNuevo : 0)
                        ->first();
                    if (!$conductorNuevo) {
                        return response()->json(['error' => 'Conductor de reemplazo no encontrado.'], 404);
                    }
                    $datosUpdate['numero_tarjeton'] = $conductorNuevo->tarjeton;
                    $nombreCompleto = trim($conductorNuevo->nombres . ' ' . $conductorNuevo->apellidos);
                    $datosUpdate['nombre_conductor'] = $nombreCompleto;
                    DB::table('conductores')->where('id', $conductorNuevo->id)->update(['estado_servicio' => 'en_servicio']);

                    $mensajeBitacora = "CAMBIO DE CONDUCTOR A: " . $conductorNuevo->tarjeton . " - " . $nombreCompleto . " - MOTIVO RETIRO ANTERIOR: " . strtoupper($request->motivo ?? '');
                } else {
                    $datosUpdate['numero_tarjeton'] = null;
                    $datosUpdate['nombre_conductor'] = null;
                    $mensajeBitacora = "RETIRO DE CONDUCTOR: " . ($registroOperativo->numero_tarjeton ?? 'SIN TARJETÓN') . " - MOTIVO: " . strtoupper($request->motivo ?? '');
                }
            }

            // Sincronizar el cambio con informacion_operativa
            if ($registroOperativo && !empty($datosUpdate)) {
                DB::table('informacion_operativa')
                    ->where('id', $registroOperativo->id)
                    ->update($datosUpdate);
            } else if (!$registroOperativo && !empty($datosUpdate)) {
                Log::warning('No existe registro en informacion_operativa para esta unidad; solo se registrará el historial.', ['unidad_id' => $unidadId]);
            }

            // Registrar movimiento en plataforma_movimientos
            DB::table('plataforma_movimientos')->insert([
                'unidad_id'          => $unidadId,
                'usuario_id'         => $usuarioId,
                'tipo_movimiento'    => $tipoMovimiento,
                'estatus_anterior'   => $estatusAnterior,
                'estatus_nuevo'      => $estatusNuevo,
                'conductor_asignado' => $request->numero_tarjeton_nuevo ?? $request->numero_tarjeton ?? $request->conductor,
                'ruta_asignada'      => $request->ruta,
                'motivo'             => $request->motivo,
                'created_at'         => Carbon::now(),
                'updated_at'         => Carbon::now()
            ]);

            // Registrar acción en la bitácora de cambios diaria
            BitacoraHelper::registrarCambio(
                $unidadId,
                $tipoMovimiento,
                $mensajeBitacora,
                $estatusAnterior,
                $estatusNuevo
            );

            DB::commit();
            return response()->json(['status' => 'success', 'message' => 'Movimiento registrado correctamente']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error en PlataformaController@registrarMovimiento: ' . $e->getMessage());
            return response()->json([
                'error' => 'Error al registrar el movimiento',
                'detalle' => $e->getMessage(),
                'linea' => $e->getLine()
            ], 500);
        }
    }
}