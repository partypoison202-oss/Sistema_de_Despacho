<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $tables = [
        'informacion_operativa',
        'historial_operativo',
        'informacion_operativa_manana',
        'informacion_operativa_sabado',
        'informacion_operativa_domingo',
        'informacion_operativa_lunes',
        'informacion_operativa_festivo',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'hora_programada')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->renameColumn('hora_programada', 'hora_salida_patio');
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'hora_salida_patio')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->renameColumn('hora_salida_patio', 'hora_programada');
                });
            }
        }
    }
};
