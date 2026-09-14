<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

$users = [
    [
        'nombre_completo' => 'Ricardo Macías Vargas',
        'usuario' => 'Ricardo_Macias',
        'correo' => 'rmacias@sitmah.gob.mx',
        'contrasena' => Hash::make('MVR_MC26'),
        'rol_id' => 9,
        'activo' => 'true',
        'fecha_creacion' => now(),
        'fecha_actualizacion' => now(),
    ],
    [
        'nombre_completo' => 'Victor Esteban Alonso Garcia',
        'usuario' => 'Victor_Alonso',
        'correo' => 'valonso@sitmah.gob.mx',
        'contrasena' => Hash::make('AGV_MC26'),
        'rol_id' => 9,
        'activo' => 'true',
        'fecha_creacion' => now(),
        'fecha_actualizacion' => now(),
    ],
    [
        'nombre_completo' => 'Gabriel Garcia Vazques',
        'usuario' => 'Gabriel_Garcia',
        'correo' => 'ggarcia@sitmah.gob.mx',
        'contrasena' => Hash::make('GVG_ME26'),
        'rol_id' => 15,
        'activo' => 'true',
        'fecha_creacion' => now(),
        'fecha_actualizacion' => now(),
    ],
    [
        'nombre_completo' => 'Angélica Gonzalez Santos',
        'usuario' => 'Angelica_Gonzalez',
        'correo' => 'agonzalez@sitmah.gob.mx',
        'contrasena' => Hash::make('GSA_MC26'),
        'rol_id' => 9,
        'activo' => 'true',
        'fecha_creacion' => now(),
        'fecha_actualizacion' => now(),
    ],
    [
        'nombre_completo' => 'Jose Gabriel Angeles Martinez',
        'usuario' => 'Jose_Angeles',
        'correo' => 'jangeles@sitmah.gob.mx',
        'contrasena' => Hash::make('AMJ_EN26'),
        'rol_id' => 5,
        'activo' => 'true',
        'fecha_creacion' => now(),
        'fecha_actualizacion' => now(),
    ]
];

foreach ($users as $u) {
    // Check if exists
    $exists = DB::table('usuarios')->where('usuario', $u['usuario'])->first();
    if (!$exists) {
        $id = DB::table('usuarios')->insertGetId($u);
        
        // Add modules for Ricardo and Victor
        if ($u['usuario'] === 'Ricardo_Macias' || $u['usuario'] === 'Victor_Alonso') {
            $modulos = ['mesa_control', 'relevos', 'centro_control', 'mantenimiento'];
            foreach ($modulos as $mod) {
                DB::table('usuario_modulos')->insert([
                    'usuario_id' => $id,
                    'modulo_codigo' => $mod,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        echo "Created " . $u['usuario'] . "\n";
    } else {
        echo "Exists " . $u['usuario'] . "\n";
    }
}
exit();
