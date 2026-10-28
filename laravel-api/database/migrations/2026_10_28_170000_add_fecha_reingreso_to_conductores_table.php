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
        if (Schema::hasTable('conductores') && !Schema::hasColumn('conductores', 'fecha_reingreso')) {
            Schema::table('conductores', function (Blueprint $table) {
                $table->date('fecha_reingreso')->nullable()->after('fecha_ingreso');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('conductores')) {
            if (Schema::hasColumn('conductores', 'fecha_reingreso')) {
                Schema::table('conductores', function (Blueprint $table) {
                    $table->dropColumn('fecha_reingreso');
                });
            }
        }
    }
};

