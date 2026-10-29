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
        if (Schema::hasTable('rutas') && !Schema::hasColumn('rutas', 'descripcion')) {
            Schema::table('rutas', function (Blueprint $table) {
                $table->string('descripcion', 150)->nullable()->after('tipo');
            });
        }

        // Sembrar descripciones oficiales si están vacías
        $descripciones = [
            'T01' => 'T-01 Exprés (Téllez - Plaza Juárez)',
            'T02' => 'T-02 Exprés (Téllez - Prepa 1)',
            'T04' => 'T-04 Exprés (Téllez - Matilde - Centro)',
            'T05' => 'T-05 Parador (Téllez - Centro)',
            '1'   => '1 Alimentadora',
            '1A'  => '1A Matilde Ida',
            '1B'  => '1B Matilde Regreso',
            '2'   => '2 Alimentadora',
            '2A'  => '2A San Alfonso - Matilde',
            '2B'  => '2B Fracc. Villa Fontana - Jagüey T.',
            '2D'  => '2D Priv. Portobello - Téllez',
            '2E'  => '2E Cetram Téllez - Amores de Don Juan',
            '3'   => '3 Real de Toledo - Efrén Rebolledo',
            '4'   => '4 Fracc. Lomas de Plata - T. Edad',
            '4A'  => '4A Fracc. Lomas de Plata - T. Edad',
            '4B'  => '4B Alimentadora',
            '5'   => '5 Parque Urbano - E. Mexicano',
            '6'   => '6 Hogares Unión - E. Mexicano',
            '7'   => '7 Rancho La Colonia - E. F. Ángeles',
            '8'   => '8 Los Tuzos - E. Juan C. Doria',
            '9'   => '9 Pitahayas - E. C. Justicia',
            '10'  => '10 Paseo de Camelinas - E. C. Justicia',
            '11'  => '11 El Huixmí - E. C. Justicia',
            '12'  => '12 La Colonia - E. Juan C. Doria',
            '13'  => '13 El Venado - E. Hospitales',
            '14'  => '14 San Pedro Nopalcalco - E. Bicentenario',
            '15A' => '15A La Loma - Central de Autobuses',
            '15B' => '15B Abetos - E. C. de Autobuses',
            '15C' => '15C Fracc. Colosio - E. C. de Autobuses',
            '16'  => '16 San Carlos - E. Zona Plateada',
            '17'  => '17 Tezontle - Av. Universidad',
            '19'  => '19 Parque de Poblamiento 1 y 2',
            '20B' => '20B Ruta Incluyente Poniente - Oriente',
        ];

        foreach ($descripciones as $cod => $desc) {
            DB::table('rutas')
                ->where('ruta', (string) $cod)
                ->where(function ($q) {
                    $q->whereNull('descripcion')->orWhere('descripcion', '');
                })
                ->update(['descripcion' => $desc]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('rutas') && Schema::hasColumn('rutas', 'descripcion')) {
            Schema::table('rutas', function (Blueprint $table) {
                $table->dropColumn('descripcion');
            });
        }
    }
};
