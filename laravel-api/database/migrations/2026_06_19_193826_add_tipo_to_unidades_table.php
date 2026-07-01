<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        if (! Schema::hasColumn('unidades', 'tipo')) {
            Schema::table('unidades', function (Blueprint $table) {
                $table->string('tipo')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        if (Schema::hasColumn('unidades', 'tipo')) {
            Schema::table('unidades', function (Blueprint $table) {
                $table->dropColumn('tipo');
            });
        }
    }
};
