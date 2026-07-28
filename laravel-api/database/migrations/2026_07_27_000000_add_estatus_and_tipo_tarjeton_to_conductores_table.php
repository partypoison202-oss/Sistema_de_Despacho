<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        Schema::table('conductores', function (Blueprint $table) {
            if (!Schema::hasColumn('conductores', 'estatus')) {
                $table->string('estatus', 20)->default('activo');
            }
            if (!Schema::hasColumn('conductores', 'tipo_tarjeton')) {
                $table->string('tipo_tarjeton', 50)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('conductores', function (Blueprint $table) {
            if (Schema::hasColumn('conductores', 'estatus')) {
                $table->dropColumn('estatus');
            }
            if (Schema::hasColumn('conductores', 'tipo_tarjeton')) {
                $table->dropColumn('tipo_tarjeton');
            }
        });
    }
};
