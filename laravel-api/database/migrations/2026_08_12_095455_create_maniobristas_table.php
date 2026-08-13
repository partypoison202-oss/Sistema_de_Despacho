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
        Schema::create('maniobristas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 200);
            $table->string('tarjeton', 50)->unique();
            $table->string('tipo_tarjeton', 50)->nullable();
            $table->string('estado_servicio', 50)->default('disponible'); // disponible, en_servicio, falta
            $table->string('estatus', 20)->default('ACTIVO'); // ACTIVO, BAJA
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maniobristas');
    }
};
