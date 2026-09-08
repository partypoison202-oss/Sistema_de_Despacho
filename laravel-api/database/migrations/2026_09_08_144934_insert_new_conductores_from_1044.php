<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    public function up()
    {
        $conductores = [
            ['tarjeton' => '1045', 'nombres' => 'ACAXTENCO MORGADO JOSÉ', 'tipo_tarjeton' => 'C', 'estatus' => 'Activo'],
            ['tarjeton' => '1061', 'nombres' => 'ANAYA MEJIA JULIO CÉSAR', 'tipo_tarjeton' => 'B', 'estatus' => 'Activo'],
            ['tarjeton' => '1079', 'nombres' => 'ARELLANO GALVEZ GABRIEL TONATIUH', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1050', 'nombres' => 'BAÑOS ZARCO EMILIO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1082', 'nombres' => 'BARRERA POZOS JORGE', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1049', 'nombres' => 'CARMONA HERNÁNDEZ CRISTINA', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1063', 'nombres' => 'CASTAÑEDA BAUTISTA LUIS YOVANI', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1085', 'nombres' => 'CASTILLO JAIME JUAN CARLOS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1051', 'nombres' => 'CAZARES BENITEZ GABRIEL RAFAEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1073', 'nombres' => 'CENTENO TAVAREZ DIANA LAURA OLIVIA', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1056', 'nombres' => 'CERVANTES PONCE IVÁN RAFAEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1068', 'nombres' => 'CRUZ HERNÁNDEZ ALFONSO DE JESÚS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1047', 'nombres' => 'DIAZ DE LEON RIVERA ALFREDO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1069', 'nombres' => 'GARCÍA ISLAS ANGEL DE JESÚS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1087', 'nombres' => 'GARCÍA LORA VICTOR HUGO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1052', 'nombres' => 'GARCÍA OREYA GIL ARATH', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1044', 'nombres' => 'GARCÍA SERRANO JOSÉ ISMAEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1078', 'nombres' => 'GRANADOS CASTILLO FRANCISCO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1091', 'nombres' => 'GUZMAN SÁNCHEZ JOSÉ ROBERTO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1066', 'nombres' => 'HERNÁNDEZ RODRIGUEZ ALAN RODRIGO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1077', 'nombres' => 'JUÁREZ RODRIGUEZ ESTEBAN', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1080', 'nombres' => 'LANGO VARGAS HECTOR JAVIER', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1067', 'nombres' => 'LEON ZARAZUA ALBERTO JAFET', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1058', 'nombres' => 'LICONA LOPEZ JOSÉ ALEJANDRO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1084', 'nombres' => 'LOPEZ LEMUS JOSÉ', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1046', 'nombres' => 'MARRÓN RAMOS ABRAHAM', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1070', 'nombres' => 'MARTÍNEZ PÉREZ ANGEL OSVALDO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1088', 'nombres' => 'MENDOZA GONZÁLEZ YAIR DE JESÚS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1064', 'nombres' => 'NUÑEZ LOPEZ OMAR ANTONIO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1075', 'nombres' => 'ORDOÑEZ CARBALLIDO ENRIQUE', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1083', 'nombres' => 'PALMA NUÑEZ JOSÉ ENRIQUE', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1059', 'nombres' => 'PALOMO HERNÁNDEZ JOSÉ DAVID', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1072', 'nombres' => 'PEDRAZA GUADARRAMA AZAREEL ANTONIO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1065', 'nombres' => 'QUIROZ AGUIRRE VICTOR MANUEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1060', 'nombres' => 'RAMIREZ ESTRADA JOSÉ LUIS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1057', 'nombres' => 'REYES VILLEGAS JAIRZINO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1090', 'nombres' => 'ROAN TORRES JOSÉ LUIS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1089', 'nombres' => 'ROJAS RIOS EDGAR EDUARDO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1062', 'nombres' => 'ROMERO GUTIÉRREZ LUIS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1071', 'nombres' => 'ROMERO HERNÁNDEZ ARTURO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1054', 'nombres' => 'SAN JUAN ISLAS GUSTAVO IRVIN', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1081', 'nombres' => 'SAN JUAN SANJUAN JESÚS MIGUEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1086', 'nombres' => 'TOLEDO CHAZARO SAJID JOSHUA', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1076', 'nombres' => 'TORRES DOMÍNGUEZ ERNESTO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1055', 'nombres' => 'TREJO PÉREZ GUSTAVO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1053', 'nombres' => 'VÁZQUEZ ARTEAGA GUILLERMO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1074', 'nombres' => 'ZAPATA CHÁVEZ ELEAZAR', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
        ];
        
        $now = Carbon::now();
        
        foreach ($conductores as $c) {
            DB::table('conductores')->updateOrInsert(
                ['tarjeton' => $c['tarjeton']],
                [
                    'nombres' => $c['nombres'],
                    'apellidos' => '',
                    'tipo_tarjeton' => $c['tipo_tarjeton'],
                    'estatus' => $c['estatus'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }

    public function down()
    {
        $tarjetones = array_map(function($c) { return $c['tarjeton']; }, [
            ['tarjeton' => '1045', 'nombres' => 'ACAXTENCO MORGADO JOSÉ', 'tipo_tarjeton' => 'C', 'estatus' => 'activo'],
            ['tarjeton' => '1061', 'nombres' => 'ANAYA MEJIA JULIO CÉSAR', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1079', 'nombres' => 'ARELLANO GALVEZ GABRIEL TONATIUH', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1050', 'nombres' => 'BAÑOS ZARCO EMILIO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1082', 'nombres' => 'BARRERA POZOS JORGE', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1049', 'nombres' => 'CARMONA HERNÁNDEZ CRISTINA', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1063', 'nombres' => 'CASTAÑEDA BAUTISTA LUIS YOVANI', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1085', 'nombres' => 'CASTILLO JAIME JUAN CARLOS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1051', 'nombres' => 'CAZARES BENITEZ GABRIEL RAFAEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1073', 'nombres' => 'CENTENO TAVAREZ DIANA LAURA OLIVIA', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1056', 'nombres' => 'CERVANTES PONCE IVÁN RAFAEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1068', 'nombres' => 'CRUZ HERNÁNDEZ ALFONSO DE JESÚS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1047', 'nombres' => 'DIAZ DE LEON RIVERA ALFREDO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1069', 'nombres' => 'GARCÍA ISLAS ANGEL DE JESÚS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1087', 'nombres' => 'GARCÍA LORA VICTOR HUGO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1052', 'nombres' => 'GARCÍA OREYA GIL ARATH', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1044', 'nombres' => 'GARCÍA SERRANO JOSÉ ISMAEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1078', 'nombres' => 'GRANADOS CASTILLO FRANCISCO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1091', 'nombres' => 'GUZMAN SÁNCHEZ JOSÉ ROBERTO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1066', 'nombres' => 'HERNÁNDEZ RODRIGUEZ ALAN RODRIGO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1077', 'nombres' => 'JUÁREZ RODRIGUEZ ESTEBAN', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1080', 'nombres' => 'LANGO VARGAS HECTOR JAVIER', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1067', 'nombres' => 'LEON ZARAZUA ALBERTO JAFET', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1058', 'nombres' => 'LICONA LOPEZ JOSÉ ALEJANDRO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1084', 'nombres' => 'LOPEZ LEMUS JOSÉ', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1046', 'nombres' => 'MARRÓN RAMOS ABRAHAM', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1070', 'nombres' => 'MARTÍNEZ PÉREZ ANGEL OSVALDO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1088', 'nombres' => 'MENDOZA GONZÁLEZ YAIR DE JESÚS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1064', 'nombres' => 'NUÑEZ LOPEZ OMAR ANTONIO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1075', 'nombres' => 'ORDOÑEZ CARBALLIDO ENRIQUE', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1083', 'nombres' => 'PALMA NUÑEZ JOSÉ ENRIQUE', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1059', 'nombres' => 'PALOMO HERNÁNDEZ JOSÉ DAVID', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1072', 'nombres' => 'PEDRAZA GUADARRAMA AZAREEL ANTONIO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1065', 'nombres' => 'QUIROZ AGUIRRE VICTOR MANUEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1060', 'nombres' => 'RAMIREZ ESTRADA JOSÉ LUIS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1057', 'nombres' => 'REYES VILLEGAS JAIRZINO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1090', 'nombres' => 'ROAN TORRES JOSÉ LUIS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1089', 'nombres' => 'ROJAS RIOS EDGAR EDUARDO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1062', 'nombres' => 'ROMERO GUTIÉRREZ LUIS', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1071', 'nombres' => 'ROMERO HERNÁNDEZ ARTURO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1054', 'nombres' => 'SAN JUAN ISLAS GUSTAVO IRVIN', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1081', 'nombres' => 'SAN JUAN SANJUAN JESÚS MIGUEL', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1086', 'nombres' => 'TOLEDO CHAZARO SAJID JOSHUA', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1076', 'nombres' => 'TORRES DOMÍNGUEZ ERNESTO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1055', 'nombres' => 'TREJO PÉREZ GUSTAVO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1053', 'nombres' => 'VÁZQUEZ ARTEAGA GUILLERMO', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
            ['tarjeton' => '1074', 'nombres' => 'ZAPATA CHÁVEZ ELEAZAR', 'tipo_tarjeton' => 'B', 'estatus' => 'activo'],
        ]);
        DB::table('conductores')->whereIn('tarjeton', $tarjetones)->delete();
    }
};
