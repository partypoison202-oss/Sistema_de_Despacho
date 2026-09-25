<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ImportarConductoresPlantillaSeeder extends Seeder
{
    public function run()
    {
        $jsonPath = database_path('data/conductores_20260925.json');
        if (!file_exists($jsonPath)) {
            $this->command->error("No se encontró el archivo: {$jsonPath}");
            return;
        }

        $data = json_decode(file_get_contents($jsonPath), true);
        if (!$data || !is_array($data)) {
            $this->command->error("El archivo JSON está vacío o es inválido.");
            return;
        }

        // Limpiar completamente la tabla de conductores y reiniciar el ID
        DB::statement('TRUNCATE TABLE conductores RESTART IDENTITY CASCADE;');

        $now = Carbon::now();
        $records = [];
        foreach ($data as $item) {
            $records[] = [
                'tarjeton' => $item['tarjeton'],
                'nombres' => trim($item['nombres'] ?? ''),
                'apellidos' => trim($item['apellidos'] ?? ''),
                'tipo_tarjeton' => trim($item['tipo_tarjeton'] ?? 'B'),
                'estado_servicio' => 'disponible',
                'estatus' => 'activo',
                'accidentes_siniestros' => 0,
                'faltas' => 0,
                'retardos' => 0,
                'amonestaciones' => 0,
                'reconocimientos' => 0,
                'permutas' => 0,
                'permisos' => 0,
                'dias_vacaciones' => 0,
                'dias_permiso' => 0,
                'num_accidentes' => 0,
                'sexo' => $item['sexo'] ?? null,
                'telefono' => $item['telefono'] ?? null,
                'vigencia_licencia' => $item['vigencia_licencia'] ?? null,
                'fecha_ingreso' => $item['fecha_ingreso'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Insertar en bloques para óptimo rendimiento en PostgreSQL
        foreach (array_chunk($records, 100) as $chunk) {
            DB::table('conductores')->insert($chunk);
        }

        $total = DB::table('conductores')->count();
        $this->command->info("Tabla conductores limpiada y repoblada exitosamente con {$total} operadores.");
    }
}
