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

    // RUTAS PARA TITAN
    Route::get('/titan/unidades', [App\Http\Controllers\API\TitanController::class, 'getUnidadesOperacion']);
    Route::post('/titan/reporte', [App\Http\Controllers\API\TitanController::class, 'guardarReporte']);
});

Route::get('/setup-titan', function() {
    try {
        // Insert TITAN role if not exists
        \Illuminate\Support\Facades\DB::table('roles')->updateOrInsert(
            ['codigo' => 'TITAN'],
            ['nombre' => 'TITAN']
        );

        // Create reportes_titan table
        if (!\Illuminate\Support\Facades\Schema::hasTable('reportes_titan')) {
            \Illuminate\Support\Facades\Schema::create('reportes_titan', function (Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->foreignId('usuario_id')->constrained('usuarios');
                $table->string('intervalo')->nullable();
                $table->text('observaciones')->nullable();
                $table->string('tipo_evento'); // DESINCORPORACION, INCORPORACION, ACCIDENTE
                
                // Desincorporacion / Incorporacion
                $table->string('corrida')->nullable();
                $table->string('hora_evento')->nullable();
                $table->string('ubicacion_gps')->nullable();
                $table->text('motivo_desincorporacion')->nullable();
                
                // Accidentes
                $table->string('accidente_dueno')->nullable();
                $table->string('accidente_vehiculo')->nullable();
                $table->string('accidente_placas')->nullable();
                $table->boolean('accidente_seguro')->nullable();
                $table->text('accidente_hechos')->nullable();
                
                $table->timestamps();
            });
        }

        // Create reportes_titan_fotos table
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