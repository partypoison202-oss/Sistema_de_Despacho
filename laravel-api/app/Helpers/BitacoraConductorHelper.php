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
        } catch (\Throwable $e) {
            Log::error('Error al asegurar tabla bitacora_conductores: ' . $e->getMessage());
        }
    }

    /**
     * Registra una acción de gestión de conductores en la bitácora.
     * Soporta ambas firmas:
     * 1) registrarAccion($conductorObj, $tipoAccion, $detalles, $request = null)
     * 2) registrarAccion($conductorId, $tarjeton, $nombreConductor, $tipoAccion, $detalles, $request = null)
     */
    public static function registrarAccion(
        $conductorId,
        $tarjeton = null,
        $nombreConductor = null,
        $tipoAccion = null,
        $detalles = null,
        $request = null
    ) {
        try {
            self::ensureTableExists();

            // Compatibilidad si el 1er parámetro es un objeto (modelo Conductor o stdClass)
            if (is_object($conductorId)) {
                $conductorObj = $conductorId;
                $objId = $conductorObj->id ?? null;
                $objTarjeton = $conductorObj->tarjeton ?? null;
                $objNombre = trim(($conductorObj->nombres ?? '') . ' ' . ($conductorObj->apellidos ?? ''))
                    ?: ($conductorObj->nombre_conductor ?? $conductorObj->nombre ?? null);

                // Si se pasaron hasta 4 argumentos (ej: ($conductor, $tipoAccion, $detalles, $request))
                if (func_num_args() <= 4) {
                    $tipoAccion = $tarjeton; // 2do argumento
                    $detalles = $nombreConductor; // 3er argumento
                    $reqArg = func_num_args() >= 4 ? func_get_arg(3) : null;
                    if ($reqArg && ($reqArg instanceof \Illuminate\Http\Request || is_object($reqArg))) {
                        $request = $reqArg;
                    }
                    $conductorId = $objId;
                    $tarjeton = $objTarjeton;
                    $nombreConductor = $objNombre;
                } else {
                    $conductorId = $objId;
                    if (empty($tarjeton)) $tarjeton = $objTarjeton;
                    if (empty($nombreConductor)) $nombreConductor = $objNombre;
                }
            }

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
                'tipo_accion'      => (string)($tipoAccion ?? 'ACCION'),
                'detalles'         => $detalles,
                'fecha'            => Carbon::today()->toDateString(),
                'created_at'       => Carbon::now(),
                'updated_at'       => Carbon::now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al registrar en bitacora_conductores: ' . $e->getMessage());
        }
    }
}
