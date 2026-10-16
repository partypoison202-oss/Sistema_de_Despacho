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
        if (!Schema::hasTable('programacion_ciclos')) {
            Schema::create('programacion_ciclos', function (Blueprint $table) {
                $table->id();
                $table->date('fecha_operativa')->unique();
                $table->integer('ciclos');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('programacion_ciclos');
    }
};
