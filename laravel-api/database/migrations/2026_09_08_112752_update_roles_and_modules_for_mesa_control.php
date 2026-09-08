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
        // 1. Cambiar el nombre del rol PLATAFORMA a Mesa de Control
        DB::table('roles')->where('codigo', 'PLATAFORMA')->update([
            'codigo' => 'MESA_CONTROL',
            'nombre' => 'Mesa de Control',
            'descripcion' => 'Mesa de Control y Monitoreo',
            'updated_at' => now(),
        ]);

        // 2. A los usuarios con rol MESA_CONTROL (antes PLATAFORMA), ponerles los modulos exactos
        $rolMesaControl = DB::table('roles')->where('codigo', 'MESA_CONTROL')->first();
        if ($rolMesaControl) {
            $usuariosMesa = DB::table('usuarios')->where('rol_id', $rolMesaControl->id)->pluck('id');
            foreach ($usuariosMesa as $userId) {
                // Borrar módulos anteriores
                DB::table('usuario_modulos')->where('usuario_id', $userId)->delete();
                // Insertar los nuevos: mesa_control, relevos, centro_control
                $modulos = ['mesa_control', 'relevos', 'centro_control'];
                foreach ($modulos as $modulo) {
                    DB::table('usuario_modulos')->insert([
                        'usuario_id' => $userId,
                        'modulo_codigo' => $modulo,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // 3. A Jorge Leal y Mario Lazcano agregarles relevos y mantener capturista
        $nombres = ['Jorge Leal Ramírez', 'Mario Alejandro Lazcano Aguilar'];
        foreach ($nombres as $nombre) {
            $usuario = DB::table('usuarios')->where('nombre_completo', $nombre)->first();
            if ($usuario) {
                DB::table('usuario_modulos')->where('usuario_id', $usuario->id)->delete();
                $modulos = ['capturista', 'relevos'];
                foreach ($modulos as $modulo) {
                    DB::table('usuario_modulos')->insert([
                        'usuario_id' => $usuario->id,
                        'modulo_codigo' => $modulo,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // 4. A los usuarios con rol MANTENIMIENTO, forzar los modulos
        $rolMantenimiento = DB::table('roles')->where('codigo', 'MANTENIMIENTO')->first();
        if ($rolMantenimiento) {
            $usuariosMantenimiento = DB::table('usuarios')->where('rol_id', $rolMantenimiento->id)->pluck('id');
            foreach ($usuariosMantenimiento as $userId) {
                DB::table('usuario_modulos')->where('usuario_id', $userId)->delete();
                $modulos = ['mantenimiento', 'encierro', 'carga_combustible'];
                foreach ($modulos as $modulo) {
                    DB::table('usuario_modulos')->insert([
                        'usuario_id' => $userId,
                        'modulo_codigo' => $modulo,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
