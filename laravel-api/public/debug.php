<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Http\Kernel')->handle(Illuminate\Http\Request::capture());

$today = \Carbon\Carbon::today()->toDateString();
$unidades = \DB::table('unidades')->get();
$cargaron = [];

foreach($unidades as $u) {
    if ($u->fecha_ultima_carga === $today || str_starts_with($u->fecha_ultima_carga ?? '', $today)) {
        if (floatval($u->litros_combustible) > 0) {
            $cargaron[] = $u;
        }
    }
}

echo json_encode([
    'today' => $today,
    'total_unidades' => count($unidades),
    'cargaron_hoy' => $cargaron,
    'raw_some' => \DB::table('unidades')->whereNotNull('fecha_ultima_carga')->limit(3)->get()
], JSON_PRETTY_PRINT);
