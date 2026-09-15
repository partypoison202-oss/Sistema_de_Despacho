<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\API\DespachoController;

class CambioDiaAutomatico extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'despacho:cambio-dia-automatico';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Aplica el cambio de día operativo automáticamente a las 3:30 AM volcando la programación a informacion_operativa';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Iniciando cambio de día operativo automático...");
        $resultado = DespachoController::ejecutarCambioDiaAutomatico();
        
        if (($resultado['status'] ?? '') === 'success') {
            $this->info("✔ " . ($resultado['message'] ?? 'Cambio de día aplicado con éxito.'));
        } elseif (($resultado['status'] ?? '') === 'ignored') {
            $this->warn("ℹ " . ($resultado['message'] ?? 'No se requirieron cambios.'));
        } else {
            $this->error("✖ " . ($resultado['message'] ?? 'Error al aplicar cambio de día.'));
        }
    }
}
