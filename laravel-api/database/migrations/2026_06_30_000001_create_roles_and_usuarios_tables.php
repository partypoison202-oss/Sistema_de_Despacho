<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table) {
                $table->id();
                $table->string('codigo')->unique();
                $table->string('nombre');
                $table->text('descripcion')->nullable();
            });
        }

        if (!Schema::hasTable('usuarios')) {
            Schema::create('usuarios', function (Blueprint $table) {
                $table->id();
                $table->string('nombre_completo');
                $table->string('usuario')->unique();
                $table->string('correo')->nullable();
                $table->string('contrasena');
                $table->boolean('activo')->default(true);
                $table->foreignId('rol_id')->nullable()->constrained('roles');
                $table->timestamp('fecha_creacion')->nullable();
                $table->timestamp('fecha_actualizacion')->nullable();
            });
        }

        // Insertar roles esenciales si la tabla está vacía
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
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
        Schema::dropIfExists('roles');
    }
};
