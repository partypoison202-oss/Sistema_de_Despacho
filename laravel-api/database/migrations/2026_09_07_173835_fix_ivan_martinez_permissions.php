<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $ivan = DB::table('usuarios')->where('nombre_completo', 'Iván Martínez Acosta')->first();
        
        if ($ivan) {
            // Asignar rol de GESTOR_OPERADORES (ID 11)
            DB::table('usuarios')->where('id', $ivan->id)->update([
                'rol_id' => 11
            ]);

            // Limpiar módulos actuales
            DB::table('usuario_modulos')->where('usuario_id', $ivan->id)->delete();

            // Asignar nuevos módulos
            DB::table('usuario_modulos')->insert([
                ['usuario_id' => $ivan->id, 'modulo_codigo' => 'operadores', 'created_at' => now(), 'updated_at' => now()],
                ['usuario_id' => $ivan->id, 'modulo_codigo' => 'maniobristas', 'created_at' => now(), 'updated_at' => now()]
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
