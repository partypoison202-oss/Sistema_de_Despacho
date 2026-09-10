<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tablas operativas a las que se les agregarán las columnas de relevo.
     */
    protected $tables = [
        'informacion_operativa',
        'informacion_operativa_manana',
        'informacion_operativa_sabado',
        'informacion_operativa_domingo',
        'informacion_operativa_lunes',
        'informacion_operativa_festivo'
    ];

    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    if (!Schema::hasColumn($table->getTable(), 'relevo_tarjeton')) {
                        $table->string('relevo_tarjeton')->nullable()->after('tarjeton');
                    }
                    if (!Schema::hasColumn($table->getTable(), 'relevo_conductor')) {
                        $table->string('relevo_conductor')->nullable()->after('relevo_tarjeton');
                    }
                    if (!Schema::hasColumn($table->getTable(), 'relevo_hora')) {
                        $table->string('relevo_hora')->nullable()->after('relevo_conductor');
                    }
                });
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
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropColumn(['relevo_tarjeton', 'relevo_conductor', 'relevo_hora']);
                });
            }
        }
    }
};
