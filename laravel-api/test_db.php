<?php
require 'vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$record = \Illuminate\Support\Facades\DB::table('informacion_operativa')->first();
echo json_encode($record);
