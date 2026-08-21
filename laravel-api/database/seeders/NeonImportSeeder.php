<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class NeonImportSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $path = database_path('data_neon.sql');
        
        if (!File::exists($path)) {
            $this->command->error('El archivo data_neon.sql no existe en la carpeta database.');
            return;
        }

        $this->command->info('Ejecutando script de importación de Neon DB (limpio de roles/usuarios)...');
        
        // Ejecutar todo el archivo SQL
        $sql = File::get($path);
        DB::unprepared($sql);
        
        $this->command->info('¡Importación completada exitosamente sin conflictos!');
    }
}
