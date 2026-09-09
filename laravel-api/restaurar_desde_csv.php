<?php

// Script para restaurar la tabla 'informacion_operativa' usando el archivo CSV proporcionado.

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=========================================================\n";
echo "Iniciando restauracion desde archivo CSV...\n";
echo "=========================================================\n";

$csvData = <<<CSV
TIPO;ECO;RUTA;TARJETON;CONDUCTOR;CORRIDAS FALTANTES;CICLO PERDIDO;MOTIVO DE FALTANTE;ESTATUS FINAL
ORION;401;20B;001;ORAN AZPEITIA JÉSUS ;4;;;operacion
ORION;402;;;SIN ASIGNAR;;;;reserva
ORION;403;20B;069;NIETO FLORES MIGUEL ÁNGEL ;6;;;operacion
ORION;404;;;SIN ASIGNAR;;;;reserva
ORION;405;20B;084;MARTÍNEZ ARISTA FERMIN ;7;;;operacion
ORION;406;20B;123;HERNÁNDEZ REYES JAVIER ;5;;;operacion
ORION;407;;;SIN ASIGNAR;;;;reserva
ORION;408;;;SIN ASIGNAR;;;;reserva
URBANUSS;001;T05;0556;AVILES JUARICO MIGUEL ÁNGEL;9;;;operacion
URBANUSS;002;T01;0165;ZAMORA VARGAS EDGAR RICARDO;9;;;operacion
URBANUSS;003;T05;0044;ARTEMIO DOLORES LÓPEZ;5;;;operacion
URBANUSS;004;T05;0087;PÉREZ RUÍZ DAVID;4;;;percance
URBANUSS;005;T02;0844;VIVEROS GARCÍA DANIEL;5;;;operacion
URBANUSS;006;T01;0178;NARANJO RAMÍREZ JOSÉ ENRIQUE;6;;;operacion
URBANUSS;007;T05;0077;VALENCIA DORANTES JOAQUIN;8;;;operacion
URBANUSS;008;T05;0401;VEGA QUIJANO VICTOR GABRIEL;2;;;percance
URBANUSS;009;T02;0919;ARAGÓN GALVÁN ÁNGEL ROMAN;1;;;operacion
URBANUSS;010;T05;0602;LABASTIDA GARCÍA ROBERTO ISRRAEL;11;;;operacion
URBANUSS;011;T02;0095;ISLAS MENESES ELOY;3;;;operacion
URBANUSS;012;T05;0024;AGUSTÍN CABAÑAS GARCÍA;13;;;operacion
URBANUSS;013;;;SIN ASIGNAR;;;;reserva
URBANUSS;014;T01;0820;LORA MARTÍNEZ MARGARITA;3;;;operacion
URBANUSS;015;T02;0463;TORRES MORENO MIGUEL ÁNGEL;6;;;percance
URBANUSS;016;T04;0086;ZUÑIGA OLMOS OSCAR ANDRÉS;4;;;operacion
URBANUSS;017;T04;013;ESPINOZA ORTIZ JULIO IVÁN ;6;;;operacion
URBANUSS;018;T05;0392;LEAL ORTIZ ALDO ISAAC;10;;;operacion
URBANUSS;019;T01;0821;HERRERA ROMERO EDGAR;1;;;operacion
URBANUSS;020;T01;0188;LANGO AVILEZ ISRAEL;2;;;operacion
URBANUSS;021;T02;0129;IBARRA PERALES ALFREDO;2;;;operacion
URBANUSS;022;T01;0009;ISLAS CASTRO GUILLERMO;7;0.5;ACCIDENTE;operacion
URBANUSS;023;;;SIN ASIGNAR;;;;reserva
URBANUSS;024;T05;0057;GUTIÉRREZ HIDALGO OSCAR;14;;;operacion
URBANUSS;025;T04;0052;SÁNCHEZ UBALDO JUAN GERMÁN;2;;;operacion
URBANUSS;026;T01;0151;SÁNCHEZ LEÓN JUAN MANUEL;8;;;operacion
URBANUSS;027;T01;0448;AMADOR JIMÉNEZ JOSUE;4;;;operacion
URBANUSS;028;T04;0389;PÉREZ BAÑOS PEDRO JAVIER;5;;;operacion
URBANUSS;029;T05;008;SANTILLAN VÁZQUEZ GLADIS ;6;;;operacion
URBANUSS;030;;;SIN ASIGNAR;;;;reserva
URBANUSS;031;T01;0189;LEÓN CARRILLO ENRIQUE;5;;;operacion
URBANUSS;032;T05;0370;ÁLVAREZ HERNÁNDEZ MANUEL;3;;;operacion
URBANUSS;033;T05;020;BONILLA CABAÑAS ALEJANDRO ;7;;;operacion
URBANUSS;034;;;SIN ASIGNAR;;;;reserva
URBANUSS;035;T05;048;PALOMINO HERNÁNDEZ JOSÉ ROBERTO ;12;2;CONDICIONES CLIMATICAS;operacion
URBANUSS;036;T01;0080;NORIEGA ORTEGA RAFAEL;10;;;operacion
URBANUSS;037;T05;0143;ISLAS FLORES JOSÉ;1;;;operacion
URBANUSS;038;T04;038;HERNÁNDEZ ALCIBAR FRANCISCO ;3;;;operacion
URBANUSS;039;T02;036;GARCÍA CANO ERNESTO ;4;;;operacion
URBANUSS;040;T04;0800;SÁNCHEZ LAZO LUIS EDUARDO;8;;;operacion
URBANUSS;041;T04;0110;SÁNCHEZ BAUTISTA ERNESTO;7;;;operacion
URBANUSS;042;T04;0452;CABRERA LAZCANO GUADALUPE;1;;;operacion
VAGONETA;200;19;1039;ISLAS HERNÁNDEZ RICARDO ;4;;;operacion
VAGONETA;201;;;SIN ASIGNAR;;;;reserva
VAGONETA;202;;;SIN ASIGNAR;;;;reserva
VAGONETA;203;19;1016;LÓPEZ GARCÍA MICHEL ;5;;;operacion
VAGONETA;204;4A;058;ANAYA AVILÉS OSCAR ;1;;;operacion
VAGONETA;205;;;SIN ASIGNAR;;;;reserva
VAGONETA;206;17;948;COLCHADO MARTÍNEZ ERWIN FROILAN ;7;;;operacion
VAGONETA;207;14;629;LOYDE MARTÍNEZ ROSALÍO ;3;;;operacion
VAGONETA;208;1A;735;ISLAS GARCÍA ELISEO ;1;;;operacion
VAGONETA;209;1B;917;SILVA LÓPEZ DAVID ;1;;;operacion
VAGONETA;210;2E;846;MANZANARES CHÁVEZ ERIK SAMAR ;2;;;operacion
VAGONETA;211;2E;909;MARTÍNEZ MIGUEL FABIAN ;3;;;operacion
VAGONETA;212;;;SIN ASIGNAR;;;;reserva
VAGONETA;213;4A;946;CABRERA RAMOS SERGIO ;2;;;operacion
VAGONETA;214;4A;515;LÓPEZ GARCÍA LUIS FERNANDO ;3;;;operacion
VAGONETA;215;3;998;MARTÍNEZ DELGADO GERARDO ;3;;;operacion
VAGONETA;216;2E;925;PAZ GÓMEZ RUTH ISABEL ;1;;;operacion
VAGONETA;217;;;SIN ASIGNAR;;;;mantenimiento
VAGONETA;218;6;1004;MORALES ONESTO RODRIGO DE JESÚS ;1;;;operacion
VAGONETA;219;5;884;MORENO HERNÁNDEZ BRAYAN JESÚS ;2;;;operacion
VAGONETA;220;3;1010;HERNÁNDEZ PEÑA JUAN CARLOS ;5;;;operacion
VAGONETA;221;13;1006;GARCÍA MARTÍNEZ LUIS ;1;;;operacion
VAGONETA;222;14;991;FLORES MIRANDA ADRIÁN ;1;;;operacion
VAGONETA;223;7;192;MORENO OLVERA PATRICIO ;1;;;operacion
VAGONETA;224;15C;1085;CASTILLO JAIME JUAN CARLOS ;1;;;operacion
VAGONETA;225;9;940;CEBADA RIVERA JUAN CARLOS ;1;;;operacion
VAGONETA;226;17;958;BALDERAS DOMÍNGUEZ MARIA DE LA LUZ ;1;;;operacion
VAGONETA;227;10;359;MONZALVO REYES OSCAR ;1;;;operacion
VAGONETA;228;17;994;TURLAY SÁNCHEZ ALEXIS ALBERTO ;4;;;operacion
VAGONETA;229;12;899;GARCÍA VARGAS EDGAR ;1;;;operacion
VAGONETA;230;12;646;ORTIZ SEGURA FELIPE HUMBERTO ;2;;;operacion
VAGONETA;231;13;649;CORTÉS TOVAR ANDRÉS ;2;;;operacion
VAGONETA;232;17;1055;TREJO PÉREZ GUSTAVO ;5;;;operacion
VAGONETA;233;19;1030;MARTINEZ ARIAS GERONIMO ;2;;;operacion
VAGONETA;234;19;1043;SANTILLAN HERNÁNDEZ ADRIAN ;3;;;operacion
VAGONETA;235;10;1079;ARELLANO GALVEZ GABRIEL TONATIUH ;2;;;operacion
VAGONETA;236;14;939;APODACA CORNELIO FRANCISCO JAVIER ;4;;;operacion
VAGONETA;237;;;SIN ASIGNAR;;;;reserva
VAGONETA;238;;;SIN ASIGNAR;;;;reserva
VAGONETA;239;7;1049;CARMONA HERNÁNDEZ CRISTINA ;2;;;operacion
VAGONETA;240;13;915;ISLAS MORALES NOHELIA ;3;;;operacion
VAGONETA;241;5;1022;HERNÁNDEZ ROSALES ESTEBAN ;1;;;operacion
VAGONETA;242;;;SIN ASIGNAR;;;;reserva
VAGONETA;243;13;953;CUELLAR CAMARGO RICARDO ISRAEL ;4;;;operacion
VAGONETA;244;3;1002;BLANCAS LÓPEZ LEONARDO ;4;;;operacion
VAGONETA;245;14;671;GARCÍA LÓPEZ EDUARDO ;2;;;operacion
VAGONETA;246;4A;1078;GRANADOS CASTILLO FRANCISCO ;4;;;operacion
VAGONETA;247;;;SIN ASIGNAR;;;;reserva
VAGONETA;248;14;944;HERNÁNDEZ ORDUÑA ROBERTO JAVIER ;5;;;operacion
VAGONETA;249;3;1009;MEJIA BAUTISTA TANIA YANEL ;1;;;operacion
VAGONETA;250;3;996;MONROY SANTIAGO ADOLFO CÉSAR ;2;;;operacion
VAGONETA;251;14;021;HERNÁNDEZ BOJORQUEZ GILBERTO ;6;;;operacion
VAGONETA;252;15C;854;BAUTISTA GARCÍA JOSÉ ;2;;;operacion
VAGONETA;253;15C;1070;MARTÍNEZ PÉREZ ANGEL OSVALDO ;3;;;operacion
VAGONETA;254;15C;911;SÁNCHEZ LÓPEZ JUAN MARCOS ;4;;;operacion
VAGONETA;255;9;1015;FLORES ISLAS RICARDO ;2;;;operacion
VAGONETA;256;16;952;JIMÉNEZ HERNÁNDEZ EDGAR ;1;;;operacion
VAGONETA;257;17;861;CHIPOLINI DÁVALOS NORMA ANGELICA ;2;;;operacion
VAGONETA;258;17;186;GONZALEZ HERNANDEZ EDUARDO ;6;;;operacion
VAGONETA;259;17;1005;GONZÁLEZ BOBADILLA JUAN ALEJANDRO ;3;;;operacion
ZAFIRO;100;15B;0005;EFRAÍN BAUTISTA BAUTISTA;3;;;operacion
ZAFIRO;101;2D;1046;MARRÓN RAMOS ABRAHAM ;4;;;operacion
ZAFIRO;102;;;SIN ASIGNAR;;;;reserva
ZAFIRO;103;20B;0795;BECERRIL OLVERA ELEAZAR;2;;;operacion
ZAFIRO;104;11;0927;BAUTISTA SECUNDINO SAMUEL;1;;;operacion
ZAFIRO;105;11;0928;MUÑOZ DANIEL JOSÉ LUIS;4;;;operacion
ZAFIRO;106;2A;0715;JAEN PEÑA UVALDO;1;;;operacion
ZAFIRO;107;8;0883;BAUTISTA ALMARAZ LUIS YAMIL;1;;;operacion
ZAFIRO;108;2D;1065;QUIROZ AGUIRRE VICTOR MANUEL ;2;;;operacion
ZAFIRO;109;2A;0737;MARTINEZ VERONICA JULIAN;2;;;operacion
ZAFIRO;110;;;SIN ASIGNAR;;;;reserva
ZAFIRO;111;2B;0974;LÓPEZ FLORES RICARDO;4;;;operacion
ZAFIRO;112;2B;0805;ORTEGA HERNÁNDEZ JOSÉ ANDRÉS;5;;;operacion
ZAFIRO;113;2D;0695;BAUTISTA HERNÁNDEZ JOSÉ SANTIAGO;3;;;operacion
ZAFIRO;114;8;0957;LÓPEZ RODRÍGUEZ OMAR;2;;;operacion
ZAFIRO;115;8;0930;ZAVALA DELGADILLO MARCO ANTONIO;3;;;operacion
ZAFIRO;116;8;0921;MORA JOHN JAIRO;4;;;operacion
ZAFIRO;117;8;0845;VÁZQUEZ PÉREZ ÁNGEL;5;;;operacion
ZAFIRO;118;11;889;PÉREZ SÁNCHEZ MIGUEL ;2;;;operacion
ZAFIRO;119;2A;897;RECENDIZ CANTORAN ALDAIR ;4;;;operacion
ZAFIRO;120;2B;971;ENRIQUEZ CASIANO DANIEL ;1;;;operacion
ZAFIRO;121;2A;0718;VEGA MARQUEZ JOSE DANIEL;5;;;operacion
ZAFIRO;122;20B;014;CERON MORALES MATIAS ;3;;;operacion
ZAFIRO;123;20B;848;LUCAS MARTÍNEZ MARIANO ;8;;;operacion
ZAFIRO;124;15A;956;CASTAÑEDA CALVA FABIAN ANTONIO ;2;;;operacion
ZAFIRO;125;15A;581;PÉREZ BUTANDA FERNANDO ;1;;;operacion
ZAFIRO;126;2B;923;ROJAS ZAMORA MIGUEL ÁNGEL ;2;;;operacion
ZAFIRO;127;15B;978;DURÁN FLORES MARIANO ;2;;;operacion
ZAFIRO;128;2B;061;MONZALVO HERNÁNDEZ SANTIAGO ;3;;;operacion
ZAFIRO;129;6;926;GARCÍA HERNÁNDEZ ERNESTO ROGELIO ;2;;;operacion
ZAFIRO;130;2A;745;ARMAS ALVARADO OSCAR MARIO ;3;;;operacion
ZAFIRO;131;20B;1041;CLEMENTE SANCHEZ JOSÉ ALFREDO ;1;;;operacion
ZAFIRO;132;15A;941;GONZÁLEZ CRUZ JUAN MANUEL ;4;;;operacion
ZAFIRO;133;6;1019;HERNÁNDEZ REYES VICTOR JAVIER ;3;;;operacion
ZAFIRO;134;2D;1018;RAYA ROBLES JAIME ;1;;;operacion
ZAFIRO;135;11;010;ESCUDERO LARA JOEL ;3;;;operacion
ZAFIRO;136;15A;0725;ROMERO ESPINOSA LUIS ÁNGEL;3;;;operacion
ZAFIRO;137;15B;100;GUTIÉRREZ LUGO ARMANDO ;1;;;operacion
CSV;

try {
    DB::beginTransaction();

    // 1. Limpiar informacion_operativa actual
    echo "Limpiando la tabla informacion_operativa actual...\n";
    DB::table('informacion_operativa')->delete();

    $lines = explode("\n", trim($csvData));
    array_shift($lines); // Omitir el encabezado

    $inserted = 0;
    $errores = [];
    $tarjetones = [];

    foreach ($lines as $line) {
        if (empty(trim($line))) continue;
        $data = explode(";", $line); // Es separado por punto y coma (;)
        
        $tipo = trim($data[0] ?? '');
        $numero_economico = trim($data[1] ?? '');
        $ruta = trim($data[2] ?? '');
        $tarjeton = trim($data[3] ?? '');
        $conductor = trim($data[4] ?? '');
        $corridas = trim($data[5] ?? '');
        $ciclo = trim($data[6] ?? '');
        $motivo = trim($data[7] ?? '');
        $estatus = trim($data[8] ?? '');

        if (!$numero_economico) continue;

        $unidad = DB::table('unidades')->where('numero_eco', $numero_economico)->first();
        
        if ($unidad) {
            DB::table('informacion_operativa')->insert([
                'unidad_id' => $unidad->id,
                'tipo' => $tipo,
                'estatus' => $estatus ?: 'operacion',
                'ruta' => $ruta,
                'numero_tarjeton' => $tarjeton,
                'nombre_conductor' => $conductor === 'SIN ASIGNAR' ? null : $conductor,
                'corridas' => is_numeric($corridas) ? (int)$corridas : null,
                'ciclo' => $ciclo,
                'motivo_estatus' => $motivo, // MOTIVO DE FALTANTE
                'fecha_registro' => now()
            ]);
            $inserted++;

            if (!empty($tarjeton) && $conductor !== 'SIN ASIGNAR') {
                $tarjetones[] = $tarjeton;
            }
        } else {
            $errores[] = "No se encontró la unidad con económico: $numero_economico";
        }
    }

    // 2. Actualizar estatus de conductores
    echo "Actualizando estatus de los conductores asignados...\n";
    DB::table('conductores')->update(['estado_servicio' => 'disponible']);
    
    if (count($tarjetones) > 0) {
        DB::table('conductores')
            ->whereIn('tarjeton', array_unique($tarjetones))
            ->update(['estado_servicio' => 'en_servicio']);
    }

    DB::commit();
    echo "=========================================================\n";
    echo "¡RESTAURACION COMPLETADA CON EXITO!\n";
    echo "Registros importados exitosamente: $inserted\n";
    if (count($errores) > 0) {
        echo "Advertencias:\n";
        foreach ($errores as $error) {
            echo "- $error\n";
        }
    }
    echo "=========================================================\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "ERROR FATAL: " . $e->getMessage() . "\n";
    exit(1);
}
