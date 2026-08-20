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
        Schema::table('unidades', function (Blueprint $table) {
            if (!Schema::hasColumn($table->getTable(), 'nivel_combustible')) {
                $table->string('nivel_combustible')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'nivel_adblue')) {
                $table->string('nivel_adblue')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'numero_cincho')) {
                $table->string('numero_cincho')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'fecha_ultima_carga')) {
                $table->date('fecha_ultima_carga')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('unidades', function (Blueprint $table) {
            $table->dropColumn(['nivel_combustible', 'nivel_adblue', 'numero_cincho', 'fecha_ultima_carga']);
        });
    }
};
