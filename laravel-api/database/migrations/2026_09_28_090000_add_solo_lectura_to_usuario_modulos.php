<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Agregar columna solo_lectura a usuario_modulos si no existe
        if (!Schema::hasColumn('usuario_modulos', 'solo_lectura')) {
            Schema::table('usuario_modulos', function (Blueprint $table) {
                $table->boolean('solo_lectura')->default(false)->after('modulo_codigo');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('usuario_modulos', 'solo_lectura')) {
            Schema::table('usuario_modulos', function (Blueprint $table) {
                $table->dropColumn('solo_lectura');
            });
        }
    }
};
