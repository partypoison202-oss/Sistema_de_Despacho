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
        if (!Schema::hasTable('reportes_titan')) {
            Schema::create('reportes_titan', function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->foreignId('usuario_id')->constrained('usuarios');
                $table->string('intervalo')->nullable();
                $table->text('observaciones')->nullable();
                $table->string('tipo_evento'); // DESINCORPORACION, INCORPORACION, ACCIDENTE
                $table->string('corrida')->nullable();
                $table->string('hora_evento')->nullable();
                $table->string('ubicacion_gps')->nullable();
                $table->text('motivo_desincorporacion')->nullable();
                $table->string('accidente_dueno')->nullable();
                $table->string('accidente_vehiculo')->nullable();
                $table->string('accidente_placas')->nullable();
                $table->boolean('accidente_seguro')->nullable();
                $table->text('accidente_hechos')->nullable();
                $table->string('firma_particular')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('reportes_titan_fotos')) {
            Schema::create('reportes_titan_fotos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reporte_titan_id')->constrained('reportes_titan')->onDelete('cascade');
                $table->string('ruta_foto');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reportes_titan_fotos');
        Schema::dropIfExists('reportes_titan');
    }
};
