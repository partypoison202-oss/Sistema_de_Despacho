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
        Schema::create('bitacora_cambios_unidades', function (Blueprint $table) {
            $table->id();
            $table->date('fecha')->index();
            $table->foreignId('unidad_id')->constrained('unidades')->onDelete('cascade');
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->string('tipo_accion'); // 'CAMBIO_ESTATUS', 'INCORPORACION', 'DESINCORPORACION'
            $table->string('estatus_anterior')->nullable();
            $table->string('estatus_nuevo')->nullable();
            $table->text('detalles')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bitacora_cambios_unidades');
    }
};
