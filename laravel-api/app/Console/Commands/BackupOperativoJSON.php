<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BackupOperativoJSON extends Command
{
    protected $signature = 'backup:operativo-json';
    protected $description = 'Respaldo de las 7 tablas operativas en JSON antes de migración hora_salida_patio';

    protected $tables = [
        'informacion_operativa',
        'historial_operativo',
        'informacion_operativa_manana',
        'informacion_operativa_sabado',
        'informacion_operativa_domingo',
        'informacion_operativa_lunes',
        'informacion_operativa_festivo',
    ];

    public function handle()
    {
        $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
        $dirPath   = storage_path("backups");

        if (!is_dir($dirPath)) {
            mkdir($dirPath, 0755, true);
        }

        $this->info("📦 Iniciando respaldo de tablas operativas...");

        $totalRows = 0;

        foreach ($this->tables as $table) {
            $rows = DB::table($table)->get();

            $filePath = "{$dirPath}/{$timestamp}_{$table}.json";
            file_put_contents($filePath, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            $count = count($rows);
            $totalRows += $count;
            $this->info("  ✅ {$table}: {$count} registros → {$filePath}");
        }

        $indexPath = "{$dirPath}/{$timestamp}_index.json";
        file_put_contents($indexPath, json_encode([
            'timestamp' => $timestamp,
            'razon' => 'Respaldo previo a renombramiento de hora_programada → hora_salida_patio',
            'tablas' => $this->tables,
            'total_registros' => $totalRows,
        ], JSON_PRETTY_PRINT));

        $this->info("\n🎉 Respaldo completado. Total: {$totalRows} registros.");
        $this->info("📁 Archivos en: {$dirPath}");

        return 0;
    }
}
