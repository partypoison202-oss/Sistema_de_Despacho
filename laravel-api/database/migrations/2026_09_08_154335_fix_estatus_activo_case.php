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
        // En producción la migración anterior se corrió con "Activo" (mayúscula)
        // El API lo espera como "activo" (minúscula).
        DB::table('conductores')
            ->where('estatus', 'Activo')
            ->update(['estatus' => 'activo']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No revertir ya que activo es el valor correcto
    }
};
