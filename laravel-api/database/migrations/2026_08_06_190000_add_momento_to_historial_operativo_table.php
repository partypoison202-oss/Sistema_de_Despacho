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
        Schema::table('historial_operativo', function (Blueprint $table) {
            $table->string('momento', 20)->default('FIN')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('historial_operativo', function (Blueprint $table) {
            $table->dropColumn('momento');
        });
    }
};
