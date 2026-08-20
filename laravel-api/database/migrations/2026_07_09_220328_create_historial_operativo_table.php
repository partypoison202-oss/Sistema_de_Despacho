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
        if (!Schema::hasTable('historial_operativo')) {
            Schema::create('historial_operativo', function (Blueprint $table) {
            $table->id();
            $table->date('fecha_historial'); // Identificador del día del snapshot
            $table->foreignId('unidad_id')->constrained('unidades');
            $table->string('ruta')->nullable();
            $table->string('numero_tarjeton')->nullable();
            $table->string('nombre_conductor')->nullable();
            $table->string('tipo')->nullable();
            $table->string('estatus')->nullable();
            $table->string('falla', 50)->nullable();
            $table->integer('corridas')->nullable();
            $table->string('ciclo', 10)->nullable();
            $table->string('motivo', 50)->nullable();
            $table->string('hora_programada')->nullable();
            $table->string('motivo_estatus')->nullable();
            $table->timestamp('fecha_registro')->nullable(); // La fecha original del registro
            $table->timestamps();
        });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historial_operativo');
    }
};
