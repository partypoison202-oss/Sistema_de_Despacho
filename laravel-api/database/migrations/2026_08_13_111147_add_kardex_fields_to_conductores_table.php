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
            $table->date('ultima_capacitacion')->nullable();
            $table->date('proxima_capacitacion')->nullable();
            $table->integer('accidentes_siniestros')->default(0);
            $table->integer('faltas')->default(0);
            $table->integer('retardos')->default(0);
            $table->integer('amonestaciones')->default(0);
            $table->integer('reconocimientos')->default(0);
            $table->string('condicionamientos_juridicos')->nullable();
            $table->integer('permutas')->default(0);
            $table->integer('permisos')->default(0);
            $table->string('evaluacion')->nullable();
            $table->text('observaciones')->nullable();
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
