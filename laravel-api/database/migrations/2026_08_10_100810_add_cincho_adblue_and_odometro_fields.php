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
        Schema::table('unidades', function (Blueprint $table) {
            if (!Schema::hasColumn($table->getTable(), 'numero_cincho_adblue')) {
                $table->string('numero_cincho_adblue')->nullable()->after('numero_cincho');
            }
            if (!Schema::hasColumn($table->getTable(), 'odometro')) {
                $table->string('odometro')->nullable()->after('kilometraje');
            }
        });

        Schema::table('historial_mantenimiento', function (Blueprint $table) {
            if (!Schema::hasColumn($table->getTable(), 'numero_cincho_adblue')) {
                $table->string('numero_cincho_adblue')->nullable()->after('numero_cincho');
            }
            if (!Schema::hasColumn($table->getTable(), 'odometro')) {
                $table->string('odometro')->nullable()->after('kilometraje');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('unidades', function (Blueprint $table) {
            $table->dropColumn(['numero_cincho_adblue', 'odometro']);
        });

        Schema::table('historial_mantenimiento', function (Blueprint $table) {
            $table->dropColumn(['numero_cincho_adblue', 'odometro']);
        });
    }
};
