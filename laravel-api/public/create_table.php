<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

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
        $table->text('observaciones')->nullable();
        $table->string('tarjeton_maniobrista', 50)->nullable()->default('');
        $table->string('nombre_maniobrista', 200)->nullable()->default('');
        $table->timestamp('fecha_registro')->nullable()->useCurrent();
    });
    echo "Table created successfully.";
} else {
    echo "Table already exists.";
}
