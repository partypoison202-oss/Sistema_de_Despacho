<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\API\ConductorController;

class LimpiarFaltasFuturas extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'despacho:limpiar-faltas-futuras';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Limpia faltas erróneas con fechas futuras y sincroniza los contadores de faltas de conductores';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Iniciando depuración y sincronización de faltas de conductores...");
        $corregidos = ConductorController::limpiarFaltasFuturasErroneas();
        $this->info("✔ Proceso finalizado. Conductores sincronizados o corregidos: {$corregidos}");
        return 0;
    }
}
