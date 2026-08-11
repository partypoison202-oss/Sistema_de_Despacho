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
        Schema::table('reportes_titan', function (Blueprint $table) {
            if (!Schema::hasColumn('reportes_titan', 'accidente_hubo_fallecidos')) {
                $table->string('accidente_hubo_fallecidos')->nullable()->after('accidente_hechos');
            }
            if (!Schema::hasColumn('reportes_titan', 'accidente_fallecidos_cantidad')) {
                $table->integer('accidente_fallecidos_cantidad')->nullable()->after('accidente_hubo_fallecidos');
            }
            if (!Schema::hasColumn('reportes_titan', 'accidente_fallecidos_nombres')) {
                $table->text('accidente_fallecidos_nombres')->nullable()->after('accidente_fallecidos_cantidad');
            }
            if (!Schema::hasColumn('reportes_titan', 'accidente_hora_fallecimiento')) {
                $table->string('accidente_hora_fallecimiento')->nullable()->after('accidente_fallecidos_nombres');
            }
            if (!Schema::hasColumn('reportes_titan', 'accidente_hora_asistencia_cemefo')) {
                $table->string('accidente_hora_asistencia_cemefo')->nullable()->after('accidente_hora_fallecimiento');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reportes_titan', function (Blueprint $table) {
            if (Schema::hasColumn('reportes_titan', 'accidente_hora_asistencia_cemefo')) {
                $table->dropColumn('accidente_hora_asistencia_cemefo');
            }
            if (Schema::hasColumn('reportes_titan', 'accidente_hora_fallecimiento')) {
                $table->dropColumn('accidente_hora_fallecimiento');
            }
            if (Schema::hasColumn('reportes_titan', 'accidente_fallecidos_nombres')) {
                $table->dropColumn('accidente_fallecidos_nombres');
            }
            if (Schema::hasColumn('reportes_titan', 'accidente_fallecidos_cantidad')) {
                $table->dropColumn('accidente_fallecidos_cantidad');
            }
            if (Schema::hasColumn('reportes_titan', 'accidente_hubo_fallecidos')) {
                $table->dropColumn('accidente_hubo_fallecidos');
            }
        });
    }
};
