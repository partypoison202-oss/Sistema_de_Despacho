<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RutasSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $troncales = ['T01', 'T02', 'T04', 'T05'];
        $alimentadoras = [
            '1A', '1B', '2A', '2B', '2D', '2E', '3', '4', '5', '6', '7', '8', '9', '10',
            '11', '12', '13', '14', '15A', '15B', '15C', '16', '17', '19', '20B'
        ];

        foreach ($troncales as $ruta) {
            DB::table('rutas')->updateOrInsert(
                ['ruta' => $ruta],
                ['tipo' => 'troncal', 'created_at' => now(), 'updated_at' => now()]
            );
        }

        foreach ($alimentadoras as $ruta) {
            DB::table('rutas')->updateOrInsert(
                ['ruta' => $ruta],
                ['tipo' => 'alimentadora', 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }
}
