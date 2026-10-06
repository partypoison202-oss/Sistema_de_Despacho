const fs = require('fs');

let content = fs.readFileSync('laravel-api/app/Http/Controllers/API/DespachoController.php', 'utf8');

// Primero, quitemos el método cargarProgramacionExcel si ya existe para reescribirlo.
content = content.replace(/public function cargarProgramacionExcel[\s\S]*?^}$/m, '');
// Si hay múltiples llaves de cierre al final, podemos limpiarlo.
content = content.replace(/}[\s\n]*$/s, '}');

const injection = `
    public function cargarProgramacionExcel(\Illuminate\Http\Request $request) // NOSONAR
    {
        $request->validate([
            'datos' => 'required|array',
        ]);

        $datos = $request->datos;

        try {
            \Illuminate\Support\Facades\DB::beginTransaction();

            // Solo afecta 'manana'
            \Illuminate\Support\Facades\DB::table('informacion_operativa_manana')->delete();
            
            // También limpiar la tabla entradas_t6 para mañana
            $mananaFecha = \Carbon\Carbon::tomorrow('America/Mexico_City')->toDateString();
            \Illuminate\Support\Facades\DB::table('entradas_t6')->where('fecha', $mananaFecha)->delete();

            $erroresFormato = [];
            $insertData = [];
            $entradasT6Data = [];

            // Obtener rutas y unidades
            $rutas = \Illuminate\Support\Facades\DB::table('rutas')->pluck('ruta', 'ruta')->toArray(); // ['T05' => 'T05']
            $unidades = \Illuminate\Support\Facades\DB::table('unidades')->pluck('id', 'numero_economico')->toArray();

            $unidadesProcesadas = [];

            foreach ($datos as $index => $fila) {
                $filaNum = $index + 2; // Para mensaje de error (suponiendo que 1 es cabecera)

                $eco = trim($fila['ECONOMICO'] ?? '');
                if (!$eco) continue; // Saltar filas vacías
                
                $ecoKey = ltrim($eco, '0');
                
                $unidadId = null;
                foreach ($unidades as $uEco => $uId) {
                    if (ltrim((string)$uEco, '0') === $ecoKey || (string)$uEco === (string)$eco) {
                        $unidadId = $uId;
                        break;
                    }
                }

                if (!$unidadId) {
                    $erroresFormato[] = "Fila {$filaNum}: Unidad economico {$eco} no encontrada en la base de datos.";
                    continue;
                }

                $unidadesProcesadas[] = $unidadId;

                // SERVICIO (T05-06) -> Ruta y Corrida
                $servicio = trim($fila['SERVICIO'] ?? '');
                $rutaStr = null;
                $corridaNum = null;
                if (str_contains($servicio, '-')) {
                    $partes = explode('-', $servicio);
                    $rutaStr = trim($partes[0]);
                    $corridaNum = (int)trim($partes[1]);
                } else {
                    $rutaStr = $servicio;
                }

                if ($rutaStr && !isset($rutas[$rutaStr])) {
                    $erroresFormato[] = "Fila {$filaNum}: La ruta {$rutaStr} no existe en el sistema.";
                }

                // Validar horas (Formato HH:MM)
                $horaSalida = trim($fila['HORA DE SALIDA DE PATIO'] ?? '');
                $horaAcople = trim($fila['HORA DE ACOPLE'] ?? '');
                $horaEntrada = trim($fila['HORA ENTRADA T6'] ?? '');

                $regexHora = '/^(?:2[0-3]|[01][0-9]):[0-5][0-9]$/';

                if ($horaSalida && !preg_match($regexHora, $horaSalida)) {
                    $erroresFormato[] = "Fila {$filaNum}: Hora de salida de patio ({$horaSalida}) inválida.";
                }
                if ($horaAcople && !preg_match($regexHora, $horaAcople)) {
                    $erroresFormato[] = "Fila {$filaNum}: Hora de acople ({$horaAcople}) inválida.";
                }
                if ($horaEntrada && !preg_match($regexHora, $horaEntrada)) {
                    $erroresFormato[] = "Fila {$filaNum}: Hora de entrada T6 ({$horaEntrada}) inválida.";
                }

                $insertData[] = [
                    'unidad_id' => $unidadId,
                    'ruta' => $rutaStr,
                    'corridas' => $corridaNum,
                    'numero_tarjeton' => trim($fila['TARJETON'] ?? null),
                    'hora_salida_patio' => $horaSalida ?: null,
                    'acople' => $horaAcople ?: null,
                    'estatus' => 'operacion',
                ];

                if ($horaEntrada) {
                    $entradasT6Data[] = [
                        'fecha' => $mananaFecha,
                        'unidad_id' => $unidadId,
                        'hora_entrada_t6' => $horaEntrada,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            if (!empty($erroresFormato)) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'message' => 'Errores de validación en el Excel',
                    'errores' => $erroresFormato
                ], 422);
            }

            // Las unidades que no vinieron en el excel, se ponen en reserva
            $unidadesProcesadas = array_unique($unidadesProcesadas);
            foreach ($unidades as $uEco => $uId) {
                if (!in_array($uId, $unidadesProcesadas)) {
                    $insertData[] = [
                        'unidad_id' => $uId,
                        'estatus' => 'reserva',
                    ];
                }
            }

            // Insertar todo
            foreach ($insertData as $data) {
                \Illuminate\Support\Facades\DB::table('informacion_operativa_manana')->insert($data);
            }

            if (!empty($entradasT6Data)) {
                \Illuminate\Support\Facades\DB::table('entradas_t6')->insert($entradasT6Data);
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'message' => 'Programación del día siguiente cargada exitosamente.',
                'total' => count($insertData)
            ], 200);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            \Log::error('Error cargando Excel: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al cargar programación',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
`;

// Injectar método al final
content = content.replace(/}[\s\n]*$/s, '\n' + injection);

// Reemplazar la lógica de copia a programacion_inicial para que SOLO copie los de excel (o los que no son reserva automática)
// Primero, buscamos el lugar donde se arma $inicialRow y lo metemos si no es reserva.
// The previous patch added `// Prepare for programacion_inicial`. Let's find it.

const updatedCopyLogic = `
                    // Prepare for programacion_inicial
                    // Si el estatus es 'reserva', no lo guardamos en la tabla de programación inicial porque
                    // queremos que solo quede "lo del excel" (las que realmente se programaron a ruta)
                    if (($insertRow['estatus'] ?? '') !== 'reserva') {
                        $inicialRow = $insertRow;
                        $inicialRow['fecha'] = $fechaHoy;
                        $inicialRow['created_at'] = now();
                        $inicialRow['updated_at'] = now();
                        $inicialInsert[] = $inicialRow;
                    }
`;

content = content.replace(/\/\/ Prepare for programacion_inicial[\s\S]*?\$inicialInsert\[\] = \$inicialRow;/m, updatedCopyLogic.trim());

fs.writeFileSync('laravel-api/app/Http/Controllers/API/DespachoController.php', content, 'utf8');
