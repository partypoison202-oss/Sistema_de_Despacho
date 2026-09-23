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
        $ecosFaltantes = ['115', '116', '117', '118', '119', '120', '121', '136'];

        // ZAFIRO was found as transporte_id = 2 locally for ecos 100-114
        foreach ($ecosFaltantes as $eco) {
            $existe = DB::table('unidades')->where('numero_eco', $eco)->exists();
            if (!$existe) {
                DB::table('unidades')->insert([
                    'transporte_id' => 2,
                    'numero_eco' => $eco,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $ecosFaltantes = ['115', '116', '117', '118', '119', '120', '121', '136'];
        DB::table('unidades')->whereIn('numero_eco', $ecosFaltantes)->delete();
    }
};
