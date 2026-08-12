<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Conductor;
use App\Models\Maniobrista;

class ManiobristasSeeder extends Seeder
{
    public function run()
    {
        $conductores = Conductor::where('tipo_tarjeton', 'MANIOBRISTA')->get();
        
        foreach ($conductores as $conductor) {
            Maniobrista::updateOrCreate(
                ['tarjeton' => $conductor->tarjeton],
                [
                    'nombre' => $conductor->nombre,
                    'tipo_tarjeton' => 'MANIOBRISTA',
                    'estado_servicio' => $conductor->estado_servicio,
                    'estatus' => $conductor->estatus,
                ]
            );
        }
    }
}
