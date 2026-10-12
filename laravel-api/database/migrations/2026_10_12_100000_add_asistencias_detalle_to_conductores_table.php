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
        if (Schema::hasTable('conductores') && !Schema::hasColumn('conductores', 'asistencias_detalle')) {
            Schema::table('conductores', function (Blueprint $table) {
                $table->json('asistencias_detalle')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('conductores') && Schema::hasColumn('conductores', 'asistencias_detalle')) {
            Schema::table('conductores', function (Blueprint $table) {
                $table->dropColumn(['asistencias_detalle']);
            });
        }
    }
};
