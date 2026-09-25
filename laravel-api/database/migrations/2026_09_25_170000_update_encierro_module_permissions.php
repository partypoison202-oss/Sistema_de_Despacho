<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Quitar módulo 'encierro' de todos los usuarios con rol MANTENIMIENTO
        $mantenimientoRoleIds = DB::table('roles')
            ->whereIn('codigo', ['MANTENIMIENTO'])
            ->pluck('id');

        $mantenimientoUserIds = DB::table('usuarios')
            ->whereIn('role_id', $mantenimientoRoleIds)
            ->pluck('id');

        if ($mantenimientoUserIds->isNotEmpty()) {
            DB::table('usuario_modulos')
                ->whereIn('usuario_id', $mantenimientoUserIds)
                ->where('modulo_codigo', 'encierro')
                ->delete();
        }

        // 2. Asignar módulo 'encierro' a los usuarios con rol PASTELES o PROGRAMACION_PASTELES
        $pastelesRoleIds = DB::table('roles')
            ->whereIn('codigo', ['PASTELES', 'PROGRAMACION_PASTELES'])
            ->pluck('id');

        $pastelesUserIds = DB::table('usuarios')
            ->whereIn('role_id', $pastelesRoleIds)
            ->pluck('id');

        foreach ($pastelesUserIds as $uId) {
            DB::table('usuario_modulos')->updateOrInsert(
                ['usuario_id' => $uId, 'modulo_codigo' => 'encierro'],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        //
    }
};
