<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\DespachoController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\ReporteController;
use App\Http\Controllers\API\ConductorController;
use App\Http\Controllers\API\ManiobristaController;
use App\Http\Controllers\ChecklistController;
use App\Http\Controllers\API\PlataformaController;
use App\Http\Controllers\API\TitanController;
use App\Http\Controllers\API\TitanReporteController;
use App\Http\Controllers\API\HistorialOperativoController;
use App\Http\Controllers\API\BitacoraController;
use App\Http\Controllers\API\InfraccionController;
use App\Http\Controllers\ObservacionCatalogoController;

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

Route::get('/fix-manana-table', function() {
    if (!Schema::hasTable('informacion_operativa_manana')) {
        Schema::create('informacion_operativa_manana', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unidad_id')->constrained('unidades');
            $table->string('ruta', 20)->nullable();
            $table->string('numero_tarjeton', 20)->nullable();
            $table->string('nombre_conductor', 200)->nullable();
            $table->string('tipo', 50)->nullable();
            $table->string('estatus', 20)->nullable();
            $table->string('falla', 50)->nullable();
            $table->integer('corridas')->nullable();
            $table->string('ciclo', 10)->nullable();
            $table->string('motivo', 50)->nullable();
            $table->string('hora_programada', 20)->nullable();
            $table->string('hora_salida', 20)->nullable();
            $table->string('acople', 50)->nullable();
            $table->string('cambio_desde', 50)->nullable();
            $table->string('cambio_motivo', 200)->nullable();
            $table->string('motivo_estatus', 200)->nullable();
            $table->text('observaciones')->nullable();
            $table->string('tarjeton_maniobrista', 50)->nullable()->default('');
            $table->string('nombre_maniobrista', 200)->nullable()->default('');
            $table->timestamp('fecha_registro')->nullable()->useCurrent();
        });
        return 'Tabla informacion_operativa_manana creada con éxito.';
    }
    return 'La tabla ya existe.';
});

Route::get('/fix-findesemana-tables', function() {
    $diasFinSemana = ['sabado', 'domingo', 'lunes', 'festivo'];
    $creadas = [];
    foreach ($diasFinSemana as $dia) {
        $tableName = 'informacion_operativa_' . $dia;
        if (!Schema::hasTable($tableName)) {
            Schema::create($tableName, function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->string('ruta', 20)->nullable();
                $table->string('numero_tarjeton', 20)->nullable();
                $table->string('nombre_conductor', 200)->nullable();
                $table->string('tipo', 50)->nullable();
                $table->string('estatus', 20)->nullable();
                $table->string('falla', 50)->nullable();
                $table->integer('corridas')->nullable();
                $table->string('ciclo', 10)->nullable();
                $table->string('motivo', 50)->nullable();
                $table->string('hora_programada', 20)->nullable();
                $table->string('hora_salida', 20)->nullable();
                $table->string('acople', 50)->nullable();
                $table->string('cambio_desde', 50)->nullable();
                $table->string('cambio_motivo', 200)->nullable();
                $table->string('motivo_estatus', 200)->nullable();
                $table->text('observaciones')->nullable();
                // Columnas de mantenimiento
                $table->string('folio_mantenimiento', 50)->nullable();
                $table->date('fecha_folio_mantenimiento')->nullable();
                
                $table->string('tarjeton_maniobrista', 50)->nullable()->default('');
                $table->string('nombre_maniobrista', 200)->nullable()->default('');
                $table->timestamp('fecha_registro')->nullable()->useCurrent();
            });
            $creadas[] = $tableName;
        }
    }
    
    // Opcional: Eliminar la tabla de fin de semana genérica si existe
    if (Schema::hasTable('informacion_operativa_findesemana')) {
        Schema::dropIfExists('informacion_operativa_findesemana');
    }

    if (empty($creadas)) return 'Las 3 tablas ya existen.';
    return 'Tablas creadas con éxito: ' . implode(', ', $creadas);
});

// Autenticación pública (no requiere token)
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::get('/reporte/general', [ReporteController::class, 'reporteGeneral']);

