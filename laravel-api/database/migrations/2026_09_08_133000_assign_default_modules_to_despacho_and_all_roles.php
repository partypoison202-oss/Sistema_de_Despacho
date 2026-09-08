<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $defaultModulesByRole = [
            'DESPACHO'             => ['despacho'],
            'GESTOR_OPERADORES'    => ['operadores'],
            'ENCIERRO'             => ['encierro'],
            'CENTRO_CONTROL'       => ['centro_control'],
            'TITAN'                => ['titan'],
            'INFRACCION'           => ['infraccion'],
            'GENERAL'              => ['general'],
            'MANTENIMIENTO'        => ['mantenimiento', 'encierro', 'carga_combustible'],
            'CARGA_DE_COMBUSTIBLE' => ['carga_combustible'],
            'PROGRAMACION'         => ['capturista', 'relevos'],
            'MESA_CONTROL'         => ['mesa_control', 'relevos', 'centro_control'],
        ];

        // 1. Asignar módulos por defecto a usuarios según su rol si no tienen módulos
        $usuarios = DB::table('usuarios')
            ->join('roles', 'usuarios.rol_id', '=', 'roles.id')
            ->select('usuarios.id as usuario_id', 'roles.codigo as rol_codigo', 'usuarios.usuario')
            ->get();

        foreach ($usuarios as $u) {
            $currentModules = DB::table('usuario_modulos')
                ->where('usuario_id', $u->usuario_id)
                ->pluck('modulo_codigo')
                ->toArray();

            // Caso especial Miguel_Odon (perfil mixto: despacho + operadores)
            if ($u->usuario === 'Miguel_Odon') {
                foreach (['despacho', 'operadores'] as $mod) {
                    DB::table('usuario_modulos')->updateOrInsert(
                        ['usuario_id' => $u->usuario_id, 'modulo_codigo' => $mod],
                        ['updated_at' => now(), 'created_at' => now()]
                    );
                }
                continue;
            }

            // Si es un usuario de DESPACHO, asegurar que siempre tenga 'despacho'
            if ($u->rol_codigo === 'DESPACHO') {
                DB::table('usuario_modulos')->updateOrInsert(
                    ['usuario_id' => $u->usuario_id, 'modulo_codigo' => 'despacho'],
                    ['updated_at' => now(), 'created_at' => now()]
                );
                continue;
            }

            // Si el usuario no tiene ningún módulo asignado, asignarle los de su rol
            if (empty($currentModules) && isset($defaultModulesByRole[$u->rol_codigo])) {
                foreach ($defaultModulesByRole[$u->rol_codigo] as $mod) {
                    DB::table('usuario_modulos')->updateOrInsert(
                        ['usuario_id' => $u->usuario_id, 'modulo_codigo' => $mod],
                        ['updated_at' => now(), 'created_at' => now()]
                    );
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Operación aditiva segura, no se requiere reversión destructiva.
    }
};
