<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * EssentialDataSeeder
 *
 * Pobla la base de datos con los datos mínimos necesarios para que el
 * Sistema de Despacho pueda operar desde el primer día.
 *
 * IDEMPOTENTE: Usa insertOrIgnore / updateOrInsert para que pueda
 * ejecutarse múltiples veces sin duplicar registros.
 *
 * Orden de inserción respeta las llaves foráneas:
 *   1. transportes
 *   2. rutas
 *   3. secciones_unidad
 *   4. roles
 *   5. unidades
 *   6. informacion_operativa
 *   7. usuarios
 */
class EssentialDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚀 Iniciando carga de datos esenciales...');

        $this->seedTransportes();
        $this->seedRutas();
        $this->seedSeccionesUnidad();
        $this->seedRoles();
        $this->seedUnidades();
        $this->seedInformacionOperativa();
        $this->seedUsuarios();

        $this->command->info('✅ Datos esenciales cargados correctamente.');
    }

    // ─── 1. TRANSPORTES ──────────────────────────────────────────────────────────
    private function seedTransportes(): void
    {
        $this->command->info('   → Cargando transportes...');
        if (DB::table('transportes')->count() > 0) {
            $this->command->info('     ✓ Transportes ya existen, omitiendo.');
            return;
        }

        $data = [
            ['id' => 1, 'nombre' => 'URBANUSS'],
            ['id' => 2, 'nombre' => 'VOLARE'],
            ['id' => 3, 'nombre' => 'BUSSCAR'],
            ['id' => 4, 'nombre' => 'NEOBUS'],
        ];
        foreach ($data as $row) {
            DB::table('transportes')->updateOrInsert(['id' => $row['id']], $row);
        }
        // Sincronizar secuencia
        DB::statement("SELECT setval(pg_get_serial_sequence('transportes', 'id'), COALESCE((SELECT MAX(id) FROM transportes), 1))");
    }

    // ─── 2. RUTAS ─────────────────────────────────────────────────────────────────
    private function seedRutas(): void
    {
        $this->command->info('   → Cargando rutas...');
        if (DB::table('rutas')->count() > 0) {
            $this->command->info('     ✓ Rutas ya existen, omitiendo.');
            return;
        }

        $data = [
            ['id' => 1,  'ruta' => 'T01',  'tipo' => 'troncal'],
            ['id' => 2,  'ruta' => 'T02',  'tipo' => 'troncal'],
            ['id' => 3,  'ruta' => 'T04',  'tipo' => 'troncal'],
            ['id' => 4,  'ruta' => 'T05',  'tipo' => 'troncal'],
            ['id' => 5,  'ruta' => '1A',   'tipo' => 'alimentadora'],
            ['id' => 6,  'ruta' => '1B',   'tipo' => 'alimentadora'],
            ['id' => 7,  'ruta' => '2A',   'tipo' => 'alimentadora'],
            ['id' => 8,  'ruta' => '2B',   'tipo' => 'alimentadora'],
            ['id' => 9,  'ruta' => '2D',   'tipo' => 'alimentadora'],
            ['id' => 10, 'ruta' => '2E',   'tipo' => 'alimentadora'],
            ['id' => 11, 'ruta' => '3',    'tipo' => 'alimentadora'],
            ['id' => 12, 'ruta' => '4A',   'tipo' => 'alimentadora'],
            ['id' => 13, 'ruta' => '5',    'tipo' => 'alimentadora'],
            ['id' => 14, 'ruta' => '6',    'tipo' => 'alimentadora'],
            ['id' => 15, 'ruta' => '7',    'tipo' => 'alimentadora'],
            ['id' => 16, 'ruta' => '8',    'tipo' => 'alimentadora'],
            ['id' => 17, 'ruta' => '9',    'tipo' => 'alimentadora'],
            ['id' => 18, 'ruta' => '10',   'tipo' => 'alimentadora'],
            ['id' => 19, 'ruta' => '11',   'tipo' => 'alimentadora'],
            ['id' => 20, 'ruta' => '12',   'tipo' => 'alimentadora'],
            ['id' => 21, 'ruta' => '13',   'tipo' => 'alimentadora'],
            ['id' => 22, 'ruta' => '14',   'tipo' => 'alimentadora'],
            ['id' => 23, 'ruta' => '15A',  'tipo' => 'alimentadora'],
            ['id' => 24, 'ruta' => '15B',  'tipo' => 'alimentadora'],
            ['id' => 25, 'ruta' => '15C',  'tipo' => 'alimentadora'],
            ['id' => 26, 'ruta' => '16',   'tipo' => 'alimentadora'],
            ['id' => 27, 'ruta' => '17',   'tipo' => 'alimentadora'],
            ['id' => 28, 'ruta' => '19',   'tipo' => 'alimentadora'],
            ['id' => 29, 'ruta' => '20B',  'tipo' => 'alimentadora'],
            ['id' => 30, 'ruta' => '4',    'tipo' => 'alimentadora'],
        ];
        foreach ($data as $row) {
            DB::table('rutas')->updateOrInsert(['id' => $row['id']], $row);
        }
        DB::statement("SELECT setval(pg_get_serial_sequence('rutas', 'id'), COALESCE((SELECT MAX(id) FROM rutas), 1))");
    }

    // ─── 3. SECCIONES UNIDAD ─────────────────────────────────────────────────────
    private function seedSeccionesUnidad(): void
    {
        $this->command->info('   → Cargando secciones de unidad...');
        if (DB::table('secciones_unidad')->count() > 0) {
            $this->command->info('     ✓ Secciones de unidad ya existen, omitiendo.');
            return;
        }

        $data = [
            ['id' => 1, 'nombre' => 'Frente'],
            ['id' => 2, 'nombre' => 'Trasera'],
            ['id' => 3, 'nombre' => 'Costado Izquierdo'],
            ['id' => 4, 'nombre' => 'Costado Derecho'],
        ];
        foreach ($data as $row) {
            DB::table('secciones_unidad')->updateOrInsert(['id' => $row['id']], $row);
        }
        DB::statement("SELECT setval(pg_get_serial_sequence('secciones_unidad', 'id'), COALESCE((SELECT MAX(id) FROM secciones_unidad), 1))");
    }

    // ─── 4. ROLES ─────────────────────────────────────────────────────────────────
    private function seedRoles(): void
    {
        $this->command->info('   → Cargando roles...');
        if (DB::table('roles')->count() > 0) {
            $this->command->info('     ✓ Roles ya existen, omitiendo.');
            return;
        }

        $data = [
            ['id' => 1,  'codigo' => 'ADMINISTRADOR',       'nombre' => 'Administrador',         'descripcion' => 'Administrador general del sistema.'],
            ['id' => 2,  'codigo' => 'PROGRAMACION',        'nombre' => 'Programación',           'descripcion' => 'Gestión de la programación diaria.'],
            ['id' => 3,  'codigo' => 'CENTRO_CONTROL',      'nombre' => 'Centro de Control',      'descripcion' => 'Monitoreo y control del Centro de Control.'],
            ['id' => 4,  'codigo' => 'DESPACHO',            'nombre' => 'Despacho',               'descripcion' => 'Despacho de unidades.'],
            ['id' => 5,  'codigo' => 'ENCIERRO',            'nombre' => 'Encierro',               'descripcion' => 'Gestión de entrada y salida de unidades en encierros.'],
            ['id' => 7,  'codigo' => 'GENERAL',             'nombre' => 'General',                'descripcion' => 'Rol operativo general.'],
            ['id' => 8,  'codigo' => 'TITAN',               'nombre' => 'TITAN',                  'descripcion' => 'Rol operativo TITAN.'],
            ['id' => 9,  'codigo' => 'PLATAFORMA',          'nombre' => 'PLATAFORMA',             'descripcion' => 'Movimientos de plataforma.'],
            ['id' => 10, 'codigo' => 'INFRACCION',          'nombre' => 'INFRACCION',             'descripcion' => 'Gestión de infracciones.'],
            ['id' => 11, 'codigo' => 'GESTOR_OPERADORES',   'nombre' => 'Gestor de Operadores',   'descripcion' => 'Gestión del catálogo de operadores.'],
            ['id' => 13, 'codigo' => 'CARGA_DE_COMBUSTIBLE','nombre' => 'Carga de Combustible',   'descripcion' => 'Control de carga de combustible.'],
        ];
        foreach ($data as $row) {
            DB::table('roles')->updateOrInsert(['id' => $row['id']], $row);
        }
        DB::statement("SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE((SELECT MAX(id) FROM roles), 1))");
    }

    // ─── 5. UNIDADES ─────────────────────────────────────────────────────────────
    private function seedUnidades(): void
    {
        $this->command->info('   → Cargando unidades (148)...');
        if (DB::table('unidades')->count() > 0) {
            $this->command->info('     ✓ Unidades ya existen, omitiendo.');
            return;
        }

        // URBANUSS (transporte_id=1): 001-041 (sin 002 duplicado, etc.)
        $urbanuss = [];
        $ecos = [
            '001','003','004','005','006','007','008','009','010','011','012',
            '014','015','017','018','019','020','021','022','023','024','025',
            '026','027','028','029','030','031','032','033','034','035','036',
            '037','038','039','040','041',
        ];
        $ids = [1,3,4,5,6,7,8,9,10,11,12,14,15,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41];
        // Incluir 002 (id=2) con datos de combustible
        DB::table('unidades')->updateOrInsert(['id' => 2], [
            'id' => 2, 'transporte_id' => 1, 'numero_eco' => '002',
            'tipo' => null, 'nivel_combustible' => '50', 'nivel_adblue' => '100',
            'numero_cincho' => '76HI', 'fecha_ultima_carga' => '2026-07-27',
            'kilometraje' => '300', 'numero_cincho_adblue' => null, 'odometro' => null,
        ]);
        foreach (array_combine($ids, $ecos) as $id => $eco) {
            DB::table('unidades')->updateOrInsert(['id' => $id], [
                'id' => $id, 'transporte_id' => 1, 'numero_eco' => $eco,
                'tipo' => null, 'nivel_combustible' => null, 'nivel_adblue' => null,
                'numero_cincho' => null, 'fecha_ultima_carga' => null,
                'kilometraje' => null, 'numero_cincho_adblue' => null, 'odometro' => null,
            ]);
        }

        // VOLARE (transporte_id=2): 101-137
        $volareIds = [44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80];
        $volareEcos = ['101','102','103','104','105','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120','121','122','123','124','125','126','127','128','129','130','131','132','133','134','135','136','137'];
        foreach (array_combine($volareIds, $volareEcos) as $id => $eco) {
            DB::table('unidades')->updateOrInsert(['id' => $id], [
                'id' => $id, 'transporte_id' => 2, 'numero_eco' => $eco,
                'tipo' => null, 'nivel_combustible' => null, 'nivel_adblue' => null,
                'numero_cincho' => null, 'fecha_ultima_carga' => null,
                'kilometraje' => null, 'numero_cincho_adblue' => null, 'odometro' => null,
            ]);
        }

        // BUSSCAR (transporte_id=3): 200-215
        $busscarIds = [122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137];
        $busscarEcos = ['200','201','202','203','204','205','206','207','208','209','210','211','212','213','214','215'];
        foreach (array_combine($busscarIds, $busscarEcos) as $id => $eco) {
            DB::table('unidades')->updateOrInsert(['id' => $id], [
                'id' => $id, 'transporte_id' => 3, 'numero_eco' => $eco,
                'tipo' => null, 'nivel_combustible' => null, 'nivel_adblue' => null,
                'numero_cincho' => null, 'fecha_ultima_carga' => null,
                'kilometraje' => null, 'numero_cincho_adblue' => null, 'odometro' => null,
            ]);
        }

        // NEOBUS (transporte_id=4): 401-408
        $neobusData = [
            ['id' => 103, 'eco' => '402'],
            ['id' => 104, 'eco' => '404'],
            ['id' => 105, 'eco' => '405'],
            ['id' => 106, 'eco' => '406'],
            ['id' => 107, 'eco' => '407'],
            ['id' => 111, 'eco' => '408'],
            ['id' => 112, 'eco' => '403'],
            ['id' => 114, 'eco' => '401'],
        ];
        foreach ($neobusData as $row) {
            DB::table('unidades')->updateOrInsert(['id' => $row['id']], [
                'id' => $row['id'], 'transporte_id' => 4, 'numero_eco' => $row['eco'],
                'tipo' => null, 'nivel_combustible' => null, 'nivel_adblue' => null,
                'numero_cincho' => null, 'fecha_ultima_carga' => null,
                'kilometraje' => null, 'numero_cincho_adblue' => null, 'odometro' => null,
            ]);
        }

        DB::statement("SELECT setval(pg_get_serial_sequence('unidades', 'id'), COALESCE((SELECT MAX(id) FROM unidades), 1))");
        $this->command->info('     ✓ ' . DB::table('unidades')->count() . ' unidades cargadas.');
    }

    // ─── 6. INFORMACION OPERATIVA ─────────────────────────────────────────────────
    private function seedInformacionOperativa(): void
    {
        $this->command->info('   → Cargando información operativa (1 registro por unidad)...');
        if (DB::table('informacion_operativa')->count() > 0) {
            $this->command->info('     ✓ Información operativa ya existe, omitiendo.');
            return;
        }

        // Solo insertar si no existe ya un registro para esa unidad
        $unidades = DB::table('unidades')->orderBy('id')->get();

        // Mapeo de eco -> datos operativos del backup de recuperación
        $ioData = $this->getIODefaults();

        $now = now()->toDateTimeString();
        foreach ($unidades as $unidad) {
            $exists = DB::table('informacion_operativa')->where('unidad_id', $unidad->id)->exists();
            if (!$exists) {
                $default = $ioData[$unidad->numero_eco] ?? null;
                DB::table('informacion_operativa')->insert([
                    'unidad_id'           => $unidad->id,
                    'ruta'                => $default['ruta'] ?? null,
                    'numero_tarjeton'     => $default['numero_tarjeton'] ?? null,
                    'nombre_conductor'    => $default['nombre_conductor'] ?? null,
                    'tipo'                => $default['tipo'] ?? 'URBANUSS',
                    'estatus'             => 'encierro',
                    'fecha_registro'      => $now,
                    'falla'               => null,
                    'corridas'            => null,
                    'ciclo'               => null,
                    'motivo'              => null,
                    'hora_programada'     => $default['hora_programada'] ?? null,
                    'motivo_estatus'      => null,
                    'acople'              => null,
                    'hora_salida'         => null,
                    'cambio_desde'        => null,
                    'cambio_motivo'       => null,
                    'observaciones'       => null,
                    'tarjeton_maniobrista'=> '',
                    'nombre_maniobrista'  => '',
                ]);
            }
        }
        DB::statement("SELECT setval(pg_get_serial_sequence('informacion_operativa', 'id'), COALESCE((SELECT MAX(id) FROM informacion_operativa), 1))");
        $this->command->info('     ✓ ' . DB::table('informacion_operativa')->count() . ' registros operativos.');
    }

    // ─── 7. USUARIOS ─────────────────────────────────────────────────────────────
    private function seedUsuarios(): void
    {
        $this->command->info('   → Cargando usuario administrador...');
        if (DB::table('usuarios')->count() > 0) {
            $this->command->info('     ✓ Usuarios ya existen, omitiendo.');
            return;
        }

        // Solo el admin del sistema se seed automáticamente.
        // Los demás usuarios operativos deben crearse desde el panel de administración.
        // Usamos upsert directo con SQL para evitar el cast de boolean en PostgreSQL
        $exists = DB::table('usuarios')->where('correo', 'admin@sitmah.gob.mx')->exists();
        $userData = [
            'nombre_completo'      => 'Administrador del Sistema',
            'usuario'              => 'Admin',
            'correo'               => 'admin@sitmah.gob.mx',
            'contrasena'           => '$2y$12$E.X8TmRYzOw4O8G/Fv3p2eVHnGpXIcRbAEfRLVn/U83t9D.hFtCpS',
            'activo'               => DB::raw('true'),
            'rol_id'               => 1,
            'fecha_creacion'       => now()->toDateTimeString(),
            'fecha_actualizacion'  => now()->toDateTimeString(),
            'foto_url'             => null,
        ];
        if ($exists) {
            DB::table('usuarios')->where('correo', 'admin@sitmah.gob.mx')->update($userData);
        } else {
            DB::table('usuarios')->insert($userData);
        }
        DB::statement("SELECT setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE((SELECT MAX(id) FROM usuarios), 1))");
        $this->command->info('     ✓ Usuario Admin listo.');
    }

    // ─── HELPER: datos operativos por defecto del backup de recuperación ──────────
    private function getIODefaults(): array
    {
        return [
            '001' => ['ruta' => 'T01', 'numero_tarjeton' => '0101', 'nombre_conductor' => 'RAMÍREZ BARRAZA ÁNGEL GABRIEL',   'tipo' => 'URBANUSS', 'hora_programada' => '13:00'],
            '002' => ['ruta' => 'T02', 'numero_tarjeton' => '0087', 'nombre_conductor' => 'PÉREZ RUÍZ DAVID',                 'tipo' => 'URBANUSS', 'hora_programada' => '05:34'],
            '003' => ['ruta' => 'T04', 'numero_tarjeton' => null,   'nombre_conductor' => null,                               'tipo' => 'URBANUSS', 'hora_programada' => null],
            '004' => ['ruta' => 'T05', 'numero_tarjeton' => null,   'nombre_conductor' => null,                               'tipo' => 'URBANUSS', 'hora_programada' => null],
            // Las demás unidades arrancan en 'encierro' sin asignación, se asignan en el primer despacho
        ];
    }
}
