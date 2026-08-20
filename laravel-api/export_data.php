<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Exportamos todas las tablas de catálogos, configuraciones y estados para iniciar limpios sin seeders
$tables = [
    'roles',
    'transportes',
    'rutas',
    'secciones_unidad',
    'unidades',
    'conductores',
    'maniobristas',
    'informacion_operativa',
    'observacion_catalogos'
];

// Tablas que NO tienen created_at / updated_at en el código de producción
$tablesWithoutTimestamps = [
    'roles',
    'transportes',
    'rutas',
    'secciones_unidad',
    'unidades',
    'informacion_operativa'
];

$sql = "BEGIN;\n";
$sql .= "-- Archivo generado automáticamente desde Neon DB\n\n";

foreach ($tables as $table) {
    if (!Schema::hasTable($table)) continue;
    
    $rows = DB::table($table)->get();
    if ($rows->isEmpty()) continue;
    
    $sql .= "-- Tabla: $table\n";
    foreach ($rows as $row) {
        $rowArray = (array)$row;
        
        // Remover timestamps si la tabla no los soporta en producción
        if (in_array($table, $tablesWithoutTimestamps)) {
            unset($rowArray['created_at']);
            unset($rowArray['updated_at']);
        }
        
        $columns = array_keys($rowArray);
        $values = [];
        
        foreach ($columns as $col) {
            $val = $rowArray[$col];
            if ($val === null) {
                $values[] = 'NULL';
            } elseif (is_bool($val)) {
                $values[] = $val ? 'true' : 'false';
            } else {
                $valStr = (string)$val;
                $escaped = str_replace("'", "''", $valStr);
                $values[] = "'" . $escaped . "'";
            }
        }
        
        $colString = implode(', ', array_map(fn($c) => '"' . $c . '"', $columns));
        $valString = implode(', ', $values);
        
        // Si la tabla tiene columna "id", hacemos UPSERT para actualizar cualquier dato existente
        if (in_array('id', $columns)) {
            $updateParts = [];
            foreach ($columns as $col) {
                if ($col === 'id') continue;
                $updateParts[] = "\"$col\" = EXCLUDED.\"$col\"";
            }
            if (!empty($updateParts)) {
                $updateString = implode(', ', $updateParts);
                $sql .= "INSERT INTO \"$table\" ($colString) VALUES ($valString) ON CONFLICT (id) DO UPDATE SET $updateString;\n";
            } else {
                $sql .= "INSERT INTO \"$table\" ($colString) VALUES ($valString) ON CONFLICT DO NOTHING;\n";
            }
        } else {
            $sql .= "INSERT INTO \"$table\" ($colString) VALUES ($valString) ON CONFLICT DO NOTHING;\n";
        }
    }
    
    // Reset sequence for PostgreSQL
    $sql .= "SELECT setval(pg_get_serial_sequence('$table', 'id'), COALESCE((SELECT MAX(id) FROM \"$table\"), 1));\n\n";
}

$sql .= "COMMIT;\n";

file_put_contents(__DIR__.'/export.sql', $sql);
echo "Export completado en export.sql\n";
