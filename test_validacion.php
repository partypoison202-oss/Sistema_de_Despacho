<?php
require __DIR__.'/laravel-api/vendor/autoload.php';
$app = require_once __DIR__.'/laravel-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

$req = Request::create('/test', 'POST', [], [], [], [], json_encode([
    'tipo' => 'URBANUSS',
    'numero_eco' => '027'
]));
$req->headers->set('CONTENT_TYPE', 'application/json');

echo "Has hora_salida? " . ($req->has('hora_salida') ? "Yes" : "No") . "\n";
