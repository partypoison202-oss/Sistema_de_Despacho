<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->string('hora_salida', 20)->nullable()->after('acople');
        });
    }

    public function down(): void
    {
        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->dropColumn('hora_salida');
        });
    }
};
