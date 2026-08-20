<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Disable transaction for this migration to avoid DDL/Postgres schema transaction conflicts.
     */
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create conductors table
        if (!Schema::hasTable('conductores')) {
            Schema::create('conductores', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 200);
            $table->string('tarjeton', 50)->unique();
            $table->timestamps();
        });
        }

        // 2. Populate conductors from existing data in informacion_operativa
        $existing = DB::table('informacion_operativa')
            ->select('nombre_conductor', 'numero_tarjeton')
            ->whereNotNull('nombre_conductor')
            ->whereNotNull('numero_tarjeton')
            ->where('nombre_conductor', '!=', '')
            ->where('numero_tarjeton', '!=', '')
            ->distinct()
            ->get();

        foreach ($existing as $row) {
            $nombre = trim($row->nombre_conductor);
            $tarjeton = trim($row->numero_tarjeton);
            
            if ($nombre !== '' && $tarjeton !== '') {
                try {
                    DB::table('conductores')->insertOrIgnore([
                        'nombre' => $nombre,
                        'tarjeton' => $tarjeton,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                } catch (\Exception $e) {
                    // Ignore duplicate key errors if any
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conductores');
    }
};
