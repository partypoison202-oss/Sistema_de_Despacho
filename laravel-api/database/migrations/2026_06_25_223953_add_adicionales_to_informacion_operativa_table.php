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
        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->string('falla', 50)->nullable();
            $table->integer('corridas')->nullable();
            $table->string('ciclo', 10)->nullable();
            $table->string('motivo', 50)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->dropColumn(['falla', 'corridas', 'ciclo', 'motivo']);
        });
    }
};
