<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\DespachoController;

// Ruta para que React suba el JSON del Excel procesado
Route::post('/despacho/importar', [DespachoController::class, 'importar']);

// ✅ IMPORTANTE: Esta ruta DEBE ir ANTES de la ruta genérica {tipo}
// De lo contrario, Laravel interpreta "detalle" como un tipo de transporte
Route::get('/unidades/detalle/{tipo}/{numeroEco}', [DespachoController::class, 'obtenerDetalleUnidad']);

// Ruta para obtener la lista de todas las unidades válidas en BD según su tipo
Route::get('/unidades/listar/{tipo}', [DespachoController::class, 'listarUnidadesPorTipo']);

// Ruta para que las pantallas de Urbanus, Zafiro, etc., pidan sus carros de hoy
Route::get('/unidades/{tipo}', [DespachoController::class, 'obtenerPorTipo']);