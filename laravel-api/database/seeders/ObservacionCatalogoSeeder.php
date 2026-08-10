<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ObservacionCatalogoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $observaciones = [
            ["clave" => 1, "descripcion" => "DAÑO FRONTAL"],
            ["clave" => 2, "descripcion" => "DAÑO POR ENTRAR A 01"],
            ["clave" => 3, "descripcion" => "DAÑO TRASERO"],
            ["clave" => 4, "descripcion" => "DAÑO LATERAL"],
            ["clave" => 5, "descripcion" => "DESPRENDIMIENTO DE VINIL"],
            ["clave" => 6, "descripcion" => "DAÑO EN PUERTA EMERGENCIA"],
            ["clave" => 7, "descripcion" => "DAÑO EN PUERTAS PRINCIPALES"],
            ["clave" => 8, "descripcion" => "DAÑO EN PUERTAS TRASERAS"],
            ["clave" => 9, "descripcion" => "SIN SEGURO DE PUERTAS"],
            ["clave" => 10, "descripcion" => "SPIA"],
            ["clave" => 11, "descripcion" => "DESPROGRAMADO MOVITEC"],
            ["clave" => 12, "descripcion" => "PANTALLA DE CONDUCTOR APAGADAS"],
            ["clave" => 13, "descripcion" => "CAMARA DAÑADA"],
            ["clave" => 14, "descripcion" => "LUCES FRONTALES"],
            ["clave" => 15, "descripcion" => "INTERMITENTE FUNDIDA"],
            ["clave" => 16, "descripcion" => "TORRETA FUNDIDA"],
            ["clave" => 17, "descripcion" => "DAÑO EN ESPEJO"],
            ["clave" => 18, "descripcion" => "FALTA DE PERILLA"],
            ["clave" => 19, "descripcion" => "GRAFITIS"],
            ["clave" => 20, "descripcion" => "VOLANTE VIBRA"],
            ["clave" => 21, "descripcion" => "DAÑO EN ASIENTOS"],
            ["clave" => 22, "descripcion" => "ALINEACION"],
            ["clave" => 23, "descripcion" => "PARABRISAS DAÑADO"],
            ["clave" => 24, "descripcion" => "FALTA DE TORNILLO"],
            ["clave" => 25, "descripcion" => "DAÑO CONECCION USB"],
            ["clave" => 26, "descripcion" => "ESCOBETILLA INFERIOR DE PUERTA"],
            ["clave" => 27, "descripcion" => "NO FUNSIONA NIVEL DE DISEL"],
            ["clave" => 28, "descripcion" => "BALATAS DELANTERAS"],
            ["clave" => 29, "descripcion" => "ESTETICA"],
            ["clave" => 30, "descripcion" => "LLANTA PONCHADA"],
            ["clave" => 31, "descripcion" => "NO FUNSIONA CLAXON"]
        ];

        foreach ($observaciones as $obs) {
            \App\Models\ObservacionCatalogo::updateOrCreate(
                ['clave' => $obs['clave']],
                ['descripcion' => $obs['descripcion']]
            );
        }
    }
}
