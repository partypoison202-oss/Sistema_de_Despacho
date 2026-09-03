<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$unidades = Illuminate\Support\Facades\DB::table('informacion_operativa')
    ->whereNotNull('hora_salida')
    ->orderBy('id', 'desc')
    ->limit(5)
    ->get(['unidad_id', 'hora_salida']);

print_r($unidades);
