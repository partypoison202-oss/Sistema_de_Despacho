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
        if (!Schema::hasTable('transportes')) {
            $sqlPath = base_path('../database/database.sql');
            if (file_exists($sqlPath)) {
                $sql = file_get_contents($sqlPath);
                DB::unprepared($sql);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No bajamos las tablas base porque son críticas.
    }
};
