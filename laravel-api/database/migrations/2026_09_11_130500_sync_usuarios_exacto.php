<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

return new class extends Migration
{
    public function up()
    {
        $now = Carbon::now();
        $usuarios = json_decode('[{"rol": "Administrador", "nombre": "Enrique Hernandez Hernandez", "usuario": "Enrique_Hernandez", "password": "HHE_A26", "modulos": ["Todos los módulos"]}, {"rol": "Administrador", "nombre": "Luis Ángel Vargas Gutiérrez", "usuario": "Luis_Vargas", "password": "VGL_A26", "modulos": ["Todos los módulos"]}, {"rol": "Administrador", "nombre": "Jeanet García Chávez", "usuario": "Jeanet_Garcia", "password": "GCJ_A26", "modulos": ["Todos los módulos"]}, {"rol": "Administrador", "nombre": "Israel Moreno Gómez", "usuario": "Israel_Moreno", "password": "MGI_A26", "modulos": ["Todos los módulos"]}, {"rol": "Programación", "nombre": "Daniel Luna Cortez", "usuario": "Daniel_Luna", "password": "LCD_PY26", "modulos": ["Programación y Logística"]}, {"rol": "Programación", "nombre": "Mario Alejandro Lazcano Aguilar", "usuario": "Mario_Lazcano", "password": "LAM_PY26", "modulos": ["Programación y Logística", "Relevos de t6"]}, {"rol": "Programación", "nombre": "Jorge Leal Ramírez", "usuario": "Jorge_Leal", "password": "LRJ_PY26", "modulos": ["Programación y Logística", "Relevos de t6"]}, {"rol": "Centro de Control", "nombre": "Diana Karina Vázquez García", "usuario": "Diana_Vazquez", "password": "VGD_ME26", "modulos": ["Monitoreo operativo", "Mesa de control", "Gestión de maniobristas", "Relevos de t6", "Encierro de unidades", "Programación y Logística"]}, {"rol": "Centro de Control", "nombre": "Bonifacio Alpizar López", "usuario": "Bonifacio_Alpizar", "password": "ALB_ME26", "modulos": ["Monitoreo operativo", "Mesa de control", "Gestión de maniobristas", "Relevos de t6", "Encierro de unidades", "Programación y Logística"]}, {"rol": "Centro de Control", "nombre": "Emilio Corona Montufar", "usuario": "Emilio_Corona", "password": "CME_ME26", "modulos": ["Monitoreo operativo", "Mesa de control", "Gestión de maniobristas", "Relevos de t6", "Encierro de unidades", "Programación y Logística"]}, {"rol": "Despacho", "nombre": "Bacilio Tapia Padilla", "usuario": "Bacilio_Tapia", "password": "TPB_DD26", "modulos": ["Despacho de unidades"]}, {"rol": "Despacho", "nombre": "César Jiménez", "usuario": "Cesar_Jimenez", "password": "JC_DD26", "modulos": ["Despacho de unidades"]}, {"rol": "Despacho", "nombre": "Fausto Valdez Téllez", "usuario": "Fausto_Valdez", "password": "VTF_DD26", "modulos": ["Despacho de unidades"]}, {"rol": "Despacho", "nombre": "Fernando Ramos Lira", "usuario": "Fernando_Ramos", "password": "RLF_DD26", "modulos": ["Despacho de unidades"]}, {"rol": "Despacho", "nombre": "Guadalupe Santos Callejas", "usuario": "Guadalupe_Santos", "password": "SCG_DD26", "modulos": ["Despacho de unidades"]}, {"rol": "Despacho", "nombre": "Marino Román Velázquez", "usuario": "Marino_Roman", "password": "RVM_DD26", "modulos": ["Despacho de unidades"]}, {"rol": "Despacho", "nombre": "Miguel Odón", "usuario": "Miguel_Odon", "password": "OM_DD26", "modulos": ["Despacho de unidades", "Control de personas conductoras"]}, {"rol": "Despacho", "nombre": "Jairo Jared Jiménez Ramírez", "usuario": "Jairo_Jimenez", "password": "JRJ_DD26", "modulos": ["Despacho de unidades"]}, {"rol": "Encierro", "nombre": "Jose Gabriel Angeles Martinez", "usuario": "Jose_Angeles", "password": "AMJ_EN26", "modulos": ["Encierro de unidades"]}, {"rol": "Gestor de Operadores", "nombre": "Omar Avilés Lugo", "usuario": "Omar_Aviles", "password": "ALO_CD26", "modulos": ["Control de personas conductoras"]}, {"rol": "Gestor de Operadores", "nombre": "Iván Martínez Acosta", "usuario": "Ivan_Martinez", "password": "MAI_CD26", "modulos": ["Control de personas conductoras", "Gestión de maniobristas"]}, {"rol": "Lectura", "nombre": "Humberto Cabrera Román", "usuario": "Humberto_Cabrera", "password": "CRH_L26", "modulos": ["Todos los módulos"]}, {"rol": "Lectura", "nombre": "Miguel Ángel Monzalvo Muñoz", "usuario": "Miguel_Monzalvo", "password": "MMM_L26", "modulos": ["Todos los módulos"]}, {"rol": "Lectura", "nombre": "José Alberto Montiel Balderrama", "usuario": "Jose_Montiel", "password": "MBJ_L26", "modulos": ["Todos los módulos"]}, {"rol": "Mantenimiento", "nombre": "Gabriel Garcia Vazques", "usuario": "Gabriel_Garcia", "password": "GVG_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "Karen Guadalupe Rodríguez Blanco", "usuario": "karen_rodriguez", "password": "RBK_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "Gabriel García Vázquez", "usuario": "gabriel_garcia", "password": "GVG_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "Jorge Nava Vinte", "usuario": "jorge_nava", "password": "NVJ_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "César Arturo Badillo Martinez", "usuario": "cesar_badillo", "password": "BMC_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "Ramón Bautista Rodríguez", "usuario": "ramon_bautista", "password": "BRR_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "Otoniel Pérez Moreno", "usuario": "Otoniel_Perez", "password": "PMO_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "Edgar Gomez García", "usuario": "edgar_gomez", "password": "GGE_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "Erick Herrera Chávez", "usuario": "Erick_Herrera", "password": "HCE_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "Adrián Isidro Lopéz", "usuario": "adrian_isidro", "password": "ILA_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mantenimiento", "nombre": "Raquel Aguilar Rodríguez", "usuario": "raquel_aguilar", "password": "ARR_ME26", "modulos": ["Mantenimiento parque vehicular", "Encierro de unidades", "Control de combustible"]}, {"rol": "Mesa de Control", "nombre": "Angélica Gonzalez Santos", "usuario": "Angelica_Gonzalez", "password": "GSA_MC26", "modulos": ["Mesa de control", "Relevos de t6", "Monitoreo operativo"]}, {"rol": "Pasteles", "nombre": "Ricardo Macías Vargas", "usuario": "Ricardo_Macias", "password": "MVR_MC26", "modulos": ["Mesa de control", "Relevos de t6", "Monitoreo operativo", "Mantenimiento parque vehicular"]}, {"rol": "Pasteles", "nombre": "Victor Esteban Alonso Garcia", "usuario": "Victor_Alonso", "password": "AGV_MC26", "modulos": ["Mesa de control", "Relevos de t6", "Monitoreo operativo", "Mantenimiento parque vehicular"]}]', true);

        // Mapeo de nombres legibles a códigos de la BD
        $moduloMap = [
            'Programación y Logística' => 'capturista',
            'Relevos de t6' => 'relevos',
            'Monitoreo operativo' => 'centro_control',
            'Mesa de control' => 'mesa_control',
            'Gestión de maniobristas' => 'maniobristas',
            'Encierro de unidades' => 'encierro',
            'Despacho de unidades' => 'despacho',
            'Control de personas conductoras' => 'operadores',
            'Mantenimiento parque vehicular' => 'mantenimiento',
            'Control de combustible' => 'carga_combustible'
        ];
        
        $todosLosModulos = array_values($moduloMap);
        $todosLosModulos[] = 'historial';
        $todosLosModulos[] = 'titan';
        $todosLosModulos[] = 'infraccion';
        $todosLosModulos[] = 'general';

        // Map roles to lowercase code
        $rolMap = [];
        foreach (DB::table('roles')->get() as $r) {
            $rolMap[strtolower(trim($r->nombre))] = $r->id;
        }

        foreach ($usuarios as $u) {
            $rolName = strtolower(trim($u['rol']));
            $rolId = $rolMap[$rolName] ?? null;

            if (!$rolId) {
                // If role doesn't exist, create it dynamically
                $rolId = DB::table('roles')->insertGetId([
                    'codigo' => str_replace(' ', '_', $rolName),
                    'nombre' => trim($u['rol']),
                    'descripcion' => trim($u['rol'])
                ]);
                $rolMap[$rolName] = $rolId;
            }

            // Look for the user by exactly full name
            $existingUser = DB::table('usuarios')->where('nombre_completo', $u['nombre'])->first();

            if ($existingUser) {
                // UPDATE
                DB::table('usuarios')->where('id', $existingUser->id)->update([
                    'usuario' => $u['usuario'], // Enforce the username from Excel
                    'rol_id' => $rolId,
                    'fecha_actualizacion' => $now
                ]);
                $userId = $existingUser->id;
            } else {
                // INSERT
                $userId = DB::table('usuarios')->insertGetId([
                    'nombre_completo' => $u['nombre'],
                    'usuario' => $u['usuario'],
                    'contrasena' => Hash::make($u['password']),
                    'rol_id' => $rolId,
                    'fecha_creacion' => $now,
                    'fecha_actualizacion' => $now,
                    'activo' => DB::raw('true')
                ]);
            }

            // Sync Modulos
            DB::table('usuario_modulos')->where('usuario_id', $userId)->delete();
            
            $modulosAsignar = [];
            foreach ($u['modulos'] as $modStr) {
                $modStr = trim($modStr);
                if ($modStr == '') continue;
                
                if (stripos($modStr, 'Todos los módulos') !== false) {
                    $modulosAsignar = $todosLosModulos;
                    break;
                } else if (isset($moduloMap[$modStr])) {
                    $modulosAsignar[] = $moduloMap[$modStr];
                }
            }
            
            $modulosAsignar = array_unique($modulosAsignar);

            foreach ($modulosAsignar as $modCodigo) {
                DB::table('usuario_modulos')->insert([
                    'usuario_id' => $userId,
                    'modulo_codigo' => $modCodigo,
                    'created_at' => $now,
                    'updated_at' => $now
                ]);
            }
        }
    }

    public function down()
    {
    }
};
