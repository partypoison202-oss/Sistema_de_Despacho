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
        if (!Schema::hasTable('historial_mantenimiento')) {
            Schema::create('historial_mantenimiento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unidad_id')->constrained('unidades')->onDelete('cascade');
            $table->string('tipo_vehiculo')->nullable();
            $table->string('nivel_combustible')->nullable();
            $table->string('nivel_adblue')->nullable();
            $table->string('numero_cincho')->nullable();
            $table->string('fecha_ultima_carga')->nullable();
            $table->string('kilometraje')->nullable();
            $table->timestamp('fecha_registro')->nullable();
            $table->timestamps();
        });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historial_mantenimiento');
    }
};