// Rutas que requieren autenticación con Sanctum
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/observaciones-catalogo', [ObservacionCatalogoController::class, 'index']);
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
    Route::get('/despacho/inicio-hoy', [DespachoController::class, 'obtenerInicioHoy']);
    Route::get('/despacho/manana', [DespachoController::class, 'obtenerDatosManana']);
    Route::get('/despacho/especifico/{dia}', [DespachoController::class, 'obtenerDatosEspecifico']);
    Route::post('/despacho/importar', [DespachoController::class, 'importar']);
    Route::post('/despacho/actualizar', [DespachoController::class, 'actualizar']);
    Route::post('/despacho/actualizar-manana', [DespachoController::class, 'actualizarManana']);
    Route::post('/despacho/actualizar-especifico/{dia}', [DespachoController::class, 'actualizarEspecifico']);
    Route::post('/despacho/aplicar-cambio-dia', [DespachoController::class, 'aplicarCambioDia']);
    Route::post('/despacho/aplicar-cambio-especifico/{dia}', [DespachoController::class, 'aplicarCambioDiaEspecifico']);
    Route::post('/despacho/actualizar-adicionales', [DespachoController::class, 'actualizarAdicionales']);
    Route::post('/despacho/actualizar-tarjeton', [DespachoController::class, 'actualizarTarjeton']);
    Route::post('/despacho/actualizar-tarjeton-maniobrista', [DespachoController::class, 'actualizarTarjetonManiobrista']);
    Route::post('/despacho/actualizar-horas', [DespachoController::class, 'actualizarHoras']);
    Route::post('/despacho/validar', [DespachoController::class, 'validarDespacho']);
    Route::get('/despacho/catalogo/unidades', [DespachoController::class, 'obtenerCatalogoUnidades']);
    Route::get('/despacho/pendientes-mantenimiento', [DespachoController::class, 'obtenerPendientesMantenimiento']);
    Route::get('/despacho/conteo-unidades', [DespachoController::class, 'conteoUnidadesPorTipo']);
    Route::post('/mantenimiento/guardar', [DespachoController::class, 'guardarMantenimiento']);
    Route::get('/mantenimiento/ultimo-registro/{eco}', [DespachoController::class, 'ultimoRegistroMantenimiento']);
    Route::post('/mantenimiento/asignar-incidencia', [DespachoController::class, 'asignarIncidencia']);
    Route::post('/mantenimiento/generar-folio', [DespachoController::class, 'generarFolioMantenimiento']);
    Route::get('/mantenimiento/reporte-combustible', [DespachoController::class, 'reporteCombustibleDiario']);


    // Gestión de Conductores
    Route::get('/conductores', [ConductorController::class, 'index']);
    Route::post('/conductores', [ConductorController::class, 'store']);
    Route::put('/conductores/{id}', [ConductorController::class, 'update']);
    Route::post('/conductores/{id}/foto', [ConductorController::class, 'uploadFoto']);
    Route::post('/conductores/{id}/baja', [ConductorController::class, 'darDeBaja']);

    // Gestión de Maniobristas
    Route::get('/maniobristas', [ManiobristaController::class, 'index']);
    Route::post('/maniobristas', [ManiobristaController::class, 'store']);
    Route::put('/maniobristas/{id}', [ManiobristaController::class, 'update']);
    Route::post('/maniobristas/{id}/baja', [ManiobristaController::class, 'darDeBaja']);

    // Rutas de Unidades
    Route::post('/unidades/cambiar-estatus', [DespachoController::class, 'cambiarEstatus']);
    Route::get('/unidades/buscar-tarjeton/{tipo}/{tarjeton}', [DespachoController::class, 'buscarUnidadPorTarjeton']);
    Route::get('/unidades/detalle/{tipo}/{numeroEco}', [DespachoController::class, 'obtenerDetalleUnidad']);
    Route::get('/unidades/listar/{tipo}', [DespachoController::class, 'listarUnidadesPorTipo']);
    Route::get('/unidades/{tipo}', [DespachoController::class, 'obtenerPorTipo']);

    // ✅ NUEVA RUTA: unidades por ruta
    Route::get('/despacho/unidades-por-ruta/{tipo}/{ruta}', [DespachoController::class, 'unidadesPorRuta']);

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
    Route::get('/historial-operativo/mantenimiento/{fecha}', [HistorialOperativoController::class, 'getHistorialMantenimiento']);
    Route::get('/historial-operativo/general/{fecha}', [HistorialOperativoController::class, 'getHistorialGeneral']);
    Route::get('/historial-operativo/acciones/{fecha}', [HistorialOperativoController::class, 'getHistorialAcciones']);
    Route::get('/bitacoras-diarias', [\App\Http\Controllers\API\BitacorasCentroController::class, 'getBitacoras']);

    // Rutas para TITAN
    Route::get('/titan/notificaciones-pendientes', [TitanReporteController::class, 'notificacionesPendientes']);
    Route::get('/titan/unidades', [TitanController::class, 'getUnidadesOperacion']);
    Route::get('/titan/historico', [TitanController::class, 'getAllReportes']);
    Route::post('/titan/reporte', [TitanController::class, 'guardarReporte']);
    Route::get('/titan/{usuarioId}/reportes', [TitanReporteController::class, 'reportesPorTitan']);

    // Rutas para PLATAFORMA
    Route::post('/plataforma/movimiento', [PlataformaController::class, 'registrarMovimiento']);

    // Rutas para BITACORA
    Route::get('/bitacoras', [BitacoraController::class, 'index']);
    Route::post('/bitacoras', [BitacoraController::class, 'store']);

    // RUTAS PARA AMONESTACIONES E INFRACCIONES
    Route::get('/infracciones/check/{placa}', [InfraccionController::class, 'checkPlaca']);
    Route::post('/infracciones/{id}/send-email', [InfraccionController::class, 'sendEmail']);
    Route::get('/infracciones', [InfraccionController::class, 'index']);
    Route::post('/infracciones', [InfraccionController::class, 'store']);


    // RUTA PARA EL ENVIO DE CORREOS DE PROGRAMACION DIARIA
    // ✅ NUEVA RUTA: envío de PDF a FORTALEZA
