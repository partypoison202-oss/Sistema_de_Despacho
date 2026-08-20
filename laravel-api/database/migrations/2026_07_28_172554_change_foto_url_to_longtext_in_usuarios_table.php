<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            // longText porque un Base64 de una imagen de 2MB puede superar
            // el límite de una columna TEXT normal (~65,535 bytes)
            if (!Schema::hasColumn($table->getTable(), 'foto_url')) {
                $table->longText('foto_url')->nullable()->change();
            }
        });
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            if (!Schema::hasColumn($table->getTable(), 'foto_url')) {
                $table->string('foto_url')->nullable()->change();
            }
        });
    }
};