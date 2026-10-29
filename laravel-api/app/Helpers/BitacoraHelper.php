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
    public static function ensureInicioSnapshot($forzar = false)
    {
        try {
            $hoy = Carbon::today('America/Mexico_City')->toDateString();

            if ($forzar) {
                DB::table('historial_operativo')
                    ->where('fecha_historial', $hoy)
                    ->where('momento', 'INICIO')
                    ->delete();
            }

            // Verificar si ya existe el snapshot de INICIO para hoy
            $existe = DB::table('historial_operativo')
                ->where('fecha_historial', $hoy)
                ->where('momento', 'INICIO')
                ->exists();

            if (!$existe) {
                $registros = DB::table('informacion_operativa')->get();

                if ($registros->isNotEmpty()) {
                    $historialCols = array_flip(\Illuminate\Support\Facades\Schema::getColumnListing('historial_operativo'));
                    $hasManiobrista = isset($historialCols['tarjeton_maniobrista']);
                    $hasAcople = isset($historialCols['acople']);
                    $hasHoraSalida = isset($historialCols['hora_salida']);
                    $hasHoraReal = isset($historialCols['hora_real_salida_patio']);
                    $hasRelevo = isset($historialCols['relevo_tarjeton']);
                    $hasItinerario = isset($historialCols['itinerario']);
                    $hasHoraIncorp = isset($historialCols['hora_incorporacion']);
                    $hasHoraDesinc = isset($historialCols['hora_desincorporacion']);
                    $hasHoraEncierro = isset($historialCols['hora_encierro']);
                    $hasFallaReportada = isset($historialCols['falla_reportada']);
                    $hasDiagnostico = isset($historialCols['diagnostico']);
                    $hasObservaciones = isset($historialCols['observaciones']);
                    $hasFolioMantenimiento = isset($historialCols['folio_mantenimiento']);

                    $datosInsertar = $registros->map(function ($registro) use (
                        $hoy, $historialCols, $hasManiobrista, $hasAcople, $hasHoraSalida, 
                        $hasHoraReal, $hasRelevo, $hasItinerario, $hasHoraIncorp, $hasHoraDesinc, 
                        $hasHoraEncierro, $hasFallaReportada, $hasDiagnostico, $hasObservaciones, $hasFolioMantenimiento
                    ) {
                        $fallaSnapshot = $registro->falla ?? ($registro->falla_reportada ?? ($registro->diagnostico ?? null));

                        $item = [
                            'fecha_historial' => $hoy,
                            'momento'         => 'INICIO',
                            'unidad_id'       => $registro->unidad_id,
                            'ruta'            => $registro->ruta,
                            'numero_tarjeton' => $registro->numero_tarjeton,
                            'nombre_conductor'=> $registro->nombre_conductor,
                            'tipo'            => $registro->tipo,
                            'estatus'         => $registro->estatus,
                            'falla'           => $fallaSnapshot,
                            'corridas'        => $registro->corridas,
                            'ciclo'           => $registro->ciclo,
                            'motivo'          => $registro->motivo,
                            'hora_salida_patio' => $registro->hora_salida_patio ?? ($registro->hora_programada ?? null),
                            'motivo_estatus'  => $registro->motivo_estatus,
                            'fecha_registro'  => $registro->fecha_registro,
                            'created_at'      => Carbon::now(),
                            'updated_at'      => Carbon::now(),
                        ];

                        if ($hasManiobrista) {
                            $item['tarjeton_maniobrista'] = $registro->tarjeton_maniobrista ?? null;
                            $item['nombre_maniobrista'] = $registro->nombre_maniobrista ?? null;
                        }

                        if ($hasAcople) {
                            $item['acople'] = $registro->acople ?? null;
                        }

                        if ($hasHoraSalida) {
                            $item['hora_salida'] = $registro->hora_salida ?? ($registro->hora_real_salida_patio ?? null);
                        }

                        if ($hasHoraReal) {
                            $item['hora_real_salida_patio'] = $registro->hora_real_salida_patio ?? ($registro->hora_salida ?? null);
                        }

                        if ($hasRelevo) {
                            $item['relevo_tarjeton'] = $registro->relevo_tarjeton ?? null;
                            $item['relevo_conductor'] = $registro->relevo_conductor ?? null;
                            $item['relevo_hora'] = $registro->relevo_hora ?? null;
                        }

                        if ($hasItinerario) {
                            $item['itinerario'] = filter_var($registro->itinerario ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                        }

                        if ($hasHoraIncorp) {
                            $item['hora_incorporacion'] = $registro->hora_incorporacion ?? null;
                        }

                        if ($hasHoraDesinc) {
                            $item['hora_desincorporacion'] = $registro->hora_desincorporacion ?? null;
                        }

                        if ($hasHoraEncierro) {
                            $item['hora_encierro'] = $registro->hora_encierro ?? null;
                        }

                        if ($hasFallaReportada) {
                            $item['falla_reportada'] = $registro->falla_reportada ?? $fallaSnapshot;
                        }

                        if ($hasDiagnostico) {
                            $item['diagnostico'] = $registro->diagnostico ?? null;
                        }

                        if ($hasObservaciones) {
                            $item['observaciones'] = $registro->observaciones ?? null;
                        }

                        if ($hasFolioMantenimiento) {
                            $item['folio_mantenimiento'] = $registro->folio_mantenimiento ?? null;
                        }

                        return array_intersect_key($item, $historialCols);
                    })->toArray();

                    foreach (array_chunk($datosInsertar, 50) as $chunk) {
                        DB::table('historial_operativo')->insert($chunk);
                    }
                    Log::info("Snapshot INICIO guardado de forma auto-generada para la fecha {$hoy}.");
                }
            }

            // Asegurar también que programacion_inicial capture la flota programada original de hoy
            if (\Illuminate\Support\Facades\Schema::hasTable('programacion_inicial')) {
                if ($forzar) {
                    DB::table('programacion_inicial')->where('fecha', $hoy)->delete();
                }
                $existeProg = DB::table('programacion_inicial')->where('fecha', $hoy)->exists();
                if (!$existeProg) {
                    $regsOperativa = DB::table('informacion_operativa')->get();
                    $inicialCols = array_flip(\Illuminate\Support\Facades\Schema::getColumnListing('programacion_inicial'));
                    $itemsInicial = [];
                    foreach ($regsOperativa as $reg) {
                        $arrayReg = (array) $reg;
                        $estatusOrig = strtolower(trim((string)($arrayReg['estatus'] ?? '')));
                        $tieneRutaManto = !empty($arrayReg['mantenimiento_ruta']);
                        $tieneServicio = !empty($arrayReg['ruta']) || !empty($arrayReg['numero_tarjeton']) || !empty($arrayReg['corridas']);
                        $esProgramada = ($estatusOrig === 'operacion' || $tieneServicio || $tieneRutaManto);

                        if ($esProgramada) {
                            $rowFiltered = [];
                            foreach ($arrayReg as $k => $v) {
                                if (isset($inicialCols[$k])) {
                                    $rowFiltered[$k] = in_array($k, ['patio_norte', 'transporte_patio_norte', 'itinerario'])
                                        ? (filter_var($v, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false')
                                        : $v;
                                }
                            }
                            $rowFiltered['estatus'] = 'operacion';
                            $rowFiltered['fecha'] = $hoy;
                            if ($tieneRutaManto) {
                                $rowFiltered['ruta'] = $arrayReg['mantenimiento_ruta'];
                                if (!empty($arrayReg['mantenimiento_conductor'])) $rowFiltered['nombre_conductor'] = $arrayReg['mantenimiento_conductor'];
                                if (!empty($arrayReg['mantenimiento_tarjeton'])) $rowFiltered['numero_tarjeton'] = $arrayReg['mantenimiento_tarjeton'];
                                if (!empty($arrayReg['mantenimiento_corrida'])) $rowFiltered['corridas'] = $arrayReg['mantenimiento_corrida'];
                            }
                            $rowFiltered['created_at'] = Carbon::now();
                            $rowFiltered['updated_at'] = Carbon::now();
                            $itemsInicial[] = array_intersect_key($rowFiltered, $inicialCols);
                        }
                    }
                    if (!empty($itemsInicial)) {
                        foreach (array_chunk($itemsInicial, 50) as $chunk) {
                            DB::table('programacion_inicial')->insert($chunk);
                        }
                        Log::info("Programación inicial capturada para la fecha {$hoy} (" . count($itemsInicial) . " unidades).");
                    }
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