Route::post('/despacho/enviar-pdf-fortaleza', [\App\Http\Controllers\API\DespachoEmailController::class, 'enviarPdfFortaleza']);
});

// Rutas de setup (públicas, solo para desarrollo)
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
                $table->string('tipo_evento'); // DESINCORPORACION, INCORPORACION, ACCIDENTE
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
                $table->string('unidad_reemplazo')->nullable();
                $table->string('tarjeton_reemplazo')->nullable();
                $table->string('conductor_reemplazo')->nullable();
                $table->string('ruta_reemplazo')->nullable();
                $table->string('corrida_reemplazo')->nullable();
                $table->string('corridas_perdidas_reemplazo')->nullable();
                $table->string('corrida_perdida_otro')->nullable();
                $table->timestamps();
            });
        } else {
            $table = 'plataforma_movimientos';
            if (!\Illuminate\Support\Facades\Schema::hasColumn($table, 'unidad_reemplazo')) {
                \Illuminate\Support\Facades\Schema::table($table, function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('unidad_reemplazo')->nullable();
                });
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn($table, 'tarjeton_reemplazo')) {
                \Illuminate\Support\Facades\Schema::table($table, function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('tarjeton_reemplazo')->nullable();
                });
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn($table, 'conductor_reemplazo')) {
                \Illuminate\Support\Facades\Schema::table($table, function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('conductor_reemplazo')->nullable();
                });
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn($table, 'ruta_reemplazo')) {
                \Illuminate\Support\Facades\Schema::table($table, function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('ruta_reemplazo')->nullable();
                });
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn($table, 'corrida_reemplazo')) {
                \Illuminate\Support\Facades\Schema::table($table, function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('corrida_reemplazo')->nullable();
                });
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn($table, 'corridas_perdidas_reemplazo')) {
                \Illuminate\Support\Facades\Schema::table($table, function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('corridas_perdidas_reemplazo')->nullable();
                });
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn($table, 'corrida_perdida_otro')) {
                \Illuminate\Support\Facades\Schema::table($table, function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('corrida_perdida_otro')->nullable();
                });
            }
        }

        return response()->json(['message' => 'PLATAFORMA setup completed successfully']);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::get('/setup-infraccion', function () {
    try {
        \Illuminate\Support\Facades\DB::table('roles')->updateOrInsert(
            ['codigo' => 'INFRACCION'],
            ['nombre' => 'INFRACCION']
        );
        return response()->json(['message' => 'INFRACCION setup completed successfully']);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::get('/setup-bitacora', function () {
    try {
        if (!\Illuminate\Support\Facades\Schema::hasTable('bitacoras')) {
            \Illuminate\Support\Facades\Schema::create('bitacoras', function (Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->string('corrida')->nullable();
                $table->string('ruta')->nullable();
                $table->string('unidad')->nullable();
                $table->string('cambio_1')->nullable();
                $table->string('cambio_2')->nullable();
                $table->string('cambio_3')->nullable();
                $table->string('cambio_4')->nullable();
                $table->string('id_matutino')->nullable();
                $table->string('id_vespertino')->nullable();
                $table->timestamps();
            });
            return response()->json(['message' => 'BITACORA table created successfully']);
        } else {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('bitacoras', 'corrida')) {
                \Illuminate\Support\Facades\Schema::table('bitacoras', function (Illuminate\Database\Schema\Blueprint $table) {
                    $table->string('corrida')->nullable()->after('id');
                    $table->string('ruta')->nullable()->after('corrida');
                    $table->string('cambio_1')->nullable()->after('unidad');
                    $table->string('cambio_2')->nullable()->after('cambio_1');
                    $table->string('cambio_3')->nullable()->after('cambio_2');
                    $table->string('cambio_4')->nullable()->after('cambio_3');
                    if (\Illuminate\Support\Facades\Schema::hasColumn('bitacoras', 'cambio')) {
                        $table->dropColumn('cambio');
                    }
                });
                return response()->json(['message' => 'BITACORA table updated with new columns successfully']);
            }
            return response()->json(['message' => 'BITACORA table already up to date']);
        }
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});