<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $now = Carbon::now();

        // 1. Crear el rol "Pasteles"
        DB::table('roles')->updateOrInsert(
            ['codigo' => 'pasteles'],
            ['nombre' => 'Pasteles', 'descripcion' => 'Rol Especial Pasteles']
        );

        $mantenimiento_role = DB::table('roles')->where('codigo', 'mantenimiento')->first();
        $pasteles_role = DB::table('roles')->where('codigo', 'pasteles')->first();

        // Mantenimiento users
        $mantenimiento_users = [
            ['Karen Guadalupe Rodríguez Blanco', 'karen_rodriguez', 'RBK_ME26'],
            ['Gabriel García Vázquez', 'gabriel_garcia', 'GVG_ME26'],
            ['Jorge Nava Vinte', 'jorge_nava', 'NVJ_ME26'],
            ['César Arturo Badillo Martinez', 'cesar_badillo', 'BMC_ME26'],
            ['Ramón Bautista Rodríguez', 'ramon_bautista', 'BRR_ME26'],
            ['Otoniel Pérez Moreno', 'Otoniel_Perez', 'PMO_ME26'],
            ['Edgar Gomez García', 'edgar_gomez', 'GGE_ME26'],
            ['Erick Herrera Chávez', 'Erick_Herrera', 'HCE_ME26'],
            ['Adrián Isidro Lopéz', 'adrian_isidro', 'ILA_ME26'],
            ['Raquel Aguilar Rodríguez', 'raquel_aguilar', 'ARR_ME26'],
        ];

        if ($mantenimiento_role) {
            foreach ($mantenimiento_users as $u) {
                $user_id = DB::table('usuarios')->insertGetId([
                    'nombre' => $u[0],
                    'usuario' => $u[1],
                    'password' => Hash::make($u[2]),
                    'rol_id' => $mantenimiento_role->id,
                    'fecha_creacion' => $now,
                    'fecha_actualizacion' => $now,
                    'activo' => true
                ]);

                // Modulos
                $modulos = ['Mantenimiento parque vehicular', 'Encierro de unidades', 'Control de combustible'];
                foreach ($modulos as $mod) {
                    DB::table('usuario_modulos')->insert([
                        'usuario_id' => $user_id,
                        'modulo' => $mod,
                        'fecha_creacion' => $now,
                        'fecha_actualizacion' => $now
                    ]);
                }
            }
        }

        // Pasteles users (Ricardo and Victor already exist, we update them)
        if ($pasteles_role) {
            $pasteles_users = ['Ricardo_Macias', 'Victor_Alonso'];
            foreach ($pasteles_users as $username) {
                DB::table('usuarios')->where('usuario', $username)->update([
                    'rol_id' => $pasteles_role->id,
                    'fecha_actualizacion' => $now
                ]);

                $user = DB::table('usuarios')->where('usuario', $username)->first();
                if ($user) {
                    // Limpiar modulos viejos
                    DB::table('usuario_modulos')->where('usuario_id', $user->id)->delete();
                    
                    // Insertar nuevos
                    $modulos = ['Mesa de control', 'Relevos de t6', 'Monitoreo operativo', 'Mantenimiento parque vehicular'];
                    foreach ($modulos as $mod) {
                        DB::table('usuario_modulos')->insert([
                            'usuario_id' => $user->id,
                            'modulo' => $mod,
                            'fecha_creacion' => $now,
                            'fecha_actualizacion' => $now
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // No implemented, keep the users
    }
};
