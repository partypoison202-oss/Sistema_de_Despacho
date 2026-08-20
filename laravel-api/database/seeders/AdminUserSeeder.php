<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Siembra únicamente el usuario administrador del sistema.
     * Solo actúa si no existe ya. No inserta ningún otro dato.
     */
    public function run(): void
    {
        // Verificar si ya existe el admin
        $exists = DB::table('usuarios')->where('usuario', 'Admin')->exists();

        if ($exists) {
            $this->command->info('✓ Usuario Administrador ya existe. Sin cambios.');
            return;
        }

        // Buscar el rol ADMINISTRADOR por SQL directo (sin depender de modelos)
        $rol = DB::table('roles')->where('codigo', 'ADMINISTRADOR')->first();

        if (!$rol) {
            $this->command->error('✗ No se encontró el rol ADMINISTRADOR en la tabla roles.');
            $this->command->error('  Asegúrate de que las migraciones se ejecutaron correctamente.');
            return;
        }

        DB::table('usuarios')->insert([
            'nombre_completo'     => 'Administrador del Sistema',
            'usuario'             => 'Admin',
            'correo'              => 'admin@sitmah.gob.mx',
            'contrasena'          => Hash::make('password'),
            'activo'              => DB::raw('true'),
            'rol_id'              => $rol->id,
            'fecha_creacion'      => now()->toDateTimeString(),
            'fecha_actualizacion' => now()->toDateTimeString(),
            'foto_url'            => null,
        ]);

        $this->command->info('✓ Usuario Administrador creado (usuario: Admin, contraseña: password)');
        $this->command->warn('  ⚠ Cambia la contraseña del admin en producción.');
    }
}
