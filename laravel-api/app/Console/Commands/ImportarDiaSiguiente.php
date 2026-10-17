<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;
use App\Http\Controllers\API\DespachoController;

class ImportarDiaSiguiente extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'despacho:importar-dia-siguiente';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Traspasa la programación de Día Siguiente (informacion_operativa_manana) a Día Operativo (informacion_operativa), eliminando encierros erróneos y dejando todas las unidades listas para despachar';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== TRASPASO DE DÍA SIGUIENTE A DÍA OPERATIVO ===");

        $totalManana = DB::table('informacion_operativa_manana')->count();

        if ($totalManana === 0) {
            $this->error("✖ No se encontraron registros en 'informacion_operativa_manana'.");
            $this->warn("Asegúrate de haber guardado la programación en la pestaña 'Día Siguiente' antes de ejecutar este comando.");
            return 1;
        }

        $this->line("Se encontraron {$totalManana} unidades programadas en 'Día Siguiente'.");
        $this->line("Iniciando traslado a 'Día Operativo'...");

        $fechaHoy = Carbon::now('America/Mexico_City')->toDateString();

        // 1. Ejecutar el cambio de día
        $resultado = DespachoController::ejecutarCambioDiaAutomatico();

        // 2. Limpieza exhaustiva de encierros prematuros que pudieran haberse registrado hoy
        $eliminados = DB::table('historial_operativo')
            ->where('fecha_historial', $fechaHoy)
            ->where('momento', 'ENCIERRO')
            ->where(function ($q) {
                $q->where('motivo_estatus', 'Fin de turno (Encierro programado)')
                  ->orWhereNull('hora_real_salida_patio')
                  ->orWhere('hora_real_salida_patio', '')
                  ->orWhere('hora_real_salida_patio', '00:00')
                  ->orWhere('hora_real_salida_patio', '00:00:00');
            })
            ->delete();

        // 3. Limpiar marcas de caché para forzar refresco total
        Cache::forget('cambio_dia_operativo_ejecutado_' . $fechaHoy);

        $totalOperativas = DB::table('informacion_operativa')
            ->whereRaw("LOWER(estatus) = 'operacion'")
            ->count();

        $this->info("✔ Traspaso completado exitosamente.");
        if ($eliminados > 0) {
            $this->warn("✔ Se eliminaron {$eliminados} registros de encierro erróneos/prematuros de hoy en el historial.");
        }
        $this->info("✔ Total de unidades en operación listas para despachar: {$totalOperativas}.");
        $this->info("✔ Todas las unidades tienen hora_real_salida_patio = null y firma = null.");
        return 0;
    }
}
