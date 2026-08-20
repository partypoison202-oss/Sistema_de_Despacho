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
            if (!Schema::hasColumn($table->getTable(), 'falla')) {
                $table->string('falla', 50)->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'corridas')) {
                $table->integer('corridas')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'ciclo')) {
                $table->string('ciclo', 10)->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'motivo')) {
                $table->string('motivo', 50)->nullable();
            }
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
