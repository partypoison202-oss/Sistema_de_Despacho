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
        if (!Schema::hasTable('amonestaciones')) {
            Schema::create('amonestaciones', function (Blueprint $table) {
                $table->id();
                $table->string('folio', 50)->unique();
                $table->dateTime('fecha');
                $table->string('lugar', 255)->default('Pachuca de Soto, Estado de Hidalgo');

                // 1. Datos del Vehículo Infractor
                $table->string('placas', 20)->index();
                $table->string('entidad_federativa', 100);
                $table->string('marca', 100);
                $table->string('modelo', 100);
                $table->string('color', 50);
                $table->string('conductor_nombre', 150);
                $table->string('conductor_identificacion', 100)->nullable();

                // 2. Datos de la Persona Inspectora
                $table->unsignedBigInteger('inspector_id')->nullable();
                $table->string('inspector_nombre', 150);
                $table->string('inspector_gafete', 100);
                $table->string('adscripcion', 255)->default('Dirección Jurídica del SITMAH');
                $table->longText('firma_inspector'); // Base64 PNG de la firma

                // 3. Notificación y firma del conductor
                $table->boolean('conductor_nego_firmar')->default(false);
                $table->string('recibio_nombre', 150)->nullable();
                $table->longText('firma_conductor')->nullable(); // Base64 PNG si firmó

                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('amonestaciones');
    }
};
