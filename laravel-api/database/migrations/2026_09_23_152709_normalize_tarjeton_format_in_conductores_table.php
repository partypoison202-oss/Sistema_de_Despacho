<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $conductores = \Illuminate\Support\Facades\DB::table('conductores')->get(['id', 'tarjeton']);
        foreach ($conductores as $c) {
            if (!empty($c->tarjeton)) {
                $parts = explode('_BAJA_', $c->tarjeton);
                $parts[0] = str_pad($parts[0], 4, '0', STR_PAD_LEFT);
                $nuevoTarjeton = implode('_BAJA_', $parts);
                
                if ($nuevoTarjeton !== $c->tarjeton) {
                    \Illuminate\Support\Facades\DB::table('conductores')->where('id', $c->id)->update(['tarjeton' => $nuevoTarjeton]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Data normalization cannot be easily reversed
    }
};
