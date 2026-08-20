<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener el rol de administrador
        $role = Role::where('codigo', 'ADMINISTRADOR')->first();

        if (!$role) {
            $this->command->error('Rol de ADMINISTRADOR no encontrado. Asegúrate de ejecutar primero el RolesSeeder.');
            return;
        }

        // Crear el usuario administrador únicamente si no existe para no sobreescribir la contraseña
        $exists = \Illuminate\Support\Facades\DB::table('usuarios')->where('usuario', 'Admin')->exists();
        if (!$exists) {
            \Illuminate\Support\Facades\DB::table('usuarios')->insert([
                'usuario' => 'Admin',
                'nombre_completo' => 'Administrador del Sistema',
                'correo' => 'admin@sitmah.gob.mx',
                'contrasena' => Hash::make('password'),
                'activo' => 'true',
                'rol_id' => $role->id,
                'fecha_creacion' => now(),
                'fecha_actualizacion' => now(),
            ]);
            $this->command->info('Usuario Administrador creado exitosamente (Usuario: Admin, Contraseña: password)');
        } else {
            $this->command->info('El usuario Administrador ya existe. No se realizaron cambios para preservar la contraseña.');
        }
    }
}
