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

        // Limpiar y normalizar tarjetones en tablas operativas para que no queden fantasmas
        $validTarjetones = array_column($records, 'tarjeton');
        $opTables = [
            'informacion_operativa',
            'informacion_operativa_manana',
            'informacion_operativa_sabado',
            'informacion_operativa_domingo',
            'informacion_operativa_lunes',
            'informacion_operativa_festivo',
        ];

        foreach ($opTables as $tbl) {
            if (!\Illuminate\Support\Facades\Schema::hasTable($tbl)) continue;

            // 0083 -> 1045 (JOSÉ ACAXTENGO MORGADO)
            DB::table($tbl)->whereIn('numero_tarjeton', ['0083', '83', '083'])->update([
                'numero_tarjeton' => '1045',
                'nombre_conductor' => 'JOSÉ ACAXTENGO MORGADO'
            ]);

            // 980 -> 0915 (NOEHLIA ISLAS MORALES)
            DB::table($tbl)->whereIn('numero_tarjeton', ['980', '0980'])->update([
                'numero_tarjeton' => '0915',
                'nombre_conductor' => 'NOEHLIA ISLAS MORALES'
            ]);

            // Limpiar asignaciones que tengan un tarjetón que NO existe en la plantilla (ej. 1092)
            $assignedRows = DB::table($tbl)
                ->whereNotNull('numero_tarjeton')
                ->where('numero_tarjeton', '!=', '')
                ->get(['id', 'numero_tarjeton']);

            foreach ($assignedRows as $row) {
                $tj = str_pad(trim($row->numero_tarjeton), 4, '0', STR_PAD_LEFT);
                if (!in_array($tj, $validTarjetones)) {
                    DB::table($tbl)->where('id', $row->id)->update([
                        'numero_tarjeton' => null,
                        'nombre_conductor' => null,
                    ]);
                }
            }
        }

        $total = DB::table('conductores')->count();
        $this->command->info("Tabla conductores limpiada y repoblada exitosamente con {$total} operadores.");
    }
}
