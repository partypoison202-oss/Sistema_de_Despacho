<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Esta migración repara el estado inconsistente en producción:
 * La migración 2026_09_11_000001_create_pasteles_role existe en el servidor
 * pero falla porque intenta insertar con created_at/updated_at que no existen
 * en la tabla roles. Esta migración la salta/marca como completada y asegura
 * que el rol Pasteles existe correctamente.
 */
return new class extends Migration
{
    public function up()
    {
        // 1. Eliminar la migración rota del historial de migraciones de Laravel
        //    para que no la siga intentando ejecutar
        DB::table('migrations')
            ->where('migration', '2026_09_11_000001_create_pasteles_role')
            ->delete();

        // 2. Asegurarse de que el rol Pasteles existe correctamente
        //    (sin created_at/updated_at que no existen en la tabla)
        $exists = DB::table('roles')->where('codigo', 'PASTELES')->first()
               ?? DB::table('roles')->where('nombre', 'Pasteles')->first();

        if (!$exists) {
            DB::table('roles')->insert([
                'codigo'      => 'PASTELES',
                'nombre'      => 'Pasteles',
                'descripcion' => 'Acceso a Monitoreo de la Operación, Mesa de Control y Programación (Pasteles)',
            ]);
        }
    }

    public function down()
    {
        // No necesitamos revertir esto
    }
};
