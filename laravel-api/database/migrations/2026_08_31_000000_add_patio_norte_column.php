<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        $tablas = [
            'informacion_operativa',
            'informacion_operativa_manana',
            'informacion_operativa_sabado',
            'informacion_operativa_domingo',
            'informacion_operativa_lunes',
            'informacion_operativa_festivo'
        ];

        foreach ($tablas as $tabla) {
            if (Schema::hasTable($tabla) && !Schema::hasColumn($tabla, 'patio_norte')) {
                Schema::table($tabla, function (Blueprint $table) {
                    $table->boolean('patio_norte')->default(false)->after('estatus');
                });
            }
        }
    }

    public function down()
    {
        $tablas = [
            'informacion_operativa',
            'informacion_operativa_manana',
            'informacion_operativa_sabado',
            'informacion_operativa_domingo',
            'informacion_operativa_lunes',
            'informacion_operativa_festivo'
        ];

        foreach ($tablas as $tabla) {
            if (Schema::hasTable($tabla) && Schema::hasColumn($tabla, 'patio_norte')) {
                Schema::table($tabla, function (Blueprint $table) {
                    $table->dropColumn('patio_norte');
                });
            }
        }
    }
};
