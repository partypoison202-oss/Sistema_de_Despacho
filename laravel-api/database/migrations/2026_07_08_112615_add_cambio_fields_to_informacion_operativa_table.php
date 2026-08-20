<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('informacion_operativa', function (Blueprint $table) {
            if (!Schema::hasColumn($table->getTable(), 'cambio_desde')) {
                $table->string('cambio_desde')->nullable()->after('motivo');
            }
            if (!Schema::hasColumn($table->getTable(), 'cambio_motivo')) {
                $table->string('cambio_motivo')->nullable()->after('cambio_desde');
            }
        });
    }

    public function down()
    {
        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->dropColumn(['cambio_desde', 'cambio_motivo']);
        });
    }
};