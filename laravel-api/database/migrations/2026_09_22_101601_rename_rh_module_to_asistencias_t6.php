<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('usuario_modulos')
            ->where('modulo_codigo', 'rh')
            ->update(['modulo_codigo' => 'asistencias_t6']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('asistencias_t6', function (Blueprint $table) {
            //
        });
    }
};
