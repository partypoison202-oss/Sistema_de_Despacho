<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $tableName = 'informacion_operativa_festivo';
        
        if (!Schema::hasTable($tableName)) {
            Schema::create($tableName, function (Blueprint $table) {
                $table->id();
                $table->foreignId('unidad_id')->constrained('unidades');
                $table->string('ruta', 20)->nullable();
                $table->string('numero_tarjeton', 20)->nullable();
                $table->string('nombre_conductor', 200)->nullable();
                $table->string('tipo', 50)->nullable();
                $table->string('estatus', 20)->nullable();
                $table->string('falla', 50)->nullable();
                $table->integer('corridas')->nullable();
                $table->string('ciclo', 10)->nullable();
                $table->string('motivo', 50)->nullable();
                $table->string('hora_programada', 20)->nullable();
                $table->string('hora_salida', 20)->nullable();
                $table->string('acople', 50)->nullable();
                $table->string('cambio_desde', 50)->nullable();
                $table->string('cambio_motivo', 200)->nullable();
                $table->string('motivo_estatus', 200)->nullable();
                $table->string('folio_mantenimiento', 50)->nullable();
                $table->date('fecha_folio_mantenimiento')->nullable();
                $table->text('observaciones')->nullable();
                $table->string('tarjeton_maniobrista', 50)->nullable()->default('');
                $table->string('nombre_maniobrista', 200)->nullable()->default('');
                $table->timestamp('fecha_registro')->nullable()->useCurrent();
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('informacion_operativa_festivo');
    }
};
