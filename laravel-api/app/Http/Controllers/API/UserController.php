<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class UserController extends Controller
{
    /**
     * Calcula la presencia en línea y formato de última conexión
     * combinando caché y tokens de sesión compartidos en la base de datos Neon.
     */
    private function calcularPresencia(array $userIds): array
    {
        if (empty($userIds)) {
            return [];
        }

        $actividadTokens = DB::table('personal_access_tokens')
            ->where('tokenable_type', 'App\Models\User')
            ->whereIn('tokenable_id', $userIds)
            ->whereNotNull('last_used_at')
            ->groupBy('tokenable_id')
            ->select('tokenable_id', DB::raw('MAX(last_used_at) as ultimo_uso'))
            ->pluck('ultimo_uso', 'tokenable_id')
            ->toArray();

        // 2. Obtener la última conexión persistida en la tabla usuarios (incluso si cerró sesión y borró su token)
        $ultimasConexiones = [];
        try {
            $ultimasConexiones = DB::table('usuarios')
                ->whereIn('id', $userIds)
                ->whereNotNull('ultima_conexion')
                ->pluck('ultima_conexion', 'id')
                ->toArray();
        } catch (\Throwable $e) {
            // Silencioso si la columna 'ultima_conexion' aún no ha sido inyectada en la BD del servidor
        }

        $tz = config('app.timezone', 'America/Mexico_City');
        $ahora = Carbon::now($tz);
        $resultado = [];

        foreach ($userIds as $id) {
            $isOnlineFromCache = Cache::has('user_online_' . $id);
            $lastSeenFromCache = Cache::get('user_last_seen_' . $id);

            // Determinar la fecha/hora más reciente entre el token de sesión y el registro del usuario
            $fechaToken = isset($actividadTokens[$id]) ? Carbon::parse($actividadTokens[$id], $tz) : null;
            $fechaUsuario = isset($ultimasConexiones[$id]) ? Carbon::parse($ultimasConexiones[$id], $tz) : null;

            $carbonUltimo = null;
            if ($fechaToken && $fechaUsuario) {
                $carbonUltimo = $fechaToken->greaterThan($fechaUsuario) ? $fechaToken : $fechaUsuario;
            } else {
                $carbonUltimo = $fechaToken ?: $fechaUsuario;
            }

            // En línea SOLAMENTE si tiene token activo en personal_access_tokens en los últimos 5 minutos O caché activa
            $isOnlineFromToken = ($fechaToken && abs($ahora->diffInMinutes($fechaToken, false)) <= 5);
            $isOnline = $isOnlineFromCache || $isOnlineFromToken;
            $lastSeenText = 'Sin conexión';

            if ($isOnline) {
                $lastSeenText = 'En línea';
            } elseif ($carbonUltimo) {
                // Mostrar la hora exacta de la última vez que estuvo activo
                if ($carbonUltimo->isToday()) {
                    $lastSeenText = 'Hoy ' . $carbonUltimo->format('g:i A');
                } elseif ($carbonUltimo->isYesterday()) {
                    $lastSeenText = 'Ayer ' . $carbonUltimo->format('g:i A');
                } else {
                    $lastSeenText = $carbonUltimo->format('d/m/Y g:i A');
                }
            }

            $resultado[$id] = [
                'is_online' => $isOnline,
                'last_seen' => $carbonUltimo ? $carbonUltimo->toIso8601String() : $lastSeenFromCache,
                'last_seen_text' => $lastSeenText,
            ];
        }

        return $resultado;
    }

    public function index()
    {
        $users = User::with(['role', 'modulos'])
            ->where('usuario', '!=', 'sitmah_root')
            ->orderBy('id', 'asc')
            ->get();

        $presencias = $this->calcularPresencia($users->pluck('id')->toArray());

        $users->transform(function ($u) use ($presencias) {
            $info = $presencias[$u->id] ?? null;
            $u->is_online = $info['is_online'] ?? false;
            $u->last_seen = $info['last_seen'] ?? null;
            $u->last_seen_text = $info['last_seen_text'] ?? 'Sin conexión';
            return $u;
        });

        return response()->json($users);
    }

    public function onlineStatuses()
    {
        $userIds = User::where('usuario', '!=', 'sitmah_root')->pluck('id')->toArray();
        $statuses = $this->calcularPresencia($userIds);
        return response()->json($statuses);
    }

    /**
     * Convierte un archivo subido a un data URI Base64
     * (ej: "data:image/png;base64,AAAA...")
     */
    private function fileToBase64($file): string
    {
        $mimeType = $file->getMimeType();
        $base64 = base64_encode(file_get_contents($file->getRealPath()));
        return "data:{$mimeType};base64,{$base64}";
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre_completo' => 'required|string|max:150',
            'usuario' => ['required', 'string', 'max:50', 'unique:usuarios', 'regex:/^[a-zA-Z0-9_.ñÑ]+$/'],
            'contrasena' => ['required', 'string', 'min:6', 'regex:/^[\x20-\x7E]+$/'],
            'rol_id' => 'nullable|integer|exists:roles,id',
            'nuevo_rol_nombre' => 'nullable|string|max:100',
            'foto' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048'
        ], [
            'usuario.regex' => 'El usuario solo puede contener letras, números, puntos, guiones bajos y la letra ñ.',
            'contrasena.regex' => 'La contraseña no debe contener acentos.'
        ]);

        $fotoBase64 = null;
        if ($request->hasFile('foto')) {
            $fotoBase64 = $this->fileToBase64($request->file('foto'));
        }

        $rolId = $request->rol_id;
        if ($request->filled('nuevo_rol_nombre')) {
            $nuevoRolNombreRaw = trim($request->nuevo_rol_nombre);
            $nuevoRolCodigo = str_replace(' ', '_', strtoupper($nuevoRolNombreRaw));
            
            $rol = \Illuminate\Support\Facades\DB::table('roles')->where('codigo', $nuevoRolCodigo)->first();
            if (!$rol) {
                $rolId = \Illuminate\Support\Facades\DB::table('roles')->insertGetId([
                    'codigo' => $nuevoRolCodigo,
                    'nombre' => $nuevoRolNombreRaw,
                ]);
            } else {
                $rolId = $rol->id;
            }
        }

        $user = User::create([
            'nombre_completo' => $request->nombre_completo,
            'usuario' => $request->usuario,
            'contrasena' => Hash::make($request->contrasena),
            'rol_id' => $rolId,
            'foto_url' => $fotoBase64
        ]);

        // Guardar los módulos que el admin seleccionó manualmente.
        // Si no viene ninguno en el request, se deja sin accesos.
        $modulos = $request->input('modulos', []);
        $modulosSoloLectura = $request->input('modulos_solo_lectura', []);
        $this->guardarModulos($user->id, $modulos, $modulosSoloLectura);

        return response()->json($user->load('role'), 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'nombre_completo' => 'sometimes|string|max:150',
            'usuario' => ['sometimes', 'string', 'max:50', 'unique:usuarios,usuario,'.$id, 'regex:/^[a-zA-Z0-9_.ñÑ]+$/'],
            'contrasena' => ['nullable', 'string', 'min:6', 'regex:/^[\x20-\x7E]+$/'],
            'rol_id' => 'nullable|integer|exists:roles,id',
            'nuevo_rol_nombre' => 'nullable|string|max:100',
            'activo' => 'sometimes|boolean',
            'foto' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048'
        ], [
            'usuario.regex' => 'El usuario solo puede contener letras, números, puntos, guiones bajos y la letra ñ.',
            'contrasena.regex' => 'La contraseña no debe contener acentos.'
        ]);

        $data = $request->except(['contrasena', 'activo', 'foto', 'nuevo_rol_nombre']);

        if ($request->filled('nuevo_rol_nombre')) {
            $nuevoRolNombreRaw = trim($request->nuevo_rol_nombre);
            $nuevoRolCodigo = str_replace(' ', '_', strtoupper($nuevoRolNombreRaw));
            
            $rol = \Illuminate\Support\Facades\DB::table('roles')->where('codigo', $nuevoRolCodigo)->first();
            if (!$rol) {
                $data['rol_id'] = \Illuminate\Support\Facades\DB::table('roles')->insertGetId([
                    'codigo' => $nuevoRolCodigo,
                    'nombre' => $nuevoRolNombreRaw,
                ]);
            } else {
                $data['rol_id'] = $rol->id;
            }
        }

        if (isset($data['nombre_completo'])) {
            $nombre = trim((string)$data['nombre_completo']);
            if ($nombre === 'undefined' || $nombre === '' || strtolower($nombre) === 'null') {
                unset($data['nombre_completo']);
            } else {
                $data['nombre_completo'] = $nombre;
            }
        }

        if ($request->filled('contrasena')) {
            $data['contrasena'] = Hash::make($request->contrasena);
        }

        if ($request->hasFile('foto')) {
            // Ya no hay archivo físico que borrar del disco: al guardar
            // Base64 en la BD, basta con sobrescribir la columna foto_url.
            $data['foto_url'] = $this->fileToBase64($request->file('foto'));
        }

        if (count($data) > 0) {
            $user->update($data);
        }

        if ($request->has('rol_id')) {
            // NO re-asignamos módulos automáticamente por rol;
            // solo actualizamos el rol del usuario.
        }

        // Siempre actualizar módulos si el frontend indica que los enviamos.
        // Esto permite quitar TODOS los módulos si la lista llega vacía.
        if ($request->has('sync_modulos')) {
            $modulos = $request->input('modulos', []);
            $modulosSoloLectura = $request->input('modulos_solo_lectura', []);
            $this->guardarModulos($user->id, $modulos, $modulosSoloLectura);
        }

        if ($request->has('activo')) {
            $isActivo = filter_var($request->activo, FILTER_VALIDATE_BOOLEAN);
            // Actualizar usando Query Builder para evitar el 'cast' del modelo Eloquent
            \Illuminate\Support\Facades\DB::table('usuarios')
                ->where('id', $id)
                ->update(['activo' => $isActivo ? 'true' : 'false']);
            $user->activo = $isActivo;
        }

        return response()->json($user->load('role'));
    }

    /**
     * Guarda directamente los módulos que el administrador seleccionó para el usuario.
     */
    private function guardarModulos($userId, array $modulos, array $modulosSoloLectura = []): void
    {
        \Illuminate\Support\Facades\DB::table('usuario_modulos')->where('usuario_id', $userId)->delete();

        if (!empty($modulos)) {
            $inserts = array_map(fn($m) => [
                'usuario_id'    => $userId,
                'modulo_codigo' => $m,
                'solo_lectura'  => in_array($m, $modulosSoloLectura) ? 'true' : 'false',
                'created_at'    => now(),
                'updated_at'    => now(),
            ], $modulos);
            \Illuminate\Support\Facades\DB::table('usuario_modulos')->insert($inserts);
        }
    }

    /**
     * @deprecated — ya no se usa para asignar módulos automáticamente.
     * Se mantiene por si se necesita como referencia futura.
     */
    private function sincronizarModulosPorRol($userId, $rolId): void
    {
        $role = Role::find($rolId);
        if (!$role) return;

        $defaultModulesByRole = [
            'ADMINISTRADOR'        => [
                'despacho','encierro','capturista','relevos','mantenimiento',
                'centro_control','historial','titan','infraccion','mesa_control',
                'operadores','maniobristas','carga_combustible','general','programacion_pasteles'
            ],
            'LECTURA'              => [
                'despacho','encierro','capturista','relevos','mantenimiento',
                'centro_control','historial','titan','infraccion','mesa_control',
                'operadores','maniobristas','carga_combustible','general','programacion_pasteles'
            ],
            'DESPACHO'             => ['despacho', 'historial'],
            'PLATAFORMA'           => ['mesa_control', 'historial'],
            'MESA_CONTROL'         => ['mesa_control', 'relevos', 'centro_control', 'historial'],
            'MESA_DE_CONTROL'      => ['mesa_control', 'relevos', 'centro_control', 'historial'],
            'PROGRAMACION'         => ['capturista', 'relevos', 'historial'],
            'PASTELES'             => ['centro_control', 'mesa_control', 'programacion_pasteles', 'encierro', 'historial'],
            'PROGRAMACION_PASTELES' => ['centro_control', 'mesa_control', 'programacion_pasteles', 'encierro', 'historial'],
            'GESTOR_OPERADORES'    => ['operadores', 'historial'],
            'ENCIERRO'             => ['encierro', 'historial'],
            'CENTRO_CONTROL'       => ['centro_control', 'historial'],
            'TITAN'                => ['titan'],
            'INFRACCION'           => ['infraccion'],
            'GENERAL'              => ['general'],
            'MANTENIMIENTO'        => ['mantenimiento', 'carga_combustible', 'historial'],
            'CARGA_DE_COMBUSTIBLE' => ['carga_combustible'],
        ];

        $modulos = $defaultModulesByRole[$role->codigo] ?? [];
        if (!empty($modulos)) {
            \Illuminate\Support\Facades\DB::table('usuario_modulos')->where('usuario_id', $userId)->delete();
            $inserts = array_map(fn($m) => [
                'usuario_id' => $userId,
                'modulo_codigo' => $m,
                'created_at' => now(),
                'updated_at' => now(),
            ], $modulos);
            \Illuminate\Support\Facades\DB::table('usuario_modulos')->insert($inserts);
        }
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);

        try {
            $user->delete();
            return response()->json(['message' => 'Usuario eliminado correctamente']);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() == '23503' || $e->getCode() == '1451') {
                return response()->json([
                    'message' => 'No se puede eliminar el usuario porque tiene registros de operación o movimientos asociados. Te recomendamos desactivarlo (cambiar estado a Inactivo) en lugar de eliminarlo.'
                ], 409);
            }
            return response()->json(['message' => 'Error de base de datos al intentar eliminar el usuario.'], 500);
        }
    }

    public function roles()
    {
        $roles = Role::all();
        return response()->json($roles);
    }

    public function cerrarSesion($id)
    {
        $user = User::findOrFail($id);

        try {
            // Revocar todos los tokens de acceso del usuario
            $user->tokens()->delete();
            \Laravel\Sanctum\PersonalAccessToken::where('tokenable_id', $user->id)->delete();

            // Limpiar presencia en caché
            \Illuminate\Support\Facades\Cache::forget('user_online_' . $user->id);
            \Illuminate\Support\Facades\Cache::forget('user_last_seen_' . $user->id);
            \Illuminate\Support\Facades\Cache::forget('user_db_sync_' . $user->id);

            // Registrar en log del sistema
            \Illuminate\Support\Facades\Log::info(
                "CERRAR_SESION_REMOTA: Se cerró la sesión activa del usuario {$user->usuario} (ID: {$user->id})"
            );

            return response()->json([
                'message' => "La sesión de {$user->usuario} ha sido finalizada correctamente."
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error al cerrar la sesión: ' . $e->getMessage()
            ], 500);
        }
    }
}