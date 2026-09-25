<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $gestorUsers = DB::table('usuarios')
            ->join('roles', 'usuarios.rol_id', '=', 'roles.id')
            ->whereIn('roles.codigo', ['GESTOR_OPERADORES', 'GESTOR_DE_OPERADORES'])
            ->pluck('usuarios.id');

        foreach ($gestorUsers as $usuarioId) {
            foreach (['operadores', 'historial'] as $mod) {
                DB::table('usuario_modulos')->updateOrInsert(
                    ['usuario_id' => $usuarioId, 'modulo_codigo' => $mod],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No destructivo
    }
};
