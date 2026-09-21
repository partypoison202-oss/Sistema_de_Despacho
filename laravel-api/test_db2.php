<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$info = DB::table('informacion_operativa')->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')->where('unidades.numero_eco', '004')->orderBy('informacion_operativa.id', 'desc')->select('nombre_conductor', 'relevo_conductor')->first();
echo json_encode($info);
