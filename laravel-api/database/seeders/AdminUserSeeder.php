<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Crea los roles del sistema y el usuario Administrador.
     * Completamente idempotente: no duplica si ya existen.
     */
    public function run(): void
    {
        // ── Roles ──────────────────────────────────────────────────────
        $roles = [
            ['codigo' => 'ADMINISTRADOR',       'nombre' => 'Administrador',        'descripcion' => 'Administrador general del sistema.'],
            ['codigo' => 'PROGRAMACION',         'nombre' => 'Programación',          'descripcion' => 'Gestión de la programación diaria.'],
            ['codigo' => 'CENTRO_CONTROL',       'nombre' => 'Centro de Control',     'descripcion' => 'Monitoreo y control del Centro de Control.'],
            ['codigo' => 'DESPACHO',             'nombre' => 'Despacho',              'descripcion' => 'Despacho de unidades.'],
            ['codigo' => 'ENCIERRO',             'nombre' => 'Encierro',              'descripcion' => 'Gestión de entrada y salida de unidades en encierros.'],
            ['codigo' => 'GENERAL',              'nombre' => 'General',               'descripcion' => 'Rol operativo general.'],
            ['codigo' => 'PLATAFORMA',           'nombre' => 'Plataforma',            'descripcion' => 'Movimientos de plataforma.'],
            ['codigo' => 'INFRACCION',           'nombre' => 'Infracción',            'descripcion' => 'Gestión de infracciones.'],
            ['codigo' => 'GESTOR_OPERADORES',    'nombre' => 'Gestor de Operadores',  'descripcion' => 'Gestión del catálogo de operadores.'],
            ['codigo' => 'CARGA_DE_COMBUSTIBLE', 'nombre' => 'Carga de Combustible',  'descripcion' => 'Control de carga de combustible.'],
        ];

        foreach ($roles as $rol) {
            DB::table('roles')->updateOrInsert(
                ['codigo' => $rol['codigo']],
                ['nombre' => $rol['nombre'], 'descripcion' => $rol['descripcion']]
            );
        }

        $this->command->info('✓ Roles verificados/creados.');

        // ── Usuario Administrador ──────────────────────────────────────
        $yaExiste = DB::table('usuarios')->where('usuario', 'Admin')->exists();

        if ($yaExiste) {
            $this->command->info('✓ Usuario Administrador ya existe. Sin cambios.');
            return;
        }

        $rol = DB::table('roles')->where('codigo', 'ADMINISTRADOR')->first();

        DB::table('usuarios')->insert([
            'nombre_completo'     => 'Administrador del Sistema',
            'usuario'             => 'Admin',
            'correo'              => 'admin@sitmah.gob.mx',
            'contrasena'          => Hash::make('password'),
            'activo'              => true,
            'rol_id'              => $rol->id,
            'foto_url'            => null,
            'fecha_creacion'      => now()->toDateTimeString(),
            'fecha_actualizacion' => now()->toDateTimeString(),
        ]);

        $this->command->info('✓ Usuario Administrador creado (usuario: Admin, contraseña: password)');
        $this->command->warn('  ⚠ Cambia la contraseña en producción.');
    }
}
