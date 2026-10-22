<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('programacion_ciclos')) {
            $driver = DB::getDriverName();
            if ($driver === 'pgsql') {
                DB::statement('ALTER TABLE programacion_ciclos ALTER COLUMN ciclos TYPE NUMERIC(10, 2) USING ciclos::numeric(10, 2);');
            } else {
                Schema::table('programacion_ciclos', function (Blueprint $table) {
                    $table->decimal('ciclos', 10, 2)->change();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No destructive reversal
    }
};
