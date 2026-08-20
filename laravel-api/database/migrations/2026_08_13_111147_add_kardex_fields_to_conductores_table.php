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
        Schema::table('conductores', function (Blueprint $table) {
            if (!Schema::hasColumn($table->getTable(), 'ultima_capacitacion')) {
                $table->date('ultima_capacitacion')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'proxima_capacitacion')) {
                $table->date('proxima_capacitacion')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'accidentes_siniestros')) {
                $table->integer('accidentes_siniestros')->default(0);
            }
            if (!Schema::hasColumn($table->getTable(), 'faltas')) {
                $table->integer('faltas')->default(0);
            }
            if (!Schema::hasColumn($table->getTable(), 'retardos')) {
                $table->integer('retardos')->default(0);
            }
            if (!Schema::hasColumn($table->getTable(), 'amonestaciones')) {
                $table->integer('amonestaciones')->default(0);
            }
            if (!Schema::hasColumn($table->getTable(), 'reconocimientos')) {
                $table->integer('reconocimientos')->default(0);
            }
            if (!Schema::hasColumn($table->getTable(), 'condicionamientos_juridicos')) {
                $table->string('condicionamientos_juridicos')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'permutas')) {
                $table->integer('permutas')->default(0);
            }
            if (!Schema::hasColumn($table->getTable(), 'permisos')) {
                $table->integer('permisos')->default(0);
            }
            if (!Schema::hasColumn($table->getTable(), 'evaluacion')) {
                $table->string('evaluacion')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'observaciones')) {
                $table->text('observaciones')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conductores', function (Blueprint $table) {
            $table->dropColumn([
                'ultima_capacitacion',
                'proxima_capacitacion',
                'accidentes_siniestros',
                'faltas',
                'retardos',
                'amonestaciones',
                'reconocimientos',
                'condicionamientos_juridicos',
                'permutas',
                'permisos',
                'evaluacion',
                'observaciones'
            ]);
        });
    }
};
