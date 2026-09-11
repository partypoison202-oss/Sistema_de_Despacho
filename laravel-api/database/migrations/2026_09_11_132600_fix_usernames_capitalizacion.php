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
        // Eliminar duplicados de Gabriel (puede tener usuario Gabriel_Garcia o gabriel_garcia)
        // Borramos todos los Gabriel excepto el id 64 (el correcto con acentos)
        $gabrielDupes = DB::table('usuarios')
            ->whereIn('usuario', ['Gabriel_Garcia', 'gabriel_garcia'])
            ->where('id', '!=', 64)
            ->pluck('id');
        foreach ($gabrielDupes as $dupeId) {
            DB::table('usuario_modulos')->where('usuario_id', $dupeId)->delete();
            DB::table('usuarios')->where('id', $dupeId)->delete();
        }

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
            // Verificar que el usuario con ese ID existe antes de actualizar
            $user = DB::table('usuarios')->where('id', $id)->first();
            if (!$user) continue;

            // Si ya tiene el username correcto, saltar
            if ($user->usuario === $newUsername) continue;

            // Si el nuevo username ya está tomado por otro usuario, saltarlo (seguridad)
            $conflict = DB::table('usuarios')
                ->where('usuario', $newUsername)
                ->where('id', '!=', $id)
                ->first();
            if ($conflict) continue;

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
