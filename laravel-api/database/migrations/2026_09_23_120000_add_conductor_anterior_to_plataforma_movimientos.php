<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega la columna conductor_anterior a plataforma_movimientos.
     * Esta columna almacena el tarjetón del conductor que estaba vigente
     * inmediatamente antes del movimiento registrado.
     * Es nullable para mantener compatibilidad con registros históricos existentes.
     */
    public function up(): void
    {
        Schema::table('plataforma_movimientos', function (Blueprint $table) {
            // Mismo tipo que conductor_asignado (string 100, nullable)
            $table->string('conductor_anterior', 100)->nullable()->after('estatus_nuevo');
        });
    }

    public function down(): void
    {
        Schema::table('plataforma_movimientos', function (Blueprint $table) {
            $table->dropColumn('conductor_anterior');
        });
    }
};
