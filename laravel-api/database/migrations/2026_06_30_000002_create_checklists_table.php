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
        if (!Schema::hasTable('checklists')) {
            Schema::create('checklists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
                $table->string('tipo_unidad');
                $table->string('conductor_id')->nullable();
                $table->string('economico')->nullable();
                $table->string('servicio');
                $table->json('puntos');
                $table->longText('dibujo')->nullable();
                $table->dateTime('fecha_hora');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checklists');
    }
};
