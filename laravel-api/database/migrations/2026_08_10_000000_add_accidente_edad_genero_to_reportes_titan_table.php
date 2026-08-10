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
            if (!Schema::hasColumn('reportes_titan', 'accidente_edad')) {
                $table->string('accidente_edad')->nullable()->after('accidente_vehiculo');
            }
            if (!Schema::hasColumn('reportes_titan', 'accidente_genero')) {
                $table->string('accidente_genero')->nullable()->after('accidente_edad');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reportes_titan', function (Blueprint $table) {
            if (Schema::hasColumn('reportes_titan', 'accidente_genero')) {
                $table->dropColumn('accidente_genero');
            }
            if (Schema::hasColumn('reportes_titan', 'accidente_edad')) {
                $table->dropColumn('accidente_edad');
            }
        });
    }
};
