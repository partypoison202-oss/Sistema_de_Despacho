<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\DespachoController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\ReporteController;
use App\Http\Controllers\API\ConductorController;
use App\Http\Controllers\ChecklistController;

// Autenticación pública (no requiere token)
Route::post('/login', [AuthController::class, 'login'])->name('login');

Route::get('/reporte/general', [ReporteController::class, 'reporteGeneral']);
// routes/api.php

Route::get('/reporte/general', [ReporteController::class, 'reporteGeneral']);
// routes/api.php

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
    Route::get('/despacho/rutas', [DespachoController::class, 'obtenerRutas']);
    Route::post('/despacho/actualizar-ruta', [DespachoController::class, 'actualizarRuta']);
    Route::get('/despacho/hoy', [DespachoController::class, 'obtenerDatosHoy']);
    Route::post('/despacho/importar', [DespachoController::class, 'importar']);
    Route::post('/despacho/actualizar', [DespachoController::class, 'actualizar']);
    Route::post('/despacho/actualizar-adicionales', [DespachoController::class, 'actualizarAdicionales']);
    Route::post('/despacho/actualizar-tarjeton', [DespachoController::class, 'actualizarTarjeton']);
    Route::post('/despacho/actualizar-horas', [DespachoController::class, 'actualizarHoras']);
    Route::get('/despacho/conteo-unidades', [DespachoController::class, 'conteoUnidadesPorTipo']);

    // Gestión de Conductores
    Route::get('/conductores', [ConductorController::class, 'index']);

    // Rutas de Unidades (orden específico para evitar conflictos)
    Route::post('/unidades/cambiar-estatus', [DespachoController::class, 'cambiarEstatus']);
    Route::get('/unidades/buscar-tarjeton/{tipo}/{tarjeton}', [DespachoController::class, 'buscarUnidadPorTarjeton']);
    Route::get('/unidades/detalle/{tipo}/{numeroEco}', [DespachoController::class, 'obtenerDetalleUnidad']);
    Route::get('/unidades/listar/{tipo}', [DespachoController::class, 'listarUnidadesPorTipo']); // <-- Esta es la que necesitas
    Route::get('/unidades/{tipo}', [DespachoController::class, 'obtenerPorTipo']);

    //rutas de reportes
    Route::get('/despacho/reporte-general', [ReporteController::class, 'generarReporteGeneralData']);
    Route::get('/despacho/reporte-unidades', [ReporteController::class, 'generarReporteUnidades']);
    
    // Checklist
    Route::post('/checklist', [ChecklistController::class, 'store']);
    Route::put('/checklist/{id}', [ChecklistController::class, 'update']);
    Route::get('/checklists', [ChecklistController::class, 'index']);

    // Historial Operativo
    Route::get('/historial-operativo/fechas', [App\Http\Controllers\API\HistorialOperativoController::class, 'getFechas']);
    Route::get('/historial-operativo/despacho/{fecha}', [App\Http\Controllers\API\HistorialOperativoController::class, 'getHistorialDespacho']);
    Route::get('/historial-operativo/encierro/{fecha}', [App\Http\Controllers\API\HistorialOperativoController::class, 'getHistorialEncierro']);
});