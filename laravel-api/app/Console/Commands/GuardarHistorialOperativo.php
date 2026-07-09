<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

#[Signature('historial:guardar')]
#[Description('Guarda un snapshot diario de la tabla informacion_operativa en historial_operativo')]
class GuardarHistorialOperativo extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $fechaHoy = Carbon::today()->toDateString();
        
        // Verificar si ya se guardó hoy para no duplicar si se corre manual
        $existe = DB::table('historial_operativo')->where('fecha_historial', $fechaHoy)->exists();
        if ($existe) {
            $this->info("El historial para {$fechaHoy} ya existe.");
            return;
        }

        $registrosHoy = DB::table('informacion_operativa')
            ->whereDate('fecha_registro', $fechaHoy)
            ->get();

        if ($registrosHoy->isEmpty()) {
            $this->info("No hay registros operativos de hoy ({$fechaHoy}) para guardar.");
            return;
        }

        $datosInsertar = $registrosHoy->map(function ($registro) use ($fechaHoy) {
            return [
                'fecha_historial' => $fechaHoy,
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
                'created_at'      => now(),
                'updated_at'      => now(),
            ];
        })->toArray();

        DB::table('historial_operativo')->insert($datosInsertar);

        $this->info("Se han guardado " . count($datosInsertar) . " registros en el historial_operativo para la fecha {$fechaHoy}.");
    }
}
