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
        if (DB::table('roles')->where('codigo', 'PASTELES')->doesntExist()) {
            DB::table('roles')->insert([
                'codigo' => 'PASTELES',
                'nombre' => 'Pasteles',
                'descripcion' => 'Acceso a Monitoreo de la Operación, Mesa de Control y Programación (Pasteles).',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('roles')->where('codigo', 'PASTELES')->delete();
    }
};
