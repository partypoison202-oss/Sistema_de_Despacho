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
            'tipo_movimiento' => 'required|string|in:INCORPORACION,DESINCORPORACION',
            'conductor' => 'nullable|string',
            'ruta' => 'nullable|string',
            'motivo' => 'nullable|string',
            'estatus_nuevo' => 'nullable|string|in:RESERVA,MANTENIMIENTO,PATIO NORTE',
            'unidad_reemplazo' => 'nullable|string',
            'tarjeton_reemplazo' => 'nullable|string',
            'conductor_reemplazo' => 'nullable|string',
            'ruta_reemplazo' => 'nullable|string',
            'corrida_reemplazo' => 'nullable|string',
            'corridas_perdidas_reemplazo' => 'nullable|string',
            'corrida_perdida_otro' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $numeroEco = trim((string) $request->numero_eco);
            $tipoMovimiento = $request->tipo_movimiento;
            $usuarioId = auth()->id();

            Log::info('Buscando unidad con numero_eco:', ['numero_eco' => $numeroEco]);

            // tipo (urbanuss/orion/zafiro/vagoneta) es fijo según el numero_eco,
            // NO se modifica nunca en este flujo.
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

            // El estatus real y vigente de la unidad vive en `informacion_operativa`
            // (la misma tabla que usa DespachoController para todo el sistema).
            $registroOperativo = DB::table('informacion_operativa')
                ->where('unidad_id', $unidadId)
                ->first();

            // Si nunca ha tenido registro operativo, se asume RESERVA.
            $estatusAnteriorRaw = $registroOperativo->estatus ?? 'RESERVA';
            $estatusAnterior = strtoupper(trim($estatusAnteriorRaw));
            $estatusNuevo = $estatusAnterior;

            if ($tipoMovimiento === 'INCORPORACION') {
                if ($estatusAnterior === 'OPERACION') {
                    return response()->json([
                        'error' => 'La unidad ya está en operación'
                    ], 422);
                }
                $estatusNuevo = 'OPERACION';
            } else if ($tipoMovimiento === 'DESINCORPORACION') {
                if ($estatusAnterior !== 'OPERACION') {
                    return response()->json([
                        'error' => 'La unidad no está en operación, no se puede desincorporar'
                    ], 422);
                }
                $estatusNuevo = $request->estatus_nuevo ?? 'RESERVA';
            }

            // Sincronizar el cambio con informacion_operativa, que es la tabla
            // que consume el resto del sistema (DespachoController).
            if ($registroOperativo) {
                DB::table('informacion_operativa')
                    ->where('id', $registroOperativo->id)
                    ->update([
                        'estatus' => strtolower($estatusNuevo),
                    ]);
            } else {
                Log::warning('No existe registro en informacion_operativa para esta unidad; solo se registrará el historial.', ['unidad_id' => $unidadId]);
            }

            // Registrar movimiento en plataforma_movimientos.
            // Aquí sí se guarda el historial de conductor, ruta, motivo y estatus.
            DB::table('plataforma_movimientos')->insert([
                'unidad_id' => $unidadId,
                'usuario_id' => $usuarioId,
                'tipo_movimiento' => $tipoMovimiento,
                'estatus_anterior' => $estatusAnterior,
                'estatus_nuevo' => $estatusNuevo,
                'conductor_asignado' => $request->conductor,
                'ruta_asignada' => $request->ruta,
                'motivo' => $request->motivo,
                'unidad_reemplazo' => $request->unidad_reemplazo,
                'tarjeton_reemplazo' => $request->tarjeton_reemplazo,
                'conductor_reemplazo' => $request->conductor_reemplazo,
                'ruta_reemplazo' => $request->ruta_reemplazo,
                'corrida_reemplazo' => $request->corrida_reemplazo,
                'corridas_perdidas_reemplazo' => $request->corridas_perdidas_reemplazo,
                'corrida_perdida_otro' => $request->corrida_perdida_otro,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);

            // Registrar acción en la bitácora de cambios diaria
            BitacoraHelper::registrarCambio(
                $unidadId,
                $tipoMovimiento,
                $tipoMovimiento === 'INCORPORACION'
                    ? "INCORPORACIÓN - CONDUCTOR: " . strtoupper($request->conductor ?? 'SIN ASIGNAR') . ", RUTA: " . strtoupper($request->ruta ?? 'SIN RUTA')
                    : "DESINCORPORACIÓN A " . strtoupper($estatusNuevo) . ($request->motivo ? " - MOTIVO: " . strtoupper($request->motivo) : ""),
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