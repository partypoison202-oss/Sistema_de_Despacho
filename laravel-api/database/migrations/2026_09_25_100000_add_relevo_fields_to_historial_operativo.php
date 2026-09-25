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
        if (Schema::hasTable('historial_operativo')) {
            Schema::table('historial_operativo', function (Blueprint $table) {
                if (!Schema::hasColumn('historial_operativo', 'relevo_tarjeton')) {
                    $table->string('relevo_tarjeton', 255)->nullable();
                }
                if (!Schema::hasColumn('historial_operativo', 'relevo_conductor')) {
                    $table->string('relevo_conductor', 255)->nullable();
                }
                if (!Schema::hasColumn('historial_operativo', 'relevo_hora')) {
                    $table->string('relevo_hora', 255)->nullable();
                }
                if (!Schema::hasColumn('historial_operativo', 'acople')) {
                    $table->string('acople', 50)->nullable();
                }
                if (!Schema::hasColumn('historial_operativo', 'hora_salida_patio')) {
                    $table->string('hora_salida_patio', 50)->nullable();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (Schema::hasTable('historial_operativo')) {
            Schema::table('historial_operativo', function (Blueprint $table) {
                if (Schema::hasColumn('historial_operativo', 'relevo_tarjeton')) {
                    $table->dropColumn(['relevo_tarjeton', 'relevo_conductor', 'relevo_hora']);
                }
            });
        }
    }
};
