<?php
use Illuminate\Support\Facades\DB;

$config = [
    'Angelica_Gonzalez' => ['mesa_control', 'relevos', 'centro_control'],
    'Gabriel_Garcia' => ['mantenimiento', 'encierro', 'carga_combustible'],
    'Jose_Angeles' => ['encierro']
];

foreach ($config as $usuario => $modulos) {
    $user = DB::table('usuarios')->where('usuario', $usuario)->first();
    if ($user) {
        // Delete existing explicitly assigned modules just in case
        DB::table('usuario_modulos')->where('usuario_id', $user->id)->delete();
        
        foreach ($modulos as $mod) {
            DB::table('usuario_modulos')->insert([
                'usuario_id' => $user->id,
                'modulo_codigo' => $mod,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        echo "Updated modules for $usuario\n";
    }
}
