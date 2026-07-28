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
        if (!Schema::hasTable('infracciones')) {
            Schema::create('infracciones', function (Blueprint $table) {
                $table->id();
                $table->string('folio', 50)->unique();
                $table->unsignedBigInteger('amonestacion_id')->nullable();

                // 1. Lugar, Fecha y Hora
                $table->dateTime('fecha_expedicion');
                $table->string('hora_intervencion', 20);
                $table->string('municipio', 100)->default('Pachuca de Soto');
                $table->string('ubicacion_exacta', 255);

                // 2. Datos del Vehículo Infractor
                $table->string('placas', 20)->index();
                $table->string('entidad_federativa', 100);
                $table->string('marca', 100);
                $table->string('submarca', 100)->nullable();
                $table->string('modelo', 100);
                $table->string('color', 50);
                $table->string('niv_vin', 100)->nullable();
                $table->string('tipo_vehiculo', 50)->default('Particular');

                // 3. Datos de la Persona Conductora / Propietaria
                $table->string('conductor_nombre', 150);
                $table->text('conductor_domicilio')->nullable();
                $table->string('licencia_numero', 100)->nullable();
                $table->string('licencia_tipo', 50)->nullable();
                $table->string('licencia_estado', 100)->nullable();
                $table->string('calidad_conductor', 50)->default('Conductora');

                // 4. Motivación y Hechos
                $table->string('motivacion_hecho', 100)->default('transitaba');
                $table->text('descripcion_hechos')->nullable();

                // 5. Sanción y Garantía Retenida
                $table->decimal('sancion_uma', 10, 2)->default(0);
                $table->string('garantia_tipo', 100)->default('Detención del Vehículo');
                $table->text('garantia_observaciones')->nullable();

                // 6. Inspector de Transporte
                $table->unsignedBigInteger('inspector_id')->nullable();
                $table->string('inspector_nombre', 150);
                $table->string('inspector_gafete', 100);
                $table->string('adscripcion', 255)->default('Dirección Jurídica del SITMAH');
                $table->longText('firma_inspector');

                // 7. Notificación e Infractor
                $table->boolean('conductor_nego_firmar')->default(false);
                $table->string('recibio_nombre', 150)->nullable();
                $table->longText('firma_conductor')->nullable();

                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('infracciones');
    }
};
