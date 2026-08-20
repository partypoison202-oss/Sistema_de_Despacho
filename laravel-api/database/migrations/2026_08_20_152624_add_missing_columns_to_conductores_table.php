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
            if (!Schema::hasColumn('conductores', 'vigencia_licencia')) {
                $table->date('vigencia_licencia')->nullable();
            }
            if (!Schema::hasColumn('conductores', 'sexo')) {
                $table->string('sexo', 20)->nullable();
            }
            if (!Schema::hasColumn('conductores', 'referencia_1')) {
                $table->string('referencia_1', 255)->nullable();
            }
            if (!Schema::hasColumn('conductores', 'referencia_2')) {
                $table->string('referencia_2', 255)->nullable();
            }
            if (!Schema::hasColumn('conductores', 'condicionamientos_medicos')) {
                $table->text('condicionamientos_medicos')->nullable();
            }
            if (!Schema::hasColumn('conductores', 'foto')) {
                $table->string('foto', 255)->nullable();
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
                'vigencia_licencia',
                'sexo',
                'referencia_1',
                'referencia_2',
                'condicionamientos_medicos',
                'foto'
            ]);
        });
    }
};
