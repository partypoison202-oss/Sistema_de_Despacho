<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Cambia las columnas foto y qr_documento de VARCHAR(255) a TEXT
     * para soportar el almacenamiento de imágenes en formato Base64.
     */
    public function up(): void
    {
        // Usar SQL nativo para máxima compatibilidad con PostgreSQL/Neon
        DB::statement('ALTER TABLE conductores ALTER COLUMN foto TYPE TEXT');
        DB::statement('ALTER TABLE conductores ALTER COLUMN qr_documento TYPE TEXT');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir a VARCHAR(255) si es necesario
        DB::statement('ALTER TABLE conductores ALTER COLUMN foto TYPE VARCHAR(255)');
        DB::statement('ALTER TABLE conductores ALTER COLUMN qr_documento TYPE VARCHAR(255)');
    }
};
