<?php
require __DIR__.'/laravel-api/vendor/autoload.php';
$app = require_once __DIR__.'/laravel-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$res = DB::table('informacion_operativa')
    ->where('id', 7474)
    ->update(['hora_salida' => '10:25:38', 'acople' => '06:40']);

echo "Filas actualizadas: " . $res . "\n";

$row = DB::table('informacion_operativa')->where('id', 7474)->first();
echo "Hora salida ahora es: " . $row->hora_salida . "\n";
echo "Acople ahora es: " . $row->acople . "\n";
