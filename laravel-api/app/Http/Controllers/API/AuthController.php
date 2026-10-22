<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'usuario'   => 'required|string',
            'contrasena'=> 'required|string',
        ]);

        $user = User::with('role')->where('usuario', $request->usuario)->first();

        if (!$user || !Hash::check($request->contrasena, $user->contrasena)) {
            return response()->json([
                'message' => 'Usuario o contraseña incorrectos'
            ], 401);
        }

        if (!$user->activo) {
            return response()->json([
                'message' => 'Usuario inactivo. Contacte al administrador.'
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // Registrar presencia en línea y última conexión
        $tz = config('app.timezone', 'America/Mexico_City');
        Cache::put('user_online_' . $user->id, true, now()->addMinutes(5));
        Cache::put('user_last_seen_' . $user->id, Carbon::now($tz)->toIso8601String(), now()->addDays(7));
        $user->forceFill(['ultima_conexion' => now()])->save();

        // Cargar módulos del usuario (con fallback por rol si no tiene registros)
        $modulos = $this->resolverModulosUsuario($user);

        return response()->json([
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => array_merge($user->toArray(), ['modulos' => $modulos]),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            Cache::forget('user_online_' . $user->id);
            $user->forceFill(['ultima_conexion' => now()])->save();
            $token = $user->currentAccessToken();
            if ($token) {
                $token->delete();
            }
        }

        return response()->json([
            'message' => 'Sesión cerrada exitosamente'
        ]);
    }

    public function heartbeat(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $tz = config('app.timezone', 'America/Mexico_City');
            Cache::put('user_online_' . $user->id, true, now()->addMinutes(5));
            Cache::put('user_last_seen_' . $user->id, Carbon::now($tz)->toIso8601String(), now()->addDays(7));

            $token = $user->currentAccessToken();
            if ($token && method_exists($token, 'forceFill')) {
                $token->forceFill(['last_used_at' => now()])->save();
            }

            $user->forceFill(['ultima_conexion' => now()])->save();
        }

        return response()->json([
            'status' => 'success',
            'is_online' => true,
            'timestamp' => now()->timestamp,
        ]);
    }

    public function me(Request $request)
    {
        $user    = $request->user()->load('role');
        $modulos = $this->resolverModulosUsuario($user);

        return response()->json(
            array_merge($user->toArray(), ['modulos' => $modulos])
        );
    }

    private function getDefaultModulesByRole(string $role, string $usuario): array
    {
        if ($usuario === 'Miguel_Odon') {
            return ['despacho', 'operadores'];
        }
        $defaults = [
            'ADMINISTRADOR'        => ['despacho','encierro','capturista','relevos','mantenimiento','centro_control','historial','titan','infraccion','mesa_control','operadores','maniobristas','carga_combustible','general','programacion_pasteles'],
            'LECTURA'              => ['despacho','encierro','capturista','relevos','mantenimiento','centro_control','historial','titan','infraccion','mesa_control','operadores','maniobristas','carga_combustible','general','programacion_pasteles'],
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
        return $defaults[$role] ?? [];
    }

    /**
     * Resuelve los módulos disponibles para el usuario, aplicando
     * fallback inteligente por rol en caso de no tener módulos asignados en BD.
     */
    private function resolverModulosUsuario($user): array
    {
        $modulosObjects = $user->modulos()->select('modulo_codigo', 'solo_lectura')->get()->toArray();
        $modulos = array_column($modulosObjects, 'modulo_codigo');
        $roleCode = $user->role->codigo ?? '';

        if ($roleCode === 'PASTELES') {
            foreach (['centro_control', 'mesa_control', 'programacion_pasteles'] as $dp) {
                if (!in_array($dp, $modulos)) {
                    $modulosObjects[] = ['modulo_codigo' => $dp, 'solo_lectura' => false];
                    $modulos[] = $dp;
                }
            }
        }

        if (in_array($roleCode, ['GESTOR_OPERADORES', 'GESTOR_DE_OPERADORES']) && !in_array('historial', $modulos)) {
            $modulosObjects[] = ['modulo_codigo' => 'historial', 'solo_lectura' => false];
            $modulos[] = 'historial';
        }

        if (empty($modulosObjects) && $roleCode !== '') {
            $rawFallbacks = $this->getDefaultModulesByRole($roleCode, $user->usuario ?? '');
            $isLecturaRole = ($roleCode === 'LECTURA');
            
            return array_map(function($fb) use ($isLecturaRole) {
                return ['modulo_codigo' => $fb, 'solo_lectura' => $isLecturaRole];
            }, $rawFallbacks);
        }

        return $modulosObjects;
    }
}
