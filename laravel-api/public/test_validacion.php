<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Http\Controllers\API\DespachoController;
use Illuminate\Http\Request;

$unidad = DB::table('informacion_operativa')
    ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
    ->where(function($q) {
        $q->whereNull('informacion_operativa.hora_salida')
          ->orWhere('informacion_operativa.hora_salida', '');
    })
    ->select('informacion_operativa.id', 'unidades.numero_eco', 'informacion_operativa.tipo', 'informacion_operativa.hora_salida')
    ->first();

if (!$unidad) {
    echo "No se encontraron unidades sin despachar.\n";
    exit;
}

$eco = str_pad($unidad->numero_eco, 3, '0', STR_PAD_LEFT);
$tipo = $unidad->tipo;

echo "=== 1. UNIDAD SELECCIONADA ===\n";
echo "Económico: $eco | Tipo: $tipo\n\n";

$controller = app(DespachoController::class);

echo "=== 2. PRIMERA VALIDACIÓN ===\n";
$req1 = Request::create('/api/despacho/validar', 'POST', [
    'numero_eco' => $eco,
    'tipo' => $tipo,
    'hora_salida' => '08:30',
    'ruta' => 'PRUEBA'
]);
$res1 = $controller->validarDespacho($req1);
echo "Enviando hora_salida = 08:30\n";
echo "Respuesta del Controller: " . $res1->getContent() . "\n\n";

echo "=== 3. SEGUNDA VALIDACIÓN (Intento de sobreescribir) ===\n";
$req2 = Request::create('/api/despacho/validar', 'POST', [
    'numero_eco' => $eco,
    'tipo' => $tipo,
    'hora_salida' => '09:00',
    'ruta' => 'PRUEBA2'
]);
$res2 = $controller->validarDespacho($req2);
echo "Enviando nueva hora_salida = 09:00\n";
echo "Respuesta del Controller: " . $res2->getContent() . "\n\n";

echo "=== 4. CAMBIO A MANTENIMIENTO EN MESA DE CONTROL ===\n";
$req3 = Request::create('/api/despacho/estatus', 'POST', [
    'numero_eco' => $eco,
    'tipo' => $tipo,
    'estatus' => 'mantenimiento',
    'motivo_estatus' => 'Prueba de validacion'
]);
$res3 = $controller->cambiarEstatus($req3);
echo "Respuesta del Controller: " . $res3->getContent() . "\n\n";

$final = DB::table('informacion_operativa')->where('id', $unidad->id)->first();

echo "=== 5. RESULTADO FINAL EN BASE DE DATOS ===\n";
echo "Estatus actual: " . $final->estatus . "\n";
echo "Ruta actual: " . ($final->ruta ?: 'NULO (Se borró al pasar a mantenimiento)') . "\n";
echo "Hora de salida guardada: " . $final->hora_salida . " (Debería seguir siendo 08:30)\n";
