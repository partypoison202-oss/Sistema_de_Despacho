<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\DespachoController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\ReporteController;
use App\Http\Controllers\API\ConductorController;
use App\Http\Controllers\ChecklistController;
use App\Http\Controllers\API\PlataformaController;
use App\Http\Controllers\API\TitanController;
use App\Http\Controllers\API\TitanReporteController;
use App\Http\Controllers\API\HistorialOperativoController;

// Autenticación pública (no requiere token)
Route::post('/login', [AuthController::class, 'login'])->name('login');

Route::get('/reporte/general', [ReporteController::class, 'reporteGeneral']);

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
    Route::get('/despacho/catalogo/unidades', [DespachoController::class, 'obtenerCatalogoUnidades']);
    Route::get('/despacho/conteo-unidades', [DespachoController::class, 'conteoUnidadesPorTipo']);
    Route::post('/mantenimiento/guardar', [DespachoController::class, 'guardarMantenimiento']);
    Route::get('/mantenimiento/ultimo-registro/{eco}', [DespachoController::class, 'ultimoRegistroMantenimiento']);

    // Gestión de Conductores
    Route::get('/conductores', [ConductorController::class, 'index']);
    Route::post('/conductores', [ConductorController::class, 'store']);
    Route::put('/conductores/{id}', [ConductorController::class, 'update']);
    Route::post('/conductores/{id}/baja', [ConductorController::class, 'darDeBaja']);

    // Rutas de Unidades
    Route::post('/unidades/cambiar-estatus', [DespachoController::class, 'cambiarEstatus']);
    Route::get('/unidades/buscar-tarjeton/{tipo}/{tarjeton}', [DespachoController::class, 'buscarUnidadPorTarjeton']);
    Route::get('/unidades/detalle/{tipo}/{numeroEco}', [DespachoController::class, 'obtenerDetalleUnidad']);
    Route::get('/unidades/listar/{tipo}', [DespachoController::class, 'listarUnidadesPorTipo']);
    Route::get('/unidades/{tipo}', [DespachoController::class, 'obtenerPorTipo']);

    // Rutas de reportes
    Route::get('/despacho/reporte-general', [ReporteController::class, 'generarReporteGeneralData']);
    Route::get('/despacho/reporte-unidades', [ReporteController::class, 'generarReporteUnidades']);

    // Checklist
    Route::post('/checklist', [ChecklistController::class, 'store']);
    Route::put('/checklist/{id}', [ChecklistController::class, 'update']);
    Route::get('/checklists', [ChecklistController::class, 'index']);

    // Historial Operativo
    Route::get('/historial-operativo/fechas', [HistorialOperativoController::class, 'getFechas']);
    Route::get('/historial-operativo/despacho/{fecha}', [HistorialOperativoController::class, 'getHistorialDespacho']);
    Route::get('/historial-operativo/encierro/{fecha}', [HistorialOperativoController::class, 'getHistorialEncierro']);
    Route::get('/historial-operativo/general/{fecha}', [HistorialOperativoController::class, 'getHistorialGeneral']);
    Route::get('/historial-mantenimiento/fechas', [HistorialOperativoController::class, 'getFechasMantenimiento']);
    Route::get('/historial-mantenimiento/{fecha}', [HistorialOperativoController::class, 'getHistorialMantenimiento']);

    // RUTAS PARA TITAN
    Route::get('/titan/unidades', [TitanController::class, 'getUnidadesOperacion']);
    Route::post('/titan/reporte', [TitanController::class, 'guardarReporte']);
    Route::get('/titan/notificaciones-pendientes', [TitanReporteController::class, 'notificacionesPendientes']);
    Route::post('/titan/reportes/marcar-vistos', [TitanReporteController::class, 'marcarVistos']);
    Route::get('/titan/{usuarioId}/reportes', [TitanReporteController::class, 'reportesPorTitan']);

    // RUTAS PARA PLATAFORMA
    Route::post('/plataforma/movimiento', [PlataformaController::class, 'registrarMovimiento']);
});

Route::get('/setup-titan', function () {
    try {
        \Illuminate\Support\Facades\DB::table('roles')->updateOrInsert(
            ['codigo' => 'TITAN'],
            ['nombre' => 'TITAN']
        );

        if (!\Illuminate\Support\Facades\Schema::hasTable('reportes_titan')) {
            \Illuminate\Support\Facades\Schema::create('reportes_titan', function (Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->foreignId('usuario_id')->constrained('usuarios');
                $table->string('intervalo')->nullable();
                $table->text('observaciones')->nullable();
                $table->string('tipo_evento');

                $table->string('corrida')->nullable();
                $table->string('hora_evento')->nullable();
                $table->string('ubicacion_gps')->nullable();
                $table->text('motivo_desincorporacion')->nullable();

                $table->string('accidente_dueno')->nullable();
                $table->string('accidente_vehiculo')->nullable();
                $table->string('accidente_placas')->nullable();
                $table->boolean('accidente_seguro')->nullable();
                $table->text('accidente_hechos')->nullable();
                $table->string('firma_particular')->nullable();

                $table->timestamps();
            });
        }

        if (!\Illuminate\Support\Facades\Schema::hasTable('reportes_titan_fotos')) {
            \Illuminate\Support\Facades\Schema::create('reportes_titan_fotos', function (Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->foreignId('reporte_titan_id')->constrained('reportes_titan')->onDelete('cascade');
                $table->string('ruta_foto');
                $table->timestamps();
            });
        }

        return response()->json(['message' => 'TITAN setup completed successfully']);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::get('/setup-plataforma', function () {
    try {
        \Illuminate\Support\Facades\DB::table('roles')->updateOrInsert(
            ['codigo' => 'PLATAFORMA'],
            ['nombre' => 'PLATAFORMA']
        );

        if (!\Illuminate\Support\Facades\Schema::hasTable('plataforma_movimientos')) {
            \Illuminate\Support\Facades\Schema::create('plataforma_movimientos', function (Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->foreignId('usuario_id')->constrained('usuarios');
                $table->string('tipo_movimiento');
                $table->string('estatus_anterior');
                $table->string('estatus_nuevo');
                $table->string('conductor_asignado')->nullable();
                $table->string('ruta_asignada')->nullable();
                $table->text('motivo')->nullable();
                $table->timestamps();
            });
        }

        return response()->json(['message' => 'PLATAFORMA setup completed successfully']);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});