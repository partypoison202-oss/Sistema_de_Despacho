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
        if (!Schema::hasTable('bitacora_conductores')) {
            Schema::create('bitacora_conductores', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('conductor_id')->nullable();
                $table->string('tarjeton', 50)->nullable();
                $table->string('nombre_conductor', 255)->nullable();
                $table->unsignedBigInteger('usuario_id')->nullable();
                $table->string('usuario_nombre', 255)->nullable();
                $table->string('tipo_accion', 100);
                $table->text('detalles')->nullable();
                $table->date('fecha');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bitacora_conductores');
    }
};
