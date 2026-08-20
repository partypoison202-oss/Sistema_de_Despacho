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
        if (!Schema::hasTable('observacion_catalogos')) {
            Schema::create('observacion_catalogos', function (Blueprint $table) {
            $table->id();
            $table->integer('clave')->unique();
            $table->string('descripcion');
            $table->timestamps();
        });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('observacion_catalogos');
    }
};
