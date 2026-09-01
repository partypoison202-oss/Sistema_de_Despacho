<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $tables = [
            'informacion_operativa',
            'informacion_operativa_manana',
            'informacion_operativa_sabado',
            'informacion_operativa_domingo',
            'informacion_operativa_lunes',
            'informacion_operativa_festivo'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                if (!Schema::hasColumn($table, 'patio_norte')) {
                    Schema::table($table, function (Blueprint $tableBlueprint) {
                        $tableBlueprint->boolean('patio_norte')->default(false)->after('observaciones');
                    });
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        $tables = [
            'informacion_operativa',
            'informacion_operativa_manana',
            'informacion_operativa_sabado',
            'informacion_operativa_domingo',
            'informacion_operativa_lunes',
            'informacion_operativa_festivo'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                if (Schema::hasColumn($table, 'patio_norte')) {
                    Schema::table($table, function (Blueprint $tableBlueprint) {
                        $tableBlueprint->dropColumn('patio_norte');
                    });
                }
            }
        }
    }
};
