<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\DespachoController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;

// Autenticación pública
Route::post('/login', [AuthController::class, 'login']);

// Rutas Protegidas por Sanctum
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Gestión de Usuarios
    Route::get('/users/roles', [UserController::class, 'roles']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
    
    // Ruta para que React suba el JSON del Excel procesado
    Route::post('/despacho/importar', [DespachoController::class, 'importar']);

    // ✅ IMPORTANTE: Esta ruta DEBE ir ANTES de la ruta genérica {tipo}
    // De lo contrario, Laravel interpreta "detalle" como un tipo de transporte
    Route::get('/unidades/detalle/{tipo}/{numeroEco}', [DespachoController::class, 'obtenerDetalleUnidad']);

    // Ruta para obtener la lista de todas las unidades válidas en BD según su tipo
    Route::get('/unidades/listar/{tipo}', [DespachoController::class, 'listarUnidadesPorTipo']);

    // Ruta para que las pantallas de Urbanus, Zafiro, etc., pidan sus carros de hoy
    Route::get('/unidades/{tipo}', [DespachoController::class, 'obtenerPorTipo']);
});