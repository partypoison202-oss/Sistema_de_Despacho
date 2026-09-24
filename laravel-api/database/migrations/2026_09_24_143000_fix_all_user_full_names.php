<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Garantiza que todos los usuarios tengan su nombre_completo correcto en BD de producción (Linux) y desarrollo.
     */
    public function up(): void
    {
        $now = Carbon::now();

        $userUpdates = [
            'Enrique_Hernandez' => 'Enrique Hernandez Hernandez',
            'Luis_Vargas'        => 'Luis Ángel Vargas Gutiérrez',
            'Jeanet_Garcia'      => 'Jeanet García Chávez',
            'Israel_Moreno'      => 'Israel Moreno Gómez',
            'Daniel_Luna'        => 'Daniel Luna Cortez',
            'Mario_Lazcano'      => 'Mario Alejandro Lazcano Aguilar',
            'Jorge_Leal'         => 'Jorge Leal Ramírez',
            'Diana_Vazquez'      => 'Diana Karina Vázquez García',
            'Bonifacio_Alpizar'  => 'Bonifacio Alpizar López',
            'Emilio_Corona'      => 'Emilio Corona Montufar',
            'Bacilio_Tapia'      => 'Bacilio Tapia Padilla',
            'Cesar_Jimenez'      => 'César Jiménez',
            'Fausto_Valdez'      => 'Fausto Valdez Téllez',
            'Fernando_Ramos'     => 'Fernando Ramos Lira',
            'Guadalupe_Santos'   => 'Guadalupe Santos Callejas',
            'Marino_Roman'       => 'Marino Román Velázquez',
            'Miguel_Odon'        => 'Miguel Odón',
            'Jairo_Jimenez'      => 'Jairo Jared Jiménez Ramírez',
            'Jose_Angeles'       => 'Jose Gabriel Angeles Martinez',
            'Omar_Aviles'        => 'Omar Avilés Lugo',
            'Ivan_Martinez'      => 'Iván Martínez Acosta',
            'Humberto_Cabrera'   => 'Humberto Cabrera Román',
            'Miguel_Monzalvo'    => 'Miguel Ángel Monzalvo Muñoz',
            'Jose_Montiel'       => 'José Alberto Montiel Balderrama',
            'Gabriel_Garcia'     => 'Gabriel García Vázquez',
            'Karen_Rodriguez'    => 'Karen Guadalupe Rodríguez Blanco',
            'Jorge_Nava'         => 'Jorge Nava Vinte',
            'Cesar_Badillo'      => 'César Arturo Badillo Martinez',
            'Ramon_Bautista'     => 'Ramón Bautista Rodríguez',
            'Otoniel_Perez'      => 'Otoniel Pérez Moreno',
            'Edgar_Gomez'        => 'Edgar Gomez García',
            'Erick_Herrera'      => 'Erick Herrera Chávez',
            'Adrian_Isidro'      => 'Adrián Isidro Lopéz',
            'Raquel_Aguilar'     => 'Raquel Aguilar Rodríguez',
            'Angelica_Gonzalez'  => 'Angélica Gonzalez Santos',
            'Ricardo_Macias'     => 'Ricardo Macías Vargas',
            'Victor_Alonso'      => 'Victor Esteban Alonso Garcia',
            'Angel_Perez'        => 'Angel David Perez Rueda',
            'Alejandra_Monroy'   => 'Alejandra Guadalupe Monroy Campos',
            'Tania_Canales'      => 'Tania Iran Canales Hernandez',
            'Mireidy_Yanes'      => 'Mireidy Yanes Reyes',
            'Abigail_Rodriguez'  => 'Abigail Rodriguez Perez',
            'Jesus_Pena'         => 'Jesus Pena',
        ];

        foreach ($userUpdates as $username => $nombreCompleto) {
            DB::table('usuarios')
                ->where('usuario', $username)
                ->orWhere('nombre_completo', 'like', '%' . strtok($nombreCompleto, ' ') . '%')
                ->update([
                    'nombre_completo' => $nombreCompleto,
                    'fecha_actualizacion' => $now
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
    }
};
