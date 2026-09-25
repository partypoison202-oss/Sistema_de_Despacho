<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class BitacoraConductorHelper
{
    /**
     * Asegura que exista la tabla bitacora_conductores.
     */
    public static function ensureTableExists()
    {
        try {
            if (!Schema::hasTable('bitacora_conductores')) {
                Schema::create('bitacora_conductores', function (Blueprint $table) {
                    $table->id();
                    $table->unsignedBigInteger('conductor_id')->nullable();
                    $table->string('tarjeton', 50)->nullable();
                    $table->string('nombre_conductor', 255)->nullable();
                    $table->unsignedBigInteger('usuario_id')->nullable();
                    $table->string('usuario_nombre', 255)->nullable();
                    $table->string('tipo_accion', 100);
                    $table->text('detalles')->nullable();
                    $table->date('fecha');
                    $table->timestamps();
                });
            }
        } catch (\Exception $e) {
            Log::error('Error al asegurar tabla bitacora_conductores: ' . $e->getMessage());
        }
    }

    /**
     * Registra una acción de gestión de conductores en la bitácora.
     */
    public static function registrarAccion($conductorId, $tarjeton, $nombreConductor, $tipoAccion, $detalles, $request = null)
    {
        try {
            self::ensureTableExists();

            $usuarioId = null;
            $usuarioNombre = 'Sistema';

            if ($request && method_exists($request, 'user') && $request->user()) {
                $usuarioId = $request->user()->id;
                $usuarioNombre = $request->user()->nombre_completo ?? $request->user()->name ?? $request->user()->usuario ?? 'Usuario';
            } elseif (auth('sanctum')->check()) {
                $u = auth('sanctum')->user();
                $usuarioId = $u->id;
                $usuarioNombre = $u->nombre_completo ?? $u->name ?? $u->usuario ?? 'Usuario';
            }

            DB::table('bitacora_conductores')->insert([
                'conductor_id'     => $conductorId,
                'tarjeton'         => $tarjeton ? (string)$tarjeton : null,
                'nombre_conductor' => $nombreConductor ? (string)$nombreConductor : null,
                'usuario_id'       => $usuarioId,
                'usuario_nombre'   => $usuarioNombre,
                'tipo_accion'      => $tipoAccion,
                'detalles'         => $detalles,
                'fecha'            => Carbon::today()->toDateString(),
                'created_at'       => Carbon::now(),
                'updated_at'       => Carbon::now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error al registrar en bitacora_conductores: ' . $e->getMessage());
        }
    }
}
