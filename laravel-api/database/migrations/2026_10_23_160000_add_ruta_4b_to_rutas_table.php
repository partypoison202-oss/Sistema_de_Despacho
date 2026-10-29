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
        $existe = DB::table('rutas')->where('ruta', '4B')->exists();
        if (!$existe) {
            DB::table('rutas')->insert([
                'ruta' => '4B',
                'tipo' => 'alimentadora',
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
        DB::table('rutas')->where('ruta', '4B')->delete();
    }
};
