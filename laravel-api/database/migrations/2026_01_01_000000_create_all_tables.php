<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * MIGRACIÓN MAESTRA — Todas las tablas del sistema STM.
 *
 * Completamente IDEMPOTENTE: verifica existencia antes de crear/alterar.
 * Orden: dependencias FK primero.
 */
return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        // ─── Sanctum (tokens de API) ──────────────────────────────────
        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        }

        // ─── Roles ────────────────────────────────────────────────────
        if (!Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table) {
                $table->id();
                $table->string('codigo', 30)->unique();
                $table->string('nombre', 100);
                $table->text('descripcion')->nullable();
            });
        }

        // ─── Usuarios ─────────────────────────────────────────────────
        if (!Schema::hasTable('usuarios')) {
            Schema::create('usuarios', function (Blueprint $table) {
                $table->id();
                $table->string('nombre_completo', 150);
                $table->string('usuario', 50)->unique();
                $table->string('correo', 150)->nullable()->unique();
                $table->string('contrasena', 255);
                $table->boolean('activo')->default(true);
                $table->foreignId('rol_id')->nullable()->constrained('roles');
                $table->longText('foto_url')->nullable();
                $table->timestamp('fecha_creacion')->nullable();
                $table->timestamp('fecha_actualizacion')->nullable();
            });
        } else {
            if (!Schema::hasColumn('usuarios', 'foto_url')) {
                Schema::table('usuarios', function (Blueprint $table) {
                    $table->longText('foto_url')->nullable();
                });
            }
        }

        // ─── Transportes ──────────────────────────────────────────────
        if (!Schema::hasTable('transportes')) {
            Schema::create('transportes', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 50)->unique();
            });
        }

        // ─── Unidades ─────────────────────────────────────────────────
        if (!Schema::hasTable('unidades')) {
            Schema::create('unidades', function (Blueprint $table) {
                $table->id();
                $table->foreignId('transporte_id')->constrained('transportes');
                $table->string('numero_eco', 20)->unique();
                $table->string('tipo', 50)->nullable();
                $table->string('nivel_combustible', 10)->nullable();
                $table->string('nivel_adblue', 10)->nullable();
                $table->string('numero_cincho', 20)->nullable();
                $table->string('numero_cincho_adblue', 20)->nullable();
                $table->date('fecha_ultima_carga')->nullable();
                $table->string('kilometraje', 20)->nullable();
                $table->string('odometro', 20)->nullable();
            });
        } else {
            foreach ([
                'tipo'                 => fn($t) => $t->string('tipo', 50)->nullable(),
                'nivel_combustible'    => fn($t) => $t->string('nivel_combustible', 10)->nullable(),
                'nivel_adblue'         => fn($t) => $t->string('nivel_adblue', 10)->nullable(),
                'numero_cincho'        => fn($t) => $t->string('numero_cincho', 20)->nullable(),
                'numero_cincho_adblue' => fn($t) => $t->string('numero_cincho_adblue', 20)->nullable(),
                'fecha_ultima_carga'   => fn($t) => $t->date('fecha_ultima_carga')->nullable(),
                'kilometraje'          => fn($t) => $t->string('kilometraje', 20)->nullable(),
                'odometro'             => fn($t) => $t->string('odometro', 20)->nullable(),
            ] as $col => $def) {
                if (!Schema::hasColumn('unidades', $col)) {
                    Schema::table('unidades', $def);
                }
            }
        }

        // ─── Rutas ────────────────────────────────────────────────────
        if (!Schema::hasTable('rutas')) {
            Schema::create('rutas', function (Blueprint $table) {
                $table->id();
                $table->string('ruta', 20)->unique();
                $table->string('tipo', 20)->nullable();
                $table->timestamps();
            });
        } else {
            if (!Schema::hasColumn('rutas', 'created_at')) {
                Schema::table('rutas', function (Blueprint $table) {
                    $table->timestamps();
                });
            }
        }

        // ─── Secciones Unidad ──────────────────────────────────────────
        if (!Schema::hasTable('secciones_unidad')) {
            Schema::create('secciones_unidad', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 100)->unique();
            });
        }

        // ─── Conductores ──────────────────────────────────────────────
        if (!Schema::hasTable('conductores')) {
            Schema::create('conductores', function (Blueprint $table) {
                $table->id();
                $table->string('nombres', 100)->nullable();
                $table->string('apellidos', 100)->nullable();
                $table->string('tarjeton', 50)->unique();
                $table->string('tipo_tarjeton', 20)->nullable();
                $table->string('estado_servicio', 30)->nullable()->default('activo');
                $table->string('estatus', 30)->nullable();
                $table->string('curp', 20)->nullable();
                $table->string('nss', 20)->nullable();
                $table->string('rfc', 15)->nullable();
                $table->date('fecha_nacimiento')->nullable();
                $table->string('lugar_nacimiento', 100)->nullable();
                $table->string('estado_civil', 30)->nullable();
                $table->string('domicilio', 255)->nullable();
                $table->string('colonia', 100)->nullable();
                $table->string('cp', 10)->nullable();
                $table->string('municipio', 100)->nullable();
                $table->string('telefono', 20)->nullable();
                $table->string('contacto_emergencia', 200)->nullable();
                $table->string('escolaridad', 100)->nullable();
                $table->text('enfermedades')->nullable();
                $table->text('alergias')->nullable();
                $table->text('tipo_sangre')->nullable();
                $table->date('fecha_ingreso')->nullable();
                $table->date('fecha_baja')->nullable();
                $table->string('motivo_baja', 255)->nullable();
                $table->string('numero_convenio', 50)->nullable();
                $table->string('jornada', 50)->nullable();
                $table->string('turno', 50)->nullable();
                $table->string('puesto', 100)->nullable();
                $table->string('categoria', 100)->nullable();
                $table->string('numero_empleado', 50)->nullable();
                $table->string('licencia_tipo', 20)->nullable();
                $table->date('licencia_vencimiento')->nullable();
                $table->text('observaciones')->nullable();
                $table->integer('dias_vacaciones')->nullable()->default(0);
                $table->integer('dias_permiso')->nullable()->default(0);
                $table->text('detalle_permisos')->nullable();
                $table->text('detalle_permutas')->nullable();
                $table->integer('num_accidentes')->nullable()->default(0);
                $table->text('detalle_accidentes')->nullable();
                $table->integer('faltas')->nullable()->default(0);
                
                // Nuevos campos provenientes de Neon DB / Conductor.php
                $table->date('ultima_capacitacion')->nullable();
                $table->date('proxima_capacitacion')->nullable();
                $table->integer('accidentes_siniestros')->nullable()->default(0);
                $table->integer('retardos')->nullable()->default(0);
                $table->integer('amonestaciones')->nullable()->default(0);
                $table->integer('reconocimientos')->nullable()->default(0);
                $table->string('condicionamientos_juridicos', 255)->nullable();
                $table->integer('permutas')->nullable()->default(0);
                $table->integer('permisos')->nullable()->default(0);
                $table->string('evaluacion', 100)->nullable();
                $table->date('vigencia_licencia')->nullable();
                $table->string('sexo', 20)->nullable();
                $table->string('referencia_1', 255)->nullable();
                $table->string('referencia_2', 255)->nullable();
                $table->string('condicionamientos_medicos', 255)->nullable();
                $table->string('foto', 255)->nullable();
                
                $table->json('amonestaciones_detalle')->nullable();
                $table->json('reconocimientos_detalle')->nullable();
                $table->json('permisos_detalle')->nullable();
                $table->json('permutas_detalle')->nullable();
                $table->json('accidentes_siniestros_detalle')->nullable();

                $table->timestamps();
            });
        } else {
            foreach ([
                'tipo_tarjeton'        => fn($t) => $t->string('tipo_tarjeton', 20)->nullable(),
                'estado_servicio'      => fn($t) => $t->string('estado_servicio', 30)->nullable()->default('activo'),
                'estatus'              => fn($t) => $t->string('estatus', 30)->nullable(),
                'curp'                 => fn($t) => $t->string('curp', 20)->nullable(),
                'nss'                  => fn($t) => $t->string('nss', 20)->nullable(),
                'rfc'                  => fn($t) => $t->string('rfc', 15)->nullable(),
                'fecha_nacimiento'     => fn($t) => $t->date('fecha_nacimiento')->nullable(),
                'lugar_nacimiento'     => fn($t) => $t->string('lugar_nacimiento', 100)->nullable(),
                'estado_civil'         => fn($t) => $t->string('estado_civil', 30)->nullable(),
                'domicilio'            => fn($t) => $t->string('domicilio', 255)->nullable(),
                'colonia'              => fn($t) => $t->string('colonia', 100)->nullable(),
                'cp'                   => fn($t) => $t->string('cp', 10)->nullable(),
                'municipio'            => fn($t) => $t->string('municipio', 100)->nullable(),
                'telefono'             => fn($t) => $t->string('telefono', 20)->nullable(),
                'contacto_emergencia'  => fn($t) => $t->string('contacto_emergencia', 200)->nullable(),
                'escolaridad'          => fn($t) => $t->string('escolaridad', 100)->nullable(),
                'enfermedades'         => fn($t) => $t->text('enfermedades')->nullable(),
                'alergias'             => fn($t) => $t->text('alergias')->nullable(),
                'tipo_sangre'          => fn($t) => $t->text('tipo_sangre')->nullable(),
                'fecha_ingreso'        => fn($t) => $t->date('fecha_ingreso')->nullable(),
                'fecha_baja'           => fn($t) => $t->date('fecha_baja')->nullable(),
                'motivo_baja'          => fn($t) => $t->string('motivo_baja', 255)->nullable(),
                'numero_convenio'      => fn($t) => $t->string('numero_convenio', 50)->nullable(),
                'jornada'              => fn($t) => $t->string('jornada', 50)->nullable(),
                'turno'                => fn($t) => $t->string('turno', 50)->nullable(),
                'puesto'               => fn($t) => $t->string('puesto', 100)->nullable(),
                'categoria'            => fn($t) => $t->string('categoria', 100)->nullable(),
                'numero_empleado'      => fn($t) => $t->string('numero_empleado', 50)->nullable(),
                'licencia_tipo'        => fn($t) => $t->string('licencia_tipo', 20)->nullable(),
                'licencia_vencimiento' => fn($t) => $t->date('licencia_vencimiento')->nullable(),
                'observaciones'        => fn($t) => $t->text('observaciones')->nullable(),
                'dias_vacaciones'      => fn($t) => $t->integer('dias_vacaciones')->nullable()->default(0),
                'dias_permiso'         => fn($t) => $t->integer('dias_permiso')->nullable()->default(0),
                'detalle_permisos'     => fn($t) => $t->text('detalle_permisos')->nullable(),
                'detalle_permutas'     => fn($t) => $t->text('detalle_permutas')->nullable(),
                'num_accidentes'       => fn($t) => $t->integer('num_accidentes')->nullable()->default(0),
                'detalle_accidentes'   => fn($t) => $t->text('detalle_accidentes')->nullable(),
                'faltas'               => fn($t) => $t->integer('faltas')->nullable()->default(0),
                
                // Parciales else block
                'ultima_capacitacion'  => fn($t) => $t->date('ultima_capacitacion')->nullable(),
                'proxima_capacitacion' => fn($t) => $t->date('proxima_capacitacion')->nullable(),
                'accidentes_siniestros'=> fn($t) => $t->integer('accidentes_siniestros')->nullable()->default(0),
                'retardos'             => fn($t) => $t->integer('retardos')->nullable()->default(0),
                'amonestaciones'       => fn($t) => $t->integer('amonestaciones')->nullable()->default(0),
                'reconocimientos'      => fn($t) => $t->integer('reconocimientos')->nullable()->default(0),
                'condicionamientos_juridicos'=> fn($t) => $t->string('condicionamientos_juridicos', 255)->nullable(),
                'permutas'             => fn($t) => $t->integer('permutas')->nullable()->default(0),
                'permisos'             => fn($t) => $t->integer('permisos')->nullable()->default(0),
                'evaluacion'           => fn($t) => $t->string('evaluacion', 100)->nullable(),
                'vigencia_licencia'    => fn($t) => $t->date('vigencia_licencia')->nullable(),
                'sexo'                 => fn($t) => $t->string('sexo', 20)->nullable(),
                'referencia_1'         => fn($t) => $t->string('referencia_1', 255)->nullable(),
                'referencia_2'         => fn($t) => $t->string('referencia_2', 255)->nullable(),
                'condicionamientos_medicos'=> fn($t) => $t->string('condicionamientos_medicos', 255)->nullable(),
                'foto'                 => fn($t) => $t->string('foto', 255)->nullable(),
                
                'amonestaciones_detalle'=> fn($t) => $t->json('amonestaciones_detalle')->nullable(),
                'reconocimientos_detalle'=> fn($t) => $t->json('reconocimientos_detalle')->nullable(),
                'permisos_detalle'     => fn($t) => $t->json('permisos_detalle')->nullable(),
                'permutas_detalle'     => fn($t) => $t->json('permutas_detalle')->nullable(),
                'accidentes_siniestros_detalle'=> fn($t) => $t->json('accidentes_siniestros_detalle')->nullable(),
            ] as $col => $def) {
                if (!Schema::hasColumn('conductores', $col)) {
                    Schema::table('conductores', $def);
                }
            }
        }

        // ─── Maniobristas ─────────────────────────────────────────────
        if (!Schema::hasTable('maniobristas')) {
            Schema::create('maniobristas', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 200);
                $table->string('tarjeton', 50)->unique();
                $table->string('tipo_tarjeton', 50)->nullable();
                $table->string('estado_servicio', 30)->nullable()->default('activo');
                $table->string('estatus', 30)->nullable();
                $table->timestamps();
            });
        } else {
            foreach ([
                'tipo_tarjeton'   => fn($t) => $t->string('tipo_tarjeton', 50)->nullable(),
                'estatus'         => fn($t) => $t->string('estatus', 30)->nullable(),
            ] as $col => $def) {
                if (!Schema::hasColumn('maniobristas', $col)) {
                    Schema::table('maniobristas', $def);
                }
            }
        }

        // ─── Información Operativa ────────────────────────────────────
        if (!Schema::hasTable('informacion_operativa')) {
            Schema::create('informacion_operativa', function (Blueprint $table) {
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
        } else {
            foreach ([
                'tipo'                 => fn($t) => $t->string('tipo', 50)->nullable(),
                'estatus'              => fn($t) => $t->string('estatus', 20)->nullable(),
                'falla'                => fn($t) => $t->string('falla', 50)->nullable(),
                'corridas'             => fn($t) => $t->integer('corridas')->nullable(),
                'ciclo'                => fn($t) => $t->string('ciclo', 10)->nullable(),
                'motivo'               => fn($t) => $t->string('motivo', 50)->nullable(),
                'hora_programada'      => fn($t) => $t->string('hora_programada', 20)->nullable(),
                'hora_salida'          => fn($t) => $t->string('hora_salida', 20)->nullable(),
                'acople'               => fn($t) => $t->string('acople', 50)->nullable(),
                'cambio_desde'         => fn($t) => $t->string('cambio_desde', 50)->nullable(),
                'cambio_motivo'        => fn($t) => $t->string('cambio_motivo', 200)->nullable(),
                'motivo_estatus'       => fn($t) => $t->string('motivo_estatus', 200)->nullable(),
                'observaciones'        => fn($t) => $t->text('observaciones')->nullable(),
                'tarjeton_maniobrista' => fn($t) => $t->string('tarjeton_maniobrista', 50)->nullable()->default(''),
                'nombre_maniobrista'   => fn($t) => $t->string('nombre_maniobrista', 200)->nullable()->default(''),
            ] as $col => $def) {
                if (!Schema::hasColumn('informacion_operativa', $col)) {
                    Schema::table('informacion_operativa', $def);
                }
            }
        }

        // ─── Bitacoras (Diarias) ──────────────────────────────────────
        if (!Schema::hasTable('bitacoras')) {
            Schema::create('bitacoras', function (Blueprint $table) {
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
        }

        // ─── Historial Operativo ──────────────────────────────────────
        if (!Schema::hasTable('historial_operativo')) {
            Schema::create('historial_operativo', function (Blueprint $table) {
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
                $table->string('tarjeton_maniobrista', 50)->nullable();
                $table->string('nombre_maniobrista', 200)->nullable();
                $table->string('momento', 20)->nullable();
                $table->date('fecha_historial')->nullable();
                $table->timestamp('fecha_registro')->nullable()->useCurrent();
                $table->timestamps();
            });
        } else {
            foreach ([
                'momento'              => fn($t) => $t->string('momento', 20)->nullable(),
                'tarjeton_maniobrista' => fn($t) => $t->string('tarjeton_maniobrista', 50)->nullable(),
                'nombre_maniobrista'   => fn($t) => $t->string('nombre_maniobrista', 200)->nullable(),
                'fecha_historial'      => fn($t) => $t->date('fecha_historial')->nullable(),
            ] as $col => $def) {
                if (!Schema::hasColumn('historial_operativo', $col)) {
                    Schema::table('historial_operativo', $def);
                }
            }
        }

        // ─── Checklists ───────────────────────────────────────────────
        if (!Schema::hasTable('checklists')) {
            Schema::create('checklists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
                $table->json('puntos')->nullable();
                $table->timestamp('fecha_hora')->nullable();
                $table->string('origen', 50)->nullable();
                $table->text('dibujo')->nullable();
                $table->string('tipo_unidad', 50)->nullable();
                $table->string('conductor_id', 50)->nullable();
                $table->string('economico', 50)->nullable();
                $table->string('servicio', 50)->nullable();
                $table->timestamps();
            });
        } else {
            foreach ([
                'usuario_id'   => fn($t) => $t->foreignId('usuario_id')->nullable()->constrained('usuarios'),
                'puntos'       => fn($t) => $t->json('puntos')->nullable(),
                'fecha_hora'   => fn($t) => $t->timestamp('fecha_hora')->nullable(),
                'origen'       => fn($t) => $t->string('origen', 50)->nullable(),
                'dibujo'       => fn($t) => $t->text('dibujo')->nullable(),
                'tipo_unidad'  => fn($t) => $t->string('tipo_unidad', 50)->nullable(),
                'conductor_id' => fn($t) => $t->string('conductor_id', 50)->nullable(),
                'economico'    => fn($t) => $t->string('economico', 50)->nullable(),
                'servicio'     => fn($t) => $t->string('servicio', 50)->nullable(),
            ] as $col => $def) {
                if (!Schema::hasColumn('checklists', $col)) {
                    Schema::table('checklists', $def);
                }
            }
        }

        // ─── Plataforma Movimientos ───────────────────────────────────
        if (!Schema::hasTable('plataforma_movimientos')) {
            Schema::create('plataforma_movimientos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
                $table->string('tipo_movimiento', 100);
                $table->string('estatus_anterior', 100)->nullable();
                $table->string('estatus_nuevo', 100)->nullable();
                $table->string('conductor_asignado', 100)->nullable();
                $table->string('ruta_asignada', 100)->nullable();
                $table->text('motivo')->nullable();
                $table->timestamps();
            });
        }

        // ─── Reportes TITAN ───────────────────────────────────────────
        if (!Schema::hasTable('reportes_titan')) {
            Schema::create('reportes_titan', function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->nullable()->constrained('unidades');
                $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
                
                $table->string('intervalo', 100)->nullable();
                $table->text('observaciones')->nullable();
                $table->string('tipo_evento', 100);
                $table->string('corrida', 100)->nullable();
                $table->string('hora_evento', 100)->nullable();
                $table->string('ubicacion_gps', 255)->nullable();
                $table->string('ubicacion_evento', 255)->nullable();
                $table->text('motivo_desincorporacion')->nullable();
                
                $table->string('accidente_dueno', 150)->nullable();
                $table->string('accidente_vehiculo', 150)->nullable();
                $table->string('accidente_placas', 100)->nullable();
                $table->boolean('accidente_seguro')->nullable()->default(false);
                $table->text('accidente_hechos')->nullable();
                $table->string('firma_particular_url', 500)->nullable();
                
                $table->string('accidente_edad', 20)->nullable();
                $table->string('accidente_genero', 20)->nullable();
                $table->string('accidente_hecho_tipo', 100)->nullable();
                $table->string('accidente_favor_de_quien', 150)->nullable();
                $table->string('accidente_cantidades_dinero', 100)->nullable();
                $table->string('accidente_hubo_fallecidos', 50)->nullable();
                $table->integer('accidente_fallecidos_cantidad')->nullable()->default(0);
                $table->text('accidente_fallecidos_nombres')->nullable();
                $table->string('accidente_hora_fallecimiento', 50)->nullable();
                $table->string('accidente_hora_asistencia_cemefo', 50)->nullable();
                
                $table->integer('lesionados_cantidad')->nullable()->default(0);
                $table->text('nombres_afectados')->nullable();
                $table->text('asistencia_sitio')->nullable();
                $table->text('diagnostico_preliminar')->nullable();
                $table->boolean('amerita_traslado')->nullable()->default(false);
                $table->string('estatus_legal', 100)->nullable();
                $table->boolean('usuario_anonimo')->nullable()->default(false);
                $table->string('estacion_hecho', 150)->nullable();
                $table->string('ruta_hecho', 150)->nullable();
                $table->string('autoridad_interviniente', 150)->nullable();
                $table->boolean('puesto_disposicion')->nullable()->default(false);
                $table->text('motivo_no_disposicion')->nullable();
                $table->boolean('visto')->default(false);

                $table->timestamps();
            });
        }

        // ─── Reportes TITAN Fotos ─────────────────────────────────────
        if (!Schema::hasTable('reportes_titan_fotos')) {
            Schema::create('reportes_titan_fotos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reporte_titan_id')->constrained('reportes_titan')->onDelete('cascade');
                $table->string('ruta_foto', 255);
                $table->timestamps();
            });
        }

        // ─── Historial Mantenimiento ──────────────────────────────────
        if (!Schema::hasTable('historial_mantenimiento')) {
            Schema::create('historial_mantenimiento', function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->string('tipo_mantenimiento', 100)->nullable();
                $table->text('descripcion')->nullable();
                $table->string('responsable', 200)->nullable();
                $table->decimal('costo', 10, 2)->nullable();
                $table->string('numero_cincho', 20)->nullable();
                $table->string('numero_cincho_adblue', 20)->nullable();
                $table->string('odometro', 20)->nullable();
                $table->string('tipo_vehiculo', 50)->nullable();
                $table->string('nivel_combustible', 20)->nullable();
                $table->string('nivel_adblue', 20)->nullable();
                $table->date('fecha_ultima_carga')->nullable();
                $table->string('kilometraje', 20)->nullable();
                $table->timestamp('fecha_mantenimiento')->nullable()->useCurrent();
                $table->timestamp('fecha_registro')->nullable()->useCurrent();
                $table->timestamps();
            });
        } else {
            foreach ([
                'numero_cincho'        => fn($t) => $t->string('numero_cincho', 20)->nullable(),
                'numero_cincho_adblue' => fn($t) => $t->string('numero_cincho_adblue', 20)->nullable(),
                'odometro'             => fn($t) => $t->string('odometro', 20)->nullable(),
                'tipo_vehiculo'        => fn($t) => $t->string('tipo_vehiculo', 50)->nullable(),
                'nivel_combustible'    => fn($t) => $t->string('nivel_combustible', 20)->nullable(),
                'nivel_adblue'         => fn($t) => $t->string('nivel_adblue', 20)->nullable(),
                'fecha_ultima_carga'   => fn($t) => $t->date('fecha_ultima_carga')->nullable(),
                'kilometraje'          => fn($t) => $t->string('kilometraje', 20)->nullable(),
                'fecha_registro'       => fn($t) => $t->timestamp('fecha_registro')->nullable()->useCurrent(),
            ] as $col => $def) {
                if (!Schema::hasColumn('historial_mantenimiento', $col)) {
                    Schema::table('historial_mantenimiento', $def);
                }
            }
        }

        // ─── Amonestaciones ───────────────────────────────────────────
        if (!Schema::hasTable('amonestaciones')) {
            Schema::create('amonestaciones', function (Blueprint $table) {
                $table->id();
                $table->string('folio', 50)->unique();
                $table->dateTime('fecha');
                $table->string('lugar', 255);
                $table->string('placas', 20)->nullable();
                $table->string('entidad_federativa', 100)->nullable();
                $table->string('marca', 100)->nullable();
                $table->string('modelo', 100)->nullable();
                $table->string('color', 50)->nullable();
                $table->string('conductor_nombre', 150);
                $table->string('conductor_identificacion', 100)->nullable();
                $table->boolean('conductor_nego_firmar')->default(false);
                $table->unsignedBigInteger('inspector_id')->nullable();
                
                // Campos adicionales requeridos por el modelo y Neon DB
                $table->string('inspector_nombre', 150)->nullable();
                $table->string('inspector_gafete', 100)->nullable();
                $table->string('adscripcion', 255)->nullable();
                $table->text('firma_inspector')->nullable();
                $table->string('recibio_nombre', 150)->nullable();
                $table->text('firma_conductor')->nullable();

                $table->timestamps();
            });
        }

        // ─── Infracciones ─────────────────────────────────────────────
        if (!Schema::hasTable('infracciones')) {
            Schema::create('infracciones', function (Blueprint $table) {
                $table->id();
                $table->string('folio', 50)->unique();
                $table->dateTime('fecha_expedicion');
                $table->string('hora_intervencion', 20);
                $table->string('municipio', 100)->default('Pachuca de Soto');
                $table->string('ubicacion_exacta', 255);

                $table->string('imagen_1', 255)->nullable();
                $table->string('imagen_2', 255)->nullable();
                $table->string('imagen_3', 255)->nullable();
                $table->string('imagen_4', 255)->nullable();
                $table->string('imagen_5', 255)->nullable();

                $table->string('placas', 20)->index();
                $table->string('entidad_federativa', 100);
                $table->string('marca', 100);
                $table->string('submarca', 100)->nullable();
                $table->string('modelo', 100);
                $table->string('color', 50);
                $table->string('niv_vin', 100)->nullable();
                $table->string('tipo_vehiculo', 50)->default('Particular');

                $table->string('conductor_nombre', 150);
                $table->text('conductor_domicilio')->nullable();
                $table->string('licencia_numero', 100)->nullable();
                $table->string('licencia_tipo', 50)->nullable();
                $table->string('licencia_estado', 100)->nullable();
                $table->string('calidad_conductor', 50)->default('Conductora');
                $table->string('correo_infractor', 255)->nullable();

                $table->string('motivacion_hecho', 100)->default('transitaba');
                $table->text('descripcion_hechos')->nullable();

                $table->decimal('sancion_uma', 10, 2)->default(0);
                $table->string('garantia_tipo', 100)->default('Detención del Vehículo');
                $table->text('garantia_observaciones')->nullable();

                $table->unsignedBigInteger('inspector_id')->nullable();
                $table->string('inspector_nombre', 150);
                $table->string('inspector_gafete', 100);
                $table->string('adscripcion', 255)->default('Dirección Jurídica del SITMAH');
                $table->longText('firma_inspector')->nullable();

                $table->boolean('conductor_nego_firmar')->default(false);
                $table->string('recibio_nombre', 150)->nullable();
                $table->longText('firma_conductor')->nullable();
                
                $table->foreignId('amonestacion_id')->nullable()->constrained('amonestaciones');
                $table->timestamps();
            });
        }

        // ─── Bitácora de Cambios de Unidades ──────────────────────────
        if (!Schema::hasTable('bitacora_cambios_unidades')) {
            Schema::create('bitacora_cambios_unidades', function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
                $table->string('tipo_accion', 100)->nullable();
                $table->string('estatus_anterior', 100)->nullable();
                $table->string('estatus_nuevo', 100)->nullable();
                $table->text('detalles')->nullable();
                $table->date('fecha')->nullable();
                $table->timestamps();
            });
        } else {
            foreach ([
                'tipo_accion'      => fn($t) => $t->string('tipo_accion', 100)->nullable(),
                'estatus_anterior' => fn($t) => $t->string('estatus_anterior', 100)->nullable(),
                'estatus_nuevo'    => fn($t) => $t->string('estatus_nuevo', 100)->nullable(),
                'detalles'         => fn($t) => $t->text('detalles')->nullable(),
                'fecha'            => fn($t) => $t->date('fecha')->nullable(),
            ] as $col => $def) {
                if (!Schema::hasColumn('bitacora_cambios_unidades', $col)) {
                    Schema::table('bitacora_cambios_unidades', $def);
                }
            }
        }

        // ─── Catálogo de Observaciones ────────────────────────────────
        if (!Schema::hasTable('observacion_catalogos')) {
            Schema::create('observacion_catalogos', function (Blueprint $table) {
                $table->id();
                $table->integer('clave')->unique();
                $table->string('descripcion', 500);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('observacion_catalogos');
        Schema::dropIfExists('bitacora_cambios_unidades');
        Schema::dropIfExists('infracciones');
        Schema::dropIfExists('amonestaciones');
        Schema::dropIfExists('reportes_titan_fotos');
        Schema::dropIfExists('reportes_titan');
        Schema::dropIfExists('historial_mantenimiento');
        Schema::dropIfExists('plataforma_movimientos');
        Schema::dropIfExists('checklists');
        Schema::dropIfExists('historial_operativo');
        Schema::dropIfExists('bitacoras');
        Schema::dropIfExists('informacion_operativa');
        Schema::dropIfExists('maniobristas');
        Schema::dropIfExists('conductores');
        Schema::dropIfExists('secciones_unidad');
        Schema::dropIfExists('rutas');
        Schema::dropIfExists('unidades');
        Schema::dropIfExists('transportes');
        Schema::dropIfExists('usuarios');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('personal_access_tokens');
    }
};
