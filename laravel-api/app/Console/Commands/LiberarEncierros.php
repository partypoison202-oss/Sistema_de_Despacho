<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class LiberarEncierros extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'despacho:liberar-encierros';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Elimina todos los encierros registrados para hoy y deja a toda la flota (incluyendo ECO037 y ECO115) lista para despachar';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $fechaHoy = Carbon::now('America/Mexico_City')->toDateString();

        // 1. Eliminar CUALQUIER registro de encierro de hoy
        $eliminados = DB::table('historial_operativo')
            ->where('fecha_historial', $fechaHoy)
            ->where('momento', 'ENCIERRO')
            ->delete();

        // 2. Limpiar hora_real_salida_patio y firmas en todas las unidades de operación
        DB::table('informacion_operativa')
            ->whereRaw("LOWER(estatus) = 'operacion'")
            ->update([
                'hora_real_salida_patio' => null,
                'hora_salida' => null,
                'firma_base64' => null
            ]);

        // 3. Específicamente garantizar que ECO037 y ECO115 queden en operación y limpias
        $ecos = ['037', '37', '115'];
        $unidadIds = DB::table('unidades')->whereIn('numero_eco', $ecos)->pluck('id')->toArray();
        if (! empty($unidadIds)) {
            DB::table('informacion_operativa')
                ->whereIn('unidad_id', $unidadIds)
                ->update([
                    'estatus' => 'operacion',
                    'motivo_estatus' => null,
                    'hora_real_salida_patio' => null,
                    'hora_salida' => null,
                    'firma_base64' => null
                ]);
        }

        // 4. Limpiar caché
        Cache::forget('cambio_dia_operativo_ejecutado_' . $fechaHoy);

        $this->info("✔ {$eliminados} registros de encierro eliminados para hoy ({$fechaHoy}).");
        $this->info("✔ ECO037, ECO115 y toda la flota han quedado en operación listas para despachar.");
        return 0;
    }
}
