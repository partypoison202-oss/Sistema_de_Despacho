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
        $tables = [
            'informacion_operativa',
            'informacion_operativa_manana',
            'informacion_operativa_sabado',
            'informacion_operativa_domingo',
            'informacion_operativa_lunes',
            'informacion_operativa_festivo'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'hora_salida')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->renameColumn('hora_salida', 'hora_real_salida_patio');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
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
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'hora_real_salida_patio')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->renameColumn('hora_real_salida_patio', 'hora_salida');
                });
            }
        }
    }
};
