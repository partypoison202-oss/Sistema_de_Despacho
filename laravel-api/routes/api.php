<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\DespachoController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;

// Autenticación pública (no requiere token)
Route::post('/login', [AuthController::class, 'login'])->name('login');

// Todas las rutas dentro de este grupo requieren autenticación con Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Gestión de Usuarios
    Route::get('/users/roles', [UserController::class, 'roles']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
    
    // Gestión de Despacho
    Route::post('/despacho/importar', [DespachoController::class, 'importar']);
    Route::post('/despacho/actualizar', [DespachoController::class, 'actualizar']);
    Route::get('/despacho/conteo-unidades', [DespachoController::class, 'conteoUnidadesPorTipo']);

    // Rutas de Unidades (orden específico para evitar conflictos)
    Route::get('/unidades/detalle/{tipo}/{numeroEco}', [DespachoController::class, 'obtenerDetalleUnidad']);
    Route::get('/unidades/listar/{tipo}', [DespachoController::class, 'listarUnidadesPorTipo']); // <-- Esta es la que necesitas
    Route::get('/unidades/{tipo}', [DespachoController::class, 'obtenerPorTipo']);
});