<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Conductor;
use App\Http\Controllers\API\ConductorController;

class LimpiarFaltasDuplicadas extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'conductores:limpiar-duplicados {id? : ID o Tarjetón del conductor específico}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Elimina faltas duplicadas (misma fecha de inasistencia) y recalcula el conteo activo de faltas.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $targetId = $this->argument('id');
        $controller = new ConductorController();

        if ($targetId) {
            $conductor = is_numeric($targetId) ? Conductor::find($targetId) : null;
            if (!$conductor) {
                $conductor = Conductor::where('tarjeton', $targetId)
                    ->orWhere('tarjeton', str_pad((string)$targetId, 4, '0', STR_PAD_LEFT))
                    ->orWhere('tarjeton', ltrim((string)$targetId, '0'))
                    ->first();
            }

            if (!$conductor) {
                $this->error("No se encontró ningún conductor con ID o Tarjetón: {$targetId}");
                return 1;
            }

            $faltasAntes = $conductor->faltas;
            $limpiado = $controller->limpiarDuplicadosConductor($conductor);
            $conductorFresh = $conductor->fresh();

            if ($limpiado) {
                $this->info("✔ Conductor {$conductorFresh->nombre} (Tarjetón: {$conductorFresh->tarjeton}):");
                $this->info("   Faltas antes: {$faltasAntes} -> Faltas ahora: {$conductorFresh->faltas}");
            } else {
                $this->info("El conductor {$conductorFresh->nombre} (Tarjetón: {$conductorFresh->tarjeton}) no tenía faltas duplicadas.");
            }
            return 0;
        }

        $this->info("Iniciando análisis de faltas duplicadas en todos los conductores...");
        $conductores = Conductor::whereNotNull('faltas_detalle')->get();
        $totalLimpiados = 0;

        foreach ($conductores as $c) {
            $faltasAntes = $c->faltas;
            if ($controller->limpiarDuplicadosConductor($c)) {
                $totalLimpiados++;
                $cFresh = $c->fresh();
                $this->line("✔ Corregido: {$cFresh->nombre} (Tarjetón: {$cFresh->tarjeton}) de {$faltasAntes} a {$cFresh->faltas} faltas.");
            }
        }

        $this->info("✔ Proceso finalizado. Se limpiaron faltas duplicadas en {$totalLimpiados} conductor(es).");
        return 0;
    }
}
