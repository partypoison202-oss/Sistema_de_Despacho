<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExportUsuariosCsv extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:export-usuarios';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Exporta todos los usuarios de la base de datos a un archivo CSV en la raiz del proyecto';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando exportación de usuarios...');

        $usuarios = DB::table('usuarios')
            ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
            ->select(
                'usuarios.id',
                'usuarios.nombre_completo',
                'usuarios.usuario',
                'usuarios.correo',
                'roles.nombre as rol',
                'usuarios.activo',
                'usuarios.contrasena'
            )
            ->get();

        if ($usuarios->isEmpty()) {
            $this->warn('No hay usuarios en la base de datos.');
            return;
        }

        $filename = base_path('usuarios_produccion.csv');
        $file = fopen($filename, 'w');

        // Agregar BOM para que Excel lea los acentos (UTF-8) correctamente
        fputs($file, $bom =(chr(0xEF) . chr(0xBB) . chr(0xBF)));

        // Encabezados
        fputcsv($file, ['ID', 'Nombre Completo', 'Usuario', 'Correo', 'Rol', 'Activo', 'Contrasena Hash']);

        // Filas
        foreach ($usuarios as $u) {
            fputcsv($file, [
                $u->id,
                $u->nombre_completo,
                $u->usuario,
                $u->correo,
                $u->rol,
                $u->activo ? 'SI' : 'NO',
                $u->contrasena
            ]);
        }

        fclose($file);

        $this->info("¡Exportación exitosa! Archivo guardado en: {$filename}");
        $this->info("Puedes descargarlo usando FileZilla conectándote al servidor.");
    }
}
