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
        Schema::table('reportes_titan', function (Blueprint $table) {
            if (!Schema::hasColumn($table->getTable(), 'firma_particular_url')) {
                $table->string('firma_particular_url')->nullable()->after('accidente_hechos');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reportes_titan', function (Blueprint $table) {
            $table->dropColumn('firma_particular_url');
        });
    }
};