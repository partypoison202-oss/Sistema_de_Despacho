<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('plataforma_movimientos')) {
            Schema::create('plataforma_movimientos', function (Blueprint $table) {
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
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plataforma_movimientos');
    }
};
