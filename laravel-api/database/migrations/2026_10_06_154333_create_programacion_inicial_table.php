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
        Schema::create('programacion_inicial', function (Blueprint $table) {
            $table->id();
            $table->date('fecha'); // The date of the programming
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
            $table->string('hora_salida_patio', 20)->nullable();
            $table->string('hora_real_salida_patio', 20)->nullable();
            $table->string('acople', 50)->nullable();
            $table->string('cambio_desde', 50)->nullable();
            $table->string('cambio_motivo', 200)->nullable();
            $table->string('motivo_estatus', 200)->nullable();
            $table->string('folio_mantenimiento', 50)->nullable();
            $table->date('fecha_folio_mantenimiento')->nullable();
            $table->text('observaciones')->nullable();
            
            // Relevo fields
            $table->unsignedBigInteger('relevo_conductor_id')->nullable();
            $table->string('hora_relevo', 20)->nullable();
            $table->string('lugar_relevo', 100)->nullable();
            
            // Patio norte fields
            $table->boolean('patio_norte')->default(false);
            $table->string('transporte_patio_norte', 100)->nullable();
            
            // Operador de patio
            $table->foreignId('maniobrista_id')->nullable()->constrained('maniobristas');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('programacion_inicial');
    }
};
