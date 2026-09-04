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
        if (!Schema::hasColumn('informacion_operativa', 'mantenimiento_conductor')) {
            Schema::table('informacion_operativa', function (Blueprint $table) {
                $table->string('mantenimiento_conductor')->nullable();
                $table->string('mantenimiento_tarjeton')->nullable();
                $table->string('mantenimiento_ruta')->nullable();
                $table->string('mantenimiento_corrida')->nullable();
                $table->string('mantenimiento_kilometraje')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('informacion_operativa', 'mantenimiento_conductor')) {
            Schema::table('informacion_operativa', function (Blueprint $table) {
                $table->dropColumn([
                    'mantenimiento_conductor',
                    'mantenimiento_tarjeton',
                    'mantenimiento_ruta',
                    'mantenimiento_corrida',
                    'mantenimiento_kilometraje'
                ]);
            });
        }
    }
};
