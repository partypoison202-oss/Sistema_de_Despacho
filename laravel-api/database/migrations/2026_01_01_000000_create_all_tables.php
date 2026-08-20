<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * MIGRACIÓN MAESTRA — Estado final consolidado de todas las tablas.
 *
 * Esta migración reemplaza las ~60 migraciones incrementales anteriores.
 * Cada bloque verifica si la tabla/columna ya existe antes de crearla
 * o modificarla, por lo que es completamente IDEMPOTENTE y segura
 * de correr en cualquier entorno (nuevo o existente).
 */
return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        // ─────────────────────────────────────────────────────────────
        // TABLAS DE INFRAESTRUCTURA (Laravel defaults)
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->rememberToken();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (!Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }

        if (!Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration');
            });
        }

        if (!Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration');
            });
        }

        if (!Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table) {
                $table->id();
                $table->string('queue')->index();
                $table->longText('payload');
                $table->unsignedTinyInteger('attempts');
                $table->unsignedInteger('reserved_at')->nullable();
                $table->unsignedInteger('available_at');
                $table->unsignedInteger('created_at');
            });
        }

        if (!Schema::hasTable('job_batches')) {
            Schema::create('job_batches', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('name');
                $table->integer('total_jobs');
                $table->integer('pending_jobs');
                $table->integer('failed_jobs');
                $table->longText('failed_job_ids');
                $table->mediumText('options')->nullable();
                $table->integer('cancelled_at')->nullable();
                $table->integer('created_at');
                $table->integer('finished_at')->nullable();
            });
        }

        if (!Schema::hasTable('failed_jobs')) {
            Schema::create('failed_jobs', function (Blueprint $table) {
                $table->id();
                $table->string('uuid')->unique();
                $table->text('connection');
                $table->text('queue');
                $table->longText('payload');
                $table->longText('exception');
                $table->timestamp('failed_at')->useCurrent();
            });
        }

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

        // ─────────────────────────────────────────────────────────────
        // ROLES Y USUARIOS
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table) {
                $table->id();
                $table->string('codigo', 30)->unique();
                $table->string('nombre', 100);
                $table->text('descripcion')->nullable();
            });
        }

        // Roles iniciales (solo si la tabla está vacía)
        if (DB::table('roles')->count() === 0) {
            DB::table('roles')->insert([
                ['codigo' => 'ADMINISTRADOR',      'nombre' => 'Administrador',        'descripcion' => 'Administrador general del sistema.'],
                ['codigo' => 'PROGRAMACION',        'nombre' => 'Programación',          'descripcion' => 'Gestión de la programación diaria.'],
                ['codigo' => 'CENTRO_CONTROL',      'nombre' => 'Centro de Control',     'descripcion' => 'Monitoreo y control del Centro de Control.'],
                ['codigo' => 'DESPACHO',            'nombre' => 'Despacho',              'descripcion' => 'Despacho de unidades.'],
                ['codigo' => 'ENCIERRO',            'nombre' => 'Encierro',              'descripcion' => 'Gestión de entrada y salida de unidades en encierros.'],
                ['codigo' => 'GENERAL',             'nombre' => 'General',               'descripcion' => 'Rol operativo general.'],
                ['codigo' => 'TITAN',               'nombre' => 'TITAN',                 'descripcion' => 'Rol operativo TITAN.'],
                ['codigo' => 'PLATAFORMA',          'nombre' => 'PLATAFORMA',            'descripcion' => 'Movimientos de plataforma.'],
                ['codigo' => 'INFRACCION',          'nombre' => 'INFRACCION',            'descripcion' => 'Gestión de infracciones.'],
                ['codigo' => 'GESTOR_OPERADORES',   'nombre' => 'Gestor de Operadores',  'descripcion' => 'Gestión del catálogo de operadores.'],
                ['codigo' => 'CARGA_DE_COMBUSTIBLE','nombre' => 'Carga de Combustible',  'descripcion' => 'Control de carga de combustible.'],
            ]);
        }

        if (!Schema::hasTable('usuarios')) {
            Schema::create('usuarios', function (Blueprint $table) {
                $table->id();
                $table->string('nombre_completo', 150);
                $table->string('usuario', 50)->unique();
                $table->string('correo', 150)->nullable()->unique();
                $table->string('contrasena', 255);
                $table->boolean('activo')->default(true);
                $table->foreignId('rol_id')->nullable()->constrained('roles');
                $table->timestamp('fecha_creacion')->nullable();
                $table->timestamp('fecha_actualizacion')->nullable();
                $table->longText('foto_url')->nullable();
            });
        } else {
            if (!Schema::hasColumn('usuarios', 'foto_url')) {
                Schema::table('usuarios', function (Blueprint $table) {
                    $table->longText('foto_url')->nullable();
                });
            }
        }

        // ─────────────────────────────────────────────────────────────
        // TRANSPORTES Y UNIDADES
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('transportes')) {
            Schema::create('transportes', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 50)->unique();
            });
        }

        if (!Schema::hasTable('unidades')) {
            Schema::create('unidades', function (Blueprint $table) {
                $table->id();
                $table->foreignId('transporte_id')->constrained('transportes');
                $table->string('numero_eco', 20)->unique();
                $table->string('nivel_combustible', 10)->nullable();
                $table->string('nivel_adblue', 10)->nullable();
                $table->string('numero_cincho', 20)->nullable();
                $table->string('numero_cincho_adblue', 20)->nullable();
                $table->date('fecha_ultima_carga')->nullable();
                $table->string('kilometraje', 20)->nullable();
                $table->string('odometro', 20)->nullable();
            });
        } else {
            // Asegurar columnas agregadas en migraciones posteriores
            $cols = [
                'nivel_combustible'   => fn($t) => $t->string('nivel_combustible', 10)->nullable(),
                'nivel_adblue'        => fn($t) => $t->string('nivel_adblue', 10)->nullable(),
                'numero_cincho'       => fn($t) => $t->string('numero_cincho', 20)->nullable(),
                'numero_cincho_adblue'=> fn($t) => $t->string('numero_cincho_adblue', 20)->nullable(),
                'fecha_ultima_carga'  => fn($t) => $t->date('fecha_ultima_carga')->nullable(),
                'kilometraje'         => fn($t) => $t->string('kilometraje', 20)->nullable(),
                'odometro'            => fn($t) => $t->string('odometro', 20)->nullable(),
            ];
            foreach ($cols as $col => $definition) {
                if (!Schema::hasColumn('unidades', $col)) {
                    Schema::table('unidades', $definition);
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // RUTAS
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('rutas')) {
            Schema::create('rutas', function (Blueprint $table) {
                $table->id();
                $table->string('ruta', 20)->unique();
                $table->string('tipo', 20)->nullable();
            });
        }

        // ─────────────────────────────────────────────────────────────
        // INFORMACIÓN OPERATIVA
        // ─────────────────────────────────────────────────────────────

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
            $cols = [
                'tipo'                => fn($t) => $t->string('tipo', 50)->nullable(),
                'estatus'             => fn($t) => $t->string('estatus', 20)->nullable(),
                'falla'               => fn($t) => $t->string('falla', 50)->nullable(),
                'corridas'            => fn($t) => $t->integer('corridas')->nullable(),
                'ciclo'               => fn($t) => $t->string('ciclo', 10)->nullable(),
                'motivo'              => fn($t) => $t->string('motivo', 50)->nullable(),
                'hora_programada'     => fn($t) => $t->string('hora_programada', 20)->nullable(),
                'hora_salida'         => fn($t) => $t->string('hora_salida', 20)->nullable(),
                'acople'              => fn($t) => $t->string('acople', 50)->nullable(),
                'cambio_desde'        => fn($t) => $t->string('cambio_desde', 50)->nullable(),
                'cambio_motivo'       => fn($t) => $t->string('cambio_motivo', 200)->nullable(),
                'motivo_estatus'      => fn($t) => $t->string('motivo_estatus', 200)->nullable(),
                'observaciones'       => fn($t) => $t->text('observaciones')->nullable(),
                'tarjeton_maniobrista'=> fn($t) => $t->string('tarjeton_maniobrista', 50)->nullable()->default(''),
                'nombre_maniobrista'  => fn($t) => $t->string('nombre_maniobrista', 200)->nullable()->default(''),
            ];
            foreach ($cols as $col => $definition) {
                if (!Schema::hasColumn('informacion_operativa', $col)) {
                    Schema::table('informacion_operativa', $definition);
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // CONDUCTORES
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('conductores')) {
            Schema::create('conductores', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 200);
                $table->string('tarjeton', 50)->unique();
                $table->string('tipo_tarjeton', 20)->nullable();
                $table->string('estado_servicio', 30)->nullable()->default('activo');
                $table->string('estatus', 30)->nullable();
                // Información personal
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
                // Información laboral / kardex
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
                // Permisos y permutas
                $table->integer('dias_vacaciones')->nullable()->default(0);
                $table->integer('dias_permiso')->nullable()->default(0);
                $table->text('detalle_permisos')->nullable();
                $table->text('detalle_permutas')->nullable();
                // Accidentes / siniestros
                $table->integer('num_accidentes')->nullable()->default(0);
                $table->text('detalle_accidentes')->nullable();
                $table->timestamps();
            });
        } else {
            $cols = [
                'tipo_tarjeton'         => fn($t) => $t->string('tipo_tarjeton', 20)->nullable(),
                'estado_servicio'       => fn($t) => $t->string('estado_servicio', 30)->nullable()->default('activo'),
                'estatus'               => fn($t) => $t->string('estatus', 30)->nullable(),
                'curp'                  => fn($t) => $t->string('curp', 20)->nullable(),
                'nss'                   => fn($t) => $t->string('nss', 20)->nullable(),
                'rfc'                   => fn($t) => $t->string('rfc', 15)->nullable(),
                'fecha_nacimiento'      => fn($t) => $t->date('fecha_nacimiento')->nullable(),
                'lugar_nacimiento'      => fn($t) => $t->string('lugar_nacimiento', 100)->nullable(),
                'estado_civil'          => fn($t) => $t->string('estado_civil', 30)->nullable(),
                'domicilio'             => fn($t) => $t->string('domicilio', 255)->nullable(),
                'colonia'               => fn($t) => $t->string('colonia', 100)->nullable(),
                'cp'                    => fn($t) => $t->string('cp', 10)->nullable(),
                'municipio'             => fn($t) => $t->string('municipio', 100)->nullable(),
                'telefono'              => fn($t) => $t->string('telefono', 20)->nullable(),
                'contacto_emergencia'   => fn($t) => $t->string('contacto_emergencia', 200)->nullable(),
                'escolaridad'           => fn($t) => $t->string('escolaridad', 100)->nullable(),
                'enfermedades'          => fn($t) => $t->text('enfermedades')->nullable(),
                'alergias'              => fn($t) => $t->text('alergias')->nullable(),
                'tipo_sangre'           => fn($t) => $t->text('tipo_sangre')->nullable(),
                'fecha_ingreso'         => fn($t) => $t->date('fecha_ingreso')->nullable(),
                'fecha_baja'            => fn($t) => $t->date('fecha_baja')->nullable(),
                'motivo_baja'           => fn($t) => $t->string('motivo_baja', 255)->nullable(),
                'numero_convenio'       => fn($t) => $t->string('numero_convenio', 50)->nullable(),
                'jornada'               => fn($t) => $t->string('jornada', 50)->nullable(),
                'turno'                 => fn($t) => $t->string('turno', 50)->nullable(),
                'puesto'                => fn($t) => $t->string('puesto', 100)->nullable(),
                'categoria'             => fn($t) => $t->string('categoria', 100)->nullable(),
                'numero_empleado'       => fn($t) => $t->string('numero_empleado', 50)->nullable(),
                'licencia_tipo'         => fn($t) => $t->string('licencia_tipo', 20)->nullable(),
                'licencia_vencimiento'  => fn($t) => $t->date('licencia_vencimiento')->nullable(),
                'observaciones'         => fn($t) => $t->text('observaciones')->nullable(),
                'dias_vacaciones'       => fn($t) => $t->integer('dias_vacaciones')->nullable()->default(0),
                'dias_permiso'          => fn($t) => $t->integer('dias_permiso')->nullable()->default(0),
                'detalle_permisos'      => fn($t) => $t->text('detalle_permisos')->nullable(),
                'detalle_permutas'      => fn($t) => $t->text('detalle_permutas')->nullable(),
                'num_accidentes'        => fn($t) => $t->integer('num_accidentes')->nullable()->default(0),
                'detalle_accidentes'    => fn($t) => $t->text('detalle_accidentes')->nullable(),
            ];
            foreach ($cols as $col => $definition) {
                if (!Schema::hasColumn('conductores', $col)) {
                    Schema::table('conductores', $definition);
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // MANIOBRISTAS
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('maniobristas')) {
            Schema::create('maniobristas', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 200);
                $table->string('tarjeton', 50)->unique();
                $table->string('estado_servicio', 30)->nullable()->default('activo');
                $table->timestamps();
            });
        }

        // ─────────────────────────────────────────────────────────────
        // HISTORIAL OPERATIVO
        // ─────────────────────────────────────────────────────────────

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
                $table->string('momento', 20)->nullable(); // 'despacho' | 'encierro'
                $table->timestamp('fecha_registro')->nullable()->useCurrent();
            });
        } else {
            $cols = [
                'momento'             => fn($t) => $t->string('momento', 20)->nullable(),
                'tarjeton_maniobrista'=> fn($t) => $t->string('tarjeton_maniobrista', 50)->nullable(),
                'nombre_maniobrista'  => fn($t) => $t->string('nombre_maniobrista', 200)->nullable(),
            ];
            foreach ($cols as $col => $definition) {
                if (!Schema::hasColumn('historial_operativo', $col)) {
                    Schema::table('historial_operativo', $definition);
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // CHECKLISTS
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('checklists')) {
            Schema::create('checklists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->string('tipo_formulario', 20);
                $table->json('secciones')->nullable();
                $table->string('nombre_responsable', 200)->nullable();
                $table->string('origen', 30)->nullable();
                $table->timestamp('fecha_inspeccion')->nullable()->useCurrent();
            });
        } else {
            if (!Schema::hasColumn('checklists', 'origen')) {
                Schema::table('checklists', function (Blueprint $table) {
                    $table->string('origen', 30)->nullable();
                });
            }
        }

        // ─────────────────────────────────────────────────────────────
        // PLATAFORMA MOVIMIENTOS
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('plataforma_movimientos')) {
            Schema::create('plataforma_movimientos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->string('tipo_movimiento', 30);
                $table->string('responsable', 200)->nullable();
                $table->string('destino', 200)->nullable();
                $table->text('observaciones')->nullable();
                $table->timestamp('fecha_movimiento')->nullable()->useCurrent();
            });
        }

        // ─────────────────────────────────────────────────────────────
        // REPORTES TITAN
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('reportes_titan')) {
            Schema::create('reportes_titan', function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->nullable()->constrained('unidades');
                $table->string('numero_eco', 20)->nullable();
                $table->string('tipo_reporte', 50)->nullable();
                $table->string('ubicacion', 255)->nullable();
                $table->string('ubicacion_evento', 255)->nullable();
                $table->text('descripcion')->nullable();
                $table->string('responsable', 200)->nullable();
                $table->string('firma_particular_url', 500)->nullable();
                $table->boolean('visto')->default(false);
                // Accidente fields
                $table->string('accidente_tipo', 100)->nullable();
                $table->integer('edad_conductor')->nullable();
                $table->string('genero_conductor', 20)->nullable();
                $table->integer('num_heridos')->nullable();
                $table->integer('num_fallecidos')->nullable();
                $table->text('detalle_heridos')->nullable();
                $table->text('detalle_fallecidos')->nullable();
                $table->string('unidad_involucrada', 100)->nullable();
                $table->string('placas_involucradas', 100)->nullable();
                $table->string('nombre_tercero', 200)->nullable();
                $table->string('telefono_tercero', 20)->nullable();
                $table->string('aseguradora_tercero', 100)->nullable();
                $table->string('num_poliza_tercero', 100)->nullable();
                $table->string('agencia_mp', 200)->nullable();
                $table->string('num_carpeta_mp', 100)->nullable();
                $table->string('grua_empresa', 100)->nullable();
                $table->string('grua_num_unidad', 50)->nullable();
                $table->string('num_vialidad', 50)->nullable();
                $table->text('fotos_urls')->nullable();
                $table->text('firma_conductor_url')->nullable();
                $table->timestamp('fecha_reporte')->nullable()->useCurrent();
            });
        } else {
            $cols = [
                'visto'                  => fn($t) => $t->boolean('visto')->default(false),
                'ubicacion_evento'       => fn($t) => $t->string('ubicacion_evento', 255)->nullable(),
                'firma_particular_url'   => fn($t) => $t->string('firma_particular_url', 500)->nullable(),
                'accidente_tipo'         => fn($t) => $t->string('accidente_tipo', 100)->nullable(),
                'edad_conductor'         => fn($t) => $t->integer('edad_conductor')->nullable(),
                'genero_conductor'       => fn($t) => $t->string('genero_conductor', 20)->nullable(),
                'num_heridos'            => fn($t) => $t->integer('num_heridos')->nullable(),
                'num_fallecidos'         => fn($t) => $t->integer('num_fallecidos')->nullable(),
                'detalle_heridos'        => fn($t) => $t->text('detalle_heridos')->nullable(),
                'detalle_fallecidos'     => fn($t) => $t->text('detalle_fallecidos')->nullable(),
                'unidad_involucrada'     => fn($t) => $t->string('unidad_involucrada', 100)->nullable(),
                'placas_involucradas'    => fn($t) => $t->string('placas_involucradas', 100)->nullable(),
                'nombre_tercero'         => fn($t) => $t->string('nombre_tercero', 200)->nullable(),
                'telefono_tercero'       => fn($t) => $t->string('telefono_tercero', 20)->nullable(),
                'aseguradora_tercero'    => fn($t) => $t->string('aseguradora_tercero', 100)->nullable(),
                'num_poliza_tercero'     => fn($t) => $t->string('num_poliza_tercero', 100)->nullable(),
                'agencia_mp'             => fn($t) => $t->string('agencia_mp', 200)->nullable(),
                'num_carpeta_mp'         => fn($t) => $t->string('num_carpeta_mp', 100)->nullable(),
                'grua_empresa'           => fn($t) => $t->string('grua_empresa', 100)->nullable(),
                'grua_num_unidad'        => fn($t) => $t->string('grua_num_unidad', 50)->nullable(),
                'num_vialidad'           => fn($t) => $t->string('num_vialidad', 50)->nullable(),
                'fotos_urls'             => fn($t) => $t->text('fotos_urls')->nullable(),
                'firma_conductor_url'    => fn($t) => $t->text('firma_conductor_url')->nullable(),
            ];
            foreach ($cols as $col => $definition) {
                if (!Schema::hasColumn('reportes_titan', $col)) {
                    Schema::table('reportes_titan', $definition);
                }
            }
        }

        if (!Schema::hasTable('reportes_titan_fotos')) {
            Schema::create('reportes_titan_fotos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reporte_id')->constrained('reportes_titan')->onDelete('cascade');
                $table->text('foto_url');
                $table->timestamps();
            });
        }

        // ─────────────────────────────────────────────────────────────
        // HISTORIAL MANTENIMIENTO
        // ─────────────────────────────────────────────────────────────

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
                $table->timestamp('fecha_mantenimiento')->nullable()->useCurrent();
            });
        } else {
            $cols = [
                'numero_cincho'       => fn($t) => $t->string('numero_cincho', 20)->nullable(),
                'numero_cincho_adblue'=> fn($t) => $t->string('numero_cincho_adblue', 20)->nullable(),
                'odometro'            => fn($t) => $t->string('odometro', 20)->nullable(),
            ];
            foreach ($cols as $col => $definition) {
                if (!Schema::hasColumn('historial_mantenimiento', $col)) {
                    Schema::table('historial_mantenimiento', $definition);
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // AMONESTACIONES
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('amonestaciones')) {
            Schema::create('amonestaciones', function (Blueprint $table) {
                $table->id();
                $table->foreignId('conductor_id')->constrained('conductores');
                $table->string('tipo', 100)->nullable();
                $table->text('descripcion')->nullable();
                $table->string('aplicada_por', 200)->nullable();
                $table->timestamp('fecha_amonestacion')->nullable()->useCurrent();
            });
        }

        // ─────────────────────────────────────────────────────────────
        // INFRACCIONES
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('infracciones')) {
            Schema::create('infracciones', function (Blueprint $table) {
                $table->id();
                $table->foreignId('conductor_id')->nullable()->constrained('conductores');
                $table->foreignId('unidad_id')->nullable()->constrained('unidades');
                $table->string('numero_folio', 50)->nullable();
                $table->string('tipo_infraccion', 100)->nullable();
                $table->string('autoridad', 100)->nullable();
                $table->decimal('monto', 10, 2)->nullable();
                $table->string('estatus', 30)->nullable()->default('pendiente');
                $table->text('descripcion')->nullable();
                $table->string('lugar', 255)->nullable();
                $table->date('fecha_infraccion')->nullable();
                $table->date('fecha_pago')->nullable();
                $table->text('evidencia_urls')->nullable();
                $table->timestamp('created_at')->nullable()->useCurrent();
            });
        }

        // ─────────────────────────────────────────────────────────────
        // BITÁCORAS
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('bitacoras')) {
            Schema::create('bitacoras', function (Blueprint $table) {
                $table->id();
                $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
                $table->string('accion', 100)->nullable();
                $table->string('modulo', 100)->nullable();
                $table->text('descripcion')->nullable();
                $table->json('datos_anteriores')->nullable();
                $table->json('datos_nuevos')->nullable();
                $table->string('ip', 45)->nullable();
                $table->timestamp('created_at')->nullable()->useCurrent();
            });
        } else {
            $cols = [
                'modulo'           => fn($t) => $t->string('modulo', 100)->nullable(),
                'datos_anteriores' => fn($t) => $t->json('datos_anteriores')->nullable(),
                'datos_nuevos'     => fn($t) => $t->json('datos_nuevos')->nullable(),
                'ip'               => fn($t) => $t->string('ip', 45)->nullable(),
            ];
            foreach ($cols as $col => $definition) {
                if (!Schema::hasColumn('bitacoras', $col)) {
                    Schema::table('bitacoras', $definition);
                }
            }
        }

        if (!Schema::hasTable('bitacora_cambios_unidades')) {
            Schema::create('bitacora_cambios_unidades', function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
                $table->string('campo_modificado', 100)->nullable();
                $table->text('valor_anterior')->nullable();
                $table->text('valor_nuevo')->nullable();
                $table->timestamp('fecha_cambio')->nullable()->useCurrent();
            });
        }

        // ─────────────────────────────────────────────────────────────
        // CATÁLOGO DE OBSERVACIONES
        // ─────────────────────────────────────────────────────────────

        if (!Schema::hasTable('observacion_catalogos')) {
            Schema::create('observacion_catalogos', function (Blueprint $table) {
                $table->id();
                $table->string('tipo', 50)->nullable(); // 'despacho' | 'encierro'
                $table->string('texto', 500);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        // Eliminar en orden inverso por dependencias FK
        Schema::dropIfExists('observacion_catalogos');
        Schema::dropIfExists('bitacora_cambios_unidades');
        Schema::dropIfExists('bitacoras');
        Schema::dropIfExists('infracciones');
        Schema::dropIfExists('amonestaciones');
        Schema::dropIfExists('reportes_titan_fotos');
        Schema::dropIfExists('reportes_titan');
        Schema::dropIfExists('historial_mantenimiento');
        Schema::dropIfExists('historial_operativo');
        Schema::dropIfExists('checklists');
        Schema::dropIfExists('plataforma_movimientos');
        Schema::dropIfExists('informacion_operativa');
        Schema::dropIfExists('maniobristas');
        Schema::dropIfExists('conductores');
        Schema::dropIfExists('rutas');
        Schema::dropIfExists('unidades');
        Schema::dropIfExists('transportes');
        Schema::dropIfExists('usuarios');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
