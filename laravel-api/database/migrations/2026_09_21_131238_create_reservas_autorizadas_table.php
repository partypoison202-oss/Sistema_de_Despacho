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
        Schema::create('reservas_autorizadas', function (Blueprint $table) {
            $table->id();
            $table->string('tarjeton', 50);
            $table->date('fecha_operativa');
            $table->timestamps();
            
            // Un conductor solo puede ser autorizado una vez por día
            $table->unique(['tarjeton', 'fecha_operativa']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservas_autorizadas');
    }
};
