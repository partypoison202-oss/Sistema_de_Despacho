<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    public function up()
    {
        $now = Carbon::now();

        // Correcciones de username según la regla: Nombre_Apellido
        // (primera letra de cada parte con mayúscula, después del _ también mayúscula)
        // Fuente de verdad: Excel Usuarios_Roles_SITMAH_Ajustado.xlsx
        // ID 60: Gabriel Garcia Vazques (typo, duplicado) → ELIMINAR primero
        // ID 64: Gabriel García Vázquez (correcto) → renombrar a Gabriel_Garcia
        DB::table('usuario_modulos')->where('usuario_id', 60)->delete();
        DB::table('usuarios')->where('id', 60)->delete();

        $fixes = [
            63 => 'Karen_Rodriguez',
            64 => 'Gabriel_Garcia',
            65 => 'Jorge_Nava',
            66 => 'Cesar_Badillo',
            67 => 'Ramon_Bautista',
            68 => 'Edgar_Gomez',
            69 => 'Adrian_Isidro',
            70 => 'Raquel_Aguilar',
        ];

        foreach ($fixes as $id => $newUsername) {
            DB::table('usuarios')
                ->where('id', $id)
                ->update([
                    'usuario' => $newUsername,
                    'fecha_actualizacion' => $now,
                ]);
        }
    }

    public function down()
    {
        // Revertir a minúsculas si se hace rollback
        $revert = [
            63 => 'karen_rodriguez',
            64 => 'gabriel_garcia',
            65 => 'jorge_nava',
            66 => 'cesar_badillo',
            67 => 'ramon_bautista',
            68 => 'edgar_gomez',
            69 => 'adrian_isidro',
            70 => 'raquel_aguilar',
        ];

        foreach ($revert as $id => $oldUsername) {
            DB::table('usuarios')
                ->where('id', $id)
                ->update(['usuario' => $oldUsername]);
        }
    }
};
