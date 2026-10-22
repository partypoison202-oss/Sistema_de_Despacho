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
        if (Schema::hasTable('usuarios') && !Schema::hasColumn('usuarios', 'ultima_conexion')) {
            Schema::table('usuarios', function (Blueprint $table) {
                $table->timestamp('ultima_conexion')->nullable()->after('foto_url');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('usuarios') && Schema::hasColumn('usuarios', 'ultima_conexion')) {
            Schema::table('usuarios', function (Blueprint $table) {
                $table->dropColumn('ultima_conexion');
            });
        }
    }
};
