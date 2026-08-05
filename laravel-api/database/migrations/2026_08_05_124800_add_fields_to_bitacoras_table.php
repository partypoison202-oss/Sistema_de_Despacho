<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bitacoras', function (Blueprint $table) {
            $table->string('corrida')->nullable()->after('id');
            $table->string('ruta')->nullable()->after('corrida');
            $table->string('cambio_1')->nullable()->after('unidad');
            $table->string('cambio_2')->nullable()->after('cambio_1');
            $table->string('cambio_3')->nullable()->after('cambio_2');
            $table->string('cambio_4')->nullable()->after('cambio_3');
            if (Schema::hasColumn('bitacoras', 'cambio')) {
                $table->dropColumn('cambio');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bitacoras', function (Blueprint $table) {
            $table->dropColumn(['corrida', 'ruta', 'cambio_1', 'cambio_2', 'cambio_3', 'cambio_4']);
            $table->string('cambio')->nullable();
        });
    }
};
