<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
        });

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

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
        Schema::dropIfExists('roles');
    }
};
