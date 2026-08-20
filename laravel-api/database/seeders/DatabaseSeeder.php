<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     * Solo siembra el usuario administrador.
     */
    public function run(): void
    {
        $this->call([
            NeonImportSeeder::class,
        ]);

        // Crear administrador de respaldo solo si la tabla de usuarios está completamente vacía
        if (\Illuminate\Support\Facades\DB::table('usuarios')->count() === 0) {
            $rolAdmin = \Illuminate\Support\Facades\DB::table('roles')->where('codigo', 'ADMINISTRADOR')->first();
            if ($rolAdmin) {
                \Illuminate\Support\Facades\DB::table('usuarios')->insert([
                    'nombre_completo'     => 'Administrador del Sistema',
                    'usuario'             => 'Admin',
                    'correo'              => 'admin@sitmah.gob.mx',
                    'contrasena'          => \Illuminate\Support\Facades\Hash::make('password'),
                    'activo'              => true,
                    'rol_id'              => $rolAdmin->id,
                    'foto_url'            => null,
                    'fecha_creacion'      => now()->toDateTimeString(),
                    'fecha_actualizacion' => now()->toDateTimeString(),
                ]);
            }
        }
    }
}
