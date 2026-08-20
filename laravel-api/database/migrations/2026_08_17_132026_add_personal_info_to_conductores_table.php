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
            if (!Schema::hasColumn($table->getTable(), 'vigencia_licencia')) {
                $table->date('vigencia_licencia')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'sexo')) {
                $table->string('sexo', 20)->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'fecha_nacimiento')) {
                $table->date('fecha_nacimiento')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'telefono')) {
                $table->string('telefono', 20)->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'referencia_1')) {
                $table->string('referencia_1')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'referencia_2')) {
                $table->string('referencia_2')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'fecha_ingreso')) {
                $table->date('fecha_ingreso')->nullable();
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
                'fecha_nacimiento',
                'telefono',
                'referencia_1',
                'referencia_2',
                'fecha_ingreso'
            ]);
        });
    }
};
