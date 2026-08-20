<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            ['codigo' => 'ADMINISTRADOR', 'nombre' => 'Administrador', 'descripcion' => 'Administrador general del sistema.'],
            ['codigo' => 'CENTRO_CONTROL', 'nombre' => 'Centro de Control', 'descripcion' => 'Monitoreo y control del Centro de Control.'],
            ['codigo' => 'ENCIERRO', 'nombre' => 'Encierro', 'descripcion' => 'Gestión de entrada y salida de unidades en encierros.'],
            ['codigo' => 'DESPACHO', 'nombre' => 'Despacho', 'descripcion' => 'Despacho de unidades.'],
            ['codigo' => 'GENERAL', 'nombre' => 'General', 'descripcion' => 'Rol operativo general.'],
            ['codigo' => 'TITAN', 'nombre' => 'TITAN', 'descripcion' => 'Rol operativo TITAN.'],
            ['codigo' => 'PLATAFORMA', 'nombre' => 'PLATAFORMA', 'descripcion' => 'Movimientos de plataforma.'],
            ['codigo' => 'INFRACCION', 'nombre' => 'INFRACCION', 'descripcion' => 'Gestión de infracciones.'],
            ['codigo' => 'GESTOR_OPERADORES', 'nombre' => 'Gestor de Operadores', 'descripcion' => 'Gestión del catálogo de operadores.'],
            ['codigo' => 'PROGRAMACION', 'nombre' => 'Programación', 'descripcion' => 'Gestión de la programación diaria.'],
            ['codigo' => 'CARGA_DE_COMBUSTIBLE', 'nombre' => 'Carga de Combustible', 'descripcion' => 'Control de carga de combustible.'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['codigo' => $role['codigo']],
                [
                    'nombre' => $role['nombre'],
                    'descripcion' => $role['descripcion']
                ]
            );
        }
    }
}
