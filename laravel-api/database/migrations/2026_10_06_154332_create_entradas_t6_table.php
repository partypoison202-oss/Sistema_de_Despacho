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
        Schema::create('entradas_t6', function (Blueprint $table) {
            $table->id();
            $table->date('fecha');
            $table->foreignId('unidad_id')->constrained('unidades');
            $table->string('hora_entrada_t6', 20)->nullable();
            $table->timestamps();
            
            // Un índice único opcional para evitar duplicados del mismo día y unidad
            $table->unique(['fecha', 'unidad_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entradas_t6');
    }
};
