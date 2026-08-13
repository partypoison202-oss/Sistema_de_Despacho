<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class BitacoraHelper
{
    /**
     * Asegura que exista el snapshot de INICIO para el día de hoy.
     * Toma una foto de 'informacion_operativa' y la guarda como 'INICIO'
     * si aún no existe en historial_operativo.
     */
    public static function ensureInicioSnapshot()
    {
        try {
            $hoy = Carbon::today()->toDateString();

            // Verificar si ya existe el snapshot de INICIO para hoy
            $existe = DB::table('historial_operativo')
                ->where('fecha_historial', $hoy)
                ->where('momento', 'INICIO')
                ->exists();

            if (!$existe) {
                $registros = DB::table('informacion_operativa')->get();

                if ($registros->isNotEmpty()) {
                    $hasManiobrista = \Illuminate\Support\Facades\Schema::hasColumn('historial_operativo', 'tarjeton_maniobrista');

                    $datosInsertar = $registros->map(function ($registro) use ($hoy, $hasManiobrista) {
                        $item = [
                            'fecha_historial' => $hoy,
                            'momento'         => 'INICIO',
                            'unidad_id'       => $registro->unidad_id,
                            'ruta'            => $registro->ruta,
                            'numero_tarjeton' => $registro->numero_tarjeton,
                            'nombre_conductor'=> $registro->nombre_conductor,
                            'tipo'            => $registro->tipo,
                            'estatus'         => $registro->estatus,
                            'falla'           => $registro->falla,
                            'corridas'        => $registro->corridas,
                            'ciclo'           => $registro->ciclo,
                            'motivo'          => $registro->motivo,
                            'hora_programada' => $registro->hora_programada,
                            'motivo_estatus'  => $registro->motivo_estatus,
                            'fecha_registro'  => $registro->fecha_registro,
                            'created_at'      => Carbon::now(),
                            'updated_at'      => Carbon::now(),
                        ];

                        if ($hasManiobrista) {
                            $item['tarjeton_maniobrista'] = $registro->tarjeton_maniobrista ?? null;
                            $item['nombre_maniobrista'] = $registro->nombre_maniobrista ?? null;
                        }

                        return $item;
                    })->toArray();

                    DB::table('historial_operativo')->insert($datosInsertar);
                    Log::info("Snapshot INICIO guardado de forma auto-generada para la fecha {$hoy}.");
                }
            }
        } catch (\Exception $e) {
            Log::error('Error en BitacoraHelper::ensureInicioSnapshot: ' . $e->getMessage());
        }
    }

    /**
     * Guarda un registro en la tabla de bitácora de cambios.
     */
    public static function registrarCambio($unidadId, $tipoAccion, $detalles, $anterior = null, $nuevo = null)
    {
        try {
            self::ensureInicioSnapshot();

            DB::table('bitacora_cambios_unidades')->insert([
                'unidad_id' => $unidadId,
                'usuario_id' => auth()->id(),
                'fecha' => Carbon::today()->toDateString(),
                'tipo_accion' => $tipoAccion,
                'estatus_anterior' => $anterior,
                'estatus_nuevo' => $nuevo,
                'detalles' => $detalles,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);
        } catch (\Exception $e) {
            Log::error('Error en BitacoraHelper::registrarCambio: ' . $e->getMessage());
        }
    }
}
