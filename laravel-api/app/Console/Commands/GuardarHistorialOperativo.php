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
        $fechaHistorial = Carbon::yesterday()->toDateString();
        
        // Verificar si ya se guardó para no duplicar
        $existe = DB::table('historial_operativo')->where('fecha_historial', $fechaHistorial)->exists();
        if ($existe) {
            $this->info("El historial para {$fechaHistorial} ya existe.");
            return;
        }

        $registros = DB::table('informacion_operativa')->get();

        if ($registros->isEmpty()) {
            $this->info("No hay registros operativos para guardar.");
            return;
        }

        $datosInsertar = $registros->map(function ($registro) use ($fechaHistorial) {
            return [
                'fecha_historial' => $fechaHistorial,
                'momento'         => 'FIN',
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

        $this->info("Se han guardado " . count($datosInsertar) . " registros en el historial_operativo para la fecha {$fechaHistorial}.");
    }
}
