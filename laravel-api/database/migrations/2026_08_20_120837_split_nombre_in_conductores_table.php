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
        Schema::table('conductores', function (Blueprint $table) {
            $table->string('nombres', 100)->nullable()->after('id');
            $table->string('apellidos', 100)->nullable()->after('nombres');
        });

        // Migrate existing data
        $conductores = DB::table('conductores')->get();
        foreach ($conductores as $conductor) {
            $nombre = trim($conductor->nombre);
            $nombres = '';
            $apellidos = '';

            if ($nombre) {
                $parts = explode(' ', $nombre);
                if (count($parts) >= 3) {
                    $apellidos = $parts[0] . ' ' . $parts[1];
                    $nombres = implode(' ', array_slice($parts, 2));
                } elseif (count($parts) == 2) {
                    $apellidos = $parts[0];
                    $nombres = $parts[1];
                } else {
                    $nombres = $nombre;
                }
            }

            DB::table('conductores')
                ->where('id', $conductor->id)
                ->update([
                    'nombres' => $nombres,
                    'apellidos' => $apellidos,
                ]);
        }

        Schema::table('conductores', function (Blueprint $table) {
            $table->dropColumn('nombre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conductores', function (Blueprint $table) {
            //
        });
    }
};
