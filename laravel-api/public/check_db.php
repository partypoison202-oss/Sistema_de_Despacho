<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$rows = \Illuminate\Support\Facades\DB::table('informacion_operativa')->select('id', 'unidad_id', 'patio_norte')->limit(10)->get();
echo "Data from informacion_operativa:\n";
print_r($rows);
