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
            if (!Schema::hasColumn('reportes_titan', 'accidente_hecho_tipo')) {
                $table->string('accidente_hecho_tipo')->nullable()->after('accidente_seguro');
            }
            if (!Schema::hasColumn('reportes_titan', 'accidente_favor_de_quien')) {
                $table->string('accidente_favor_de_quien')->nullable()->after('accidente_hecho_tipo');
            }
            if (!Schema::hasColumn('reportes_titan', 'accidente_cantidades_dinero')) {
                $table->string('accidente_cantidades_dinero')->nullable()->after('accidente_favor_de_quien');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reportes_titan', function (Blueprint $table) {
            if (Schema::hasColumn('reportes_titan', 'accidente_cantidades_dinero')) {
                $table->dropColumn('accidente_cantidades_dinero');
            }
            if (Schema::hasColumn('reportes_titan', 'accidente_favor_de_quien')) {
                $table->dropColumn('accidente_favor_de_quien');
            }
            if (Schema::hasColumn('reportes_titan', 'accidente_hecho_tipo')) {
                $table->dropColumn('accidente_hecho_tipo');
            }
        });
    }
};
