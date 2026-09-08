<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $users = [
            ['id' => 57, 'nombre_completo' => 'Enrique Hernandez Hernandez', 'usuario' => 'Enrique_Hernandez', 'contrasena' => 'HHE_A26'],
            ['id' => 44, 'nombre_completo' => 'Luis Ángel Vargas Gutiérrez', 'usuario' => 'Luis_Vargas', 'contrasena' => 'VGL_A26'],
            ['id' => 42, 'nombre_completo' => 'Jeanet García Chávez', 'usuario' => 'Jeanet_Garcia', 'contrasena' => 'GCJ_A26'],
            ['id' => 43, 'nombre_completo' => 'Israel Moreno Gómez', 'usuario' => 'Israel_Moreno', 'contrasena' => 'MGI_A26'],
            ['id' => 39, 'nombre_completo' => 'Humberto Cabrera Román', 'usuario' => 'Humberto_Cabrera', 'contrasena' => 'CRH_L26'],
            ['id' => 40, 'nombre_completo' => 'Miguel Ángel Monzalvo Muñoz', 'usuario' => 'Miguel_Monzalvo', 'contrasena' => 'MMM_L26'],
            ['id' => 41, 'nombre_completo' => 'José Alberto Montiel Balderrama', 'usuario' => 'Jose_Montiel', 'contrasena' => 'MBJ_L26'],
            ['id' => 31, 'nombre_completo' => 'Omar Avilés Lugo', 'usuario' => 'Omar_Aviles', 'contrasena' => 'ALO_CD26'],
            ['id' => 48, 'nombre_completo' => 'Iván Martínez Acosta', 'usuario' => 'Ivan_Martinez', 'contrasena' => 'MAI_CD26'],
            ['id' => 35, 'nombre_completo' => 'Bacilio Tapia Padilla', 'usuario' => 'Bacilio_Tapia', 'contrasena' => 'TPB_DD26'],
            ['id' => 34, 'nombre_completo' => 'César Jiménez', 'usuario' => 'Cesar_Jimenez', 'contrasena' => 'JC_DD26'],
            ['id' => 36, 'nombre_completo' => 'Fausto Valdez Téllez', 'usuario' => 'Fausto_Valdez', 'contrasena' => 'VTF_DD26'],
            ['id' => 37, 'nombre_completo' => 'Fernando Ramos Lira', 'usuario' => 'Fernando_Ramos', 'contrasena' => 'RLF_DD26'],
            ['id' => 32, 'nombre_completo' => 'Guadalupe Santos Callejas', 'usuario' => 'Guadalupe_Santos', 'contrasena' => 'SCG_DD26'],
            ['id' => 33, 'nombre_completo' => 'Marino Román Velázquez', 'usuario' => 'Marino_Roman', 'contrasena' => 'RVM_DD26'],
            ['id' => 50, 'nombre_completo' => 'Miguel Odón', 'usuario' => 'Miguel_Odon', 'contrasena' => 'OM_DD26'],
            ['id' => 49, 'nombre_completo' => 'Jairo Jared Jiménez Ramírez', 'usuario' => 'Jairo_Jimenez', 'contrasena' => 'JRJ_DD26'],
            ['id' => 56, 'nombre_completo' => 'Otoniel Pérez Moreno', 'usuario' => 'Otoniel_Perez', 'contrasena' => 'PMO_ME26'],
            ['id' => 55, 'nombre_completo' => 'Erick Herrera Chávez', 'usuario' => 'Erick_Herrera', 'contrasena' => 'HCE_ME26'],
            ['id' => 52, 'nombre_completo' => 'Diana Karina Vázquez García', 'usuario' => 'Diana_Vazquez', 'contrasena' => 'VGD_ME26'],
            ['id' => 51, 'nombre_completo' => 'Bonifacio Alpizar López', 'usuario' => 'Bonifacio_Alpizar', 'contrasena' => 'ALB_ME26'],
            ['id' => 53, 'nombre_completo' => 'Emilio Corona Montufar', 'usuario' => 'Emilio_Corona', 'contrasena' => 'CME_ME26'],
            ['id' => 45, 'nombre_completo' => 'Daniel Luna Cortez', 'usuario' => 'Daniel_Luna', 'contrasena' => 'LCD_PY26'],
            ['id' => 46, 'nombre_completo' => 'Mario Alejandro Lazcano Aguilar', 'usuario' => 'Mario_Lazcano', 'contrasena' => 'LAM_PY26'],
            ['id' => 47, 'nombre_completo' => 'Jorge Leal Ramírez', 'usuario' => 'Jorge_Leal', 'contrasena' => 'LRJ_PY26'],
            ['id' => 59, 'nombre_completo' => 'Angel David Perez Rueda', 'usuario' => 'Angel_Perez', 'contrasena' => 'PRA_DD26'],
            ['id' => 60, 'nombre_completo' => 'Raquel Aguilar Rodriguez', 'usuario' => 'Raquel_Aguilar', 'contrasena' => 'ARR_CC26'],
            ['id' => 61, 'nombre_completo' => 'Ramon Bautista Rodriguez', 'usuario' => 'Ramon_Bautista', 'contrasena' => 'BRR_ME26'],
            ['id' => 63, 'nombre_completo' => 'Karen Guadalupe Rodriguez Blanco', 'usuario' => 'Karen_Rodriguez', 'contrasena' => 'RBK_ME26'],
            ['id' => 64, 'nombre_completo' => 'Adrian Isidro Lopez', 'usuario' => 'Adrian_Isidro', 'contrasena' => 'ILA_ME26'],
            ['id' => 68, 'nombre_completo' => 'Alejandra Guadalupe Monroy Campos', 'usuario' => 'Alejandra_Monroy', 'contrasena' => 'MCA_MC26'],
            ['id' => 69, 'nombre_completo' => 'Tania Iran Canales Hernandez', 'usuario' => 'Tania_Canales', 'contrasena' => 'CHT_MC26'],
            ['id' => 66, 'nombre_completo' => 'Mireidy Yanes Reyes', 'usuario' => 'Mireidy_Yanes', 'contrasena' => 'YRM_MC26'],
            ['id' => 67, 'nombre_completo' => 'Abigail Rodriguez Perez', 'usuario' => 'Abigail_Rodriguez', 'contrasena' => 'RPA_MC26'],
            ['id' => 58, 'nombre_completo' => 'Jesus Pena', 'usuario' => 'Jesus_Pena', 'contrasena' => 'PJ_A26'],
            ['id' => 70, 'nombre_completo' => 'Jorge Nava Vinte', 'usuario' => 'Jorge_Nava', 'contrasena' => 'NVJ_ME26'],
            ['id' => 71, 'nombre_completo' => 'Cesar Arturo Badillo Martinez', 'usuario' => 'Cesar_Badillo', 'contrasena' => 'BMC_ME26'],
            ['id' => 72, 'nombre_completo' => 'Edgar Gomez Garcia', 'usuario' => 'Edgar_Gomez', 'contrasena' => 'GGE_ME26'],
        ];

        foreach ($users as $u) {
            DB::table('usuarios')->where('id', $u['id'])->update([
                'nombre_completo' => $u['nombre_completo'],
                'usuario' => $u['usuario'],
                'contrasena' => Hash::make($u['contrasena']),
                'updated_at' => now(),
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
