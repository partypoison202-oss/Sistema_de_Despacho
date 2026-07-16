<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PlataformaController extends Controller
{
    public function registrarMovimiento(Request $request)
    {
        $request->validate([
            'numero_eco' => 'required',
            'tipo' => 'required|string',
            'tipo_movimiento' => 'required|string|in:INCORPORACION,DESINCORPORACION',
            // Incorporacion
            'conductor' => 'nullable|string',
            'ruta' => 'nullable|string',
            // Desincorporacion
            'motivo' => 'nullable|string',
            'estatus_nuevo' => 'nullable|string|in:RESERVA,MANTENIMIENTO',
        ]);

        DB::beginTransaction();
        try {
            $numeroEco = $request->numero_eco;
            $tipo = $request->tipo;
            $tipoMovimiento = $request->tipo_movimiento;
            $usuarioId = auth()->id();

            // Obtain current unit to record previous state
            $unidad = DB::table('unidades')
                ->where('numero_economico', $numeroEco)
                ->where('tipo_unidad', $tipo)
                ->first();
                
            if (!$unidad) {
                return response()->json(['error' => 'Unidad no encontrada'], 404);
            }
            $unidadId = $unidad->id;

            $estatusAnterior = $unidad->estatus;
            $estatusNuevo = $estatusAnterior;

            if ($tipoMovimiento === 'INCORPORACION') {
                $estatusNuevo = 'OPERACION';
                // Move to operation, update conductor and route
                DB::table('unidades')->where('id', $unidadId)->update([
                    'estatus' => $estatusNuevo,
                    'tarjeton' => $request->conductor,
                    'ruta' => $request->ruta,
                    'updated_at' => Carbon::now()
                ]);
            } else if ($tipoMovimiento === 'DESINCORPORACION') {
                $estatusNuevo = $request->estatus_nuevo;
                // Move out of operation, clear conductor and route
                DB::table('unidades')->where('id', $unidadId)->update([
                    'estatus' => $estatusNuevo,
                    'tarjeton' => null,
                    'ruta' => null,
                    'updated_at' => Carbon::now()
                ]);
            }

            // Record the movement
            DB::table('plataforma_movimientos')->insert([
                'unidad_id' => $unidadId,
                'usuario_id' => $usuarioId,
                'tipo_movimiento' => $tipoMovimiento,
                'estatus_anterior' => $estatusAnterior,
                'estatus_nuevo' => $estatusNuevo,
                'conductor_asignado' => $request->conductor,
                'ruta_asignada' => $request->ruta,
                'motivo' => $request->motivo,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);

            DB::commit();
            return response()->json(['status' => 'success', 'message' => 'Movimiento registrado correctamente']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error en PlataformaController@registrarMovimiento: ' . $e->getMessage());
            return response()->json(['error' => 'No se pudo registrar el movimiento'], 500);
        }
    }
}
