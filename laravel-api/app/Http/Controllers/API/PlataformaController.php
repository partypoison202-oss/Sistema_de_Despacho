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
            'estatus_nuevo' => 'nullable|string|in:RESERVA,MANTENIMIENTO,PATIO NORTE',
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
            $tipoMovimiento = $request->tipo_movimiento;
            $usuarioId = auth()->id();

            Log::info('Buscando unidad con numero_eco:', ['numero_eco' => $numeroEco, 'movimiento' => $tipoMovimiento]);

            $unidad = DB::table('unidades')
                ->where('numero_eco', $numeroEco)
                ->first();

            if (!$unidad) {
                Log::warning('Unidad no encontrada', ['numero_eco' => $numeroEco]);
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
                $mensajeBitacora = "INCORPORACIÓN - CONDUCTOR: " . strtoupper($request->conductor ?? 'SIN ASIGNAR') . ", RUTA: " . strtoupper($request->ruta ?? 'SIN RUTA');

            } else if ($tipoMovimiento === 'DESINCORPORACION') {
                if ($estatusAnterior !== 'OPERACION') {
                    return response()->json(['error' => 'La unidad no está en operación, no se puede desincorporar'], 422);
                }
                $estatusNuevo = $request->estatus_nuevo ?? 'RESERVA';
                $datosUpdate['estatus'] = strtolower($estatusNuevo);
                $mensajeBitacora = "DESINCORPORACIÓN A " . strtoupper($estatusNuevo) . ($request->motivo ? " - MOTIVO: " . strtoupper($request->motivo) : "");

                // ✅ Procesar unidad de reemplazo
                if ($request->reemplazo_activo && $request->eco_reemplazo) {
                    $ecoReemplazo = trim((string) $request->eco_reemplazo);

                    $unidadReemplazo = DB::table('unidades')
                        ->where('numero_eco', $ecoReemplazo)
                        ->first();

                    if (!$unidadReemplazo) {
                        return response()->json(['error' => 'Unidad de reemplazo no encontrada: ' . $ecoReemplazo], 404);
                    }

                    $registroReemplazo = DB::table('informacion_operativa')
                        ->where('unidad_id', $unidadReemplazo->id)
                        ->first();

                    $estatusAnteriorReemplazo = strtoupper(trim($registroReemplazo->estatus ?? 'RESERVA'));

                    $datosReemplazo = [
                        'estatus'         => 'operacion',
                        'numero_tarjeton' => $request->tarjeton_reemplazo ?? null,
                        'ruta'            => $request->ruta_reemplazo     ?? null,
                        'corridas'         => $request->corrida_reemplazo  ?? null,
                    ];

                    if ($registroReemplazo) {
                        DB::table('informacion_operativa')
                            ->where('id', $registroReemplazo->id)
                            ->update($datosReemplazo);
                    } else {
                        DB::table('informacion_operativa')->insert(array_merge(
                            $datosReemplazo,
                            [
                                'unidad_id'  => $unidadReemplazo->id,
                                'created_at' => Carbon::now(),
                                'updated_at' => Carbon::now(),
                            ]
                        ));
                    }

                    DB::table('plataforma_movimientos')->insert([
                        'unidad_id'          => $unidadReemplazo->id,
                        'usuario_id'         => $usuarioId,
                        'tipo_movimiento'    => 'INCORPORACION',
                        'estatus_anterior'   => $estatusAnteriorReemplazo,
                        'estatus_nuevo'      => 'OPERACION',
                        'conductor_asignado' => $request->tarjeton_reemplazo ?? null,
                        'ruta_asignada'      => $request->ruta_reemplazo    ?? null,
                        'motivo'             => 'REEMPLAZO DE ECO ' . $numeroEco,
                        'created_at'         => Carbon::now(),
                        'updated_at'         => Carbon::now(),
                    ]);

                    BitacoraHelper::registrarCambio(
                        $unidadReemplazo->id,
                        'INCORPORACION',
                        'INCORPORACIÓN POR REEMPLAZO DE ECO ' . $numeroEco
                            . ' - TARJETÓN: ' . ($request->tarjeton_reemplazo ?? 'SIN ASIGNAR')
                            . ', RUTA: '      . ($request->ruta_reemplazo     ?? 'SIN RUTA'),
                        $estatusAnteriorReemplazo,
                        'OPERACION'
                    );
                } // fin if reemplazo_activo

            } else if ($tipoMovimiento === 'ASIGNACION_CONDUCTOR') {
                if (!$registroOperativo) {
                    return response()->json(['error' => 'No hay registro operativo para esta unidad.'], 422);
                }
                $conductorNuevo = DB::table('conductores')->where('tarjeton', $request->numero_tarjeton)->first();
                if (!$conductorNuevo) {
                    return response()->json(['error' => 'Conductor no encontrado en el sistema.'], 404);
                }
                $datosUpdate['numero_tarjeton'] = $request->numero_tarjeton;
                $datosUpdate['nombre_conductor'] = $conductorNuevo->nombre;

                DB::table('conductores')->where('tarjeton', $request->numero_tarjeton)->update(['estado_servicio' => 'en_servicio']);
                $mensajeBitacora = "ASIGNACIÓN DE CONDUCTOR: " . $request->numero_tarjeton . " - " . $conductorNuevo->nombre . ($request->motivo ? " - MOTIVO: " . strtoupper($request->motivo) : "");

            } else if ($tipoMovimiento === 'RETIRO_CONDUCTOR') {
                if (!$registroOperativo) {
                    return response()->json(['error' => 'No hay registro operativo para esta unidad.'], 422);
                }
                $tarjetonAnterior = $registroOperativo->numero_tarjeton;
                $motivoRetiro = strtolower($request->motivo ?? 'falta');
                if ($tarjetonAnterior) {
                    DB::table('conductores')->where('tarjeton', $tarjetonAnterior)->update(['estado_servicio' => $motivoRetiro]);
                    if ($motivoRetiro === 'falta') {
                        DB::table('conductores')->where('tarjeton', $tarjetonAnterior)->increment('faltas');
                    }
                }

                if ($request->cambio_operador_activo) {
                    $conductorNuevo = DB::table('conductores')->where('tarjeton', $request->numero_tarjeton_nuevo)->first();
                    if (!$conductorNuevo) {
                        return response()->json(['error' => 'Conductor de reemplazo no encontrado.'], 404);
                    }
                    $datosUpdate['numero_tarjeton'] = $request->numero_tarjeton_nuevo;
                    $datosUpdate['nombre_conductor'] = $conductorNuevo->nombre;
                    DB::table('conductores')->where('tarjeton', $request->numero_tarjeton_nuevo)->update(['estado_servicio' => 'en_servicio']);

                    $mensajeBitacora = "CAMBIO DE CONDUCTOR A: " . $request->numero_tarjeton_nuevo . " - " . $conductorNuevo->nombre . " - MOTIVO RETIRO ANTERIOR: " . strtoupper($request->motivo ?? '');
                } else {
                    $datosUpdate['numero_tarjeton'] = null;
                    $datosUpdate['nombre_conductor'] = null;
                    $mensajeBitacora = "RETIRO DE CONDUCTOR - MOTIVO: " . strtoupper($request->motivo ?? '');
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