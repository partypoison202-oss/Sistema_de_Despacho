<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada exitosamente'
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

    /**
     * Resuelve los módulos disponibles para el usuario, aplicando
     * fallback inteligente por rol en caso de no tener módulos asignados en BD.
     */
    private function resolverModulosUsuario($user): array
    {
        $modulos = $user->modulos()->pluck('modulo_codigo')->toArray();

        if (empty($modulos) && $user->role) {
            $defaultModulesByRole = [
                'ADMINISTRADOR'        => [
                    'despacho','encierro','capturista','relevos','mantenimiento',
                    'centro_control','historial','titan','infraccion','mesa_control',
                    'operadores','maniobristas','carga_combustible','general'
                ],
                'LECTURA'              => [
                    'despacho','encierro','capturista','relevos','mantenimiento',
                    'centro_control','historial','titan','infraccion','mesa_control',
                    'operadores','maniobristas','carga_combustible','general'
                ],
                'DESPACHO'             => ['despacho'],
                'PLATAFORMA'           => ['mesa_control'],
                'MESA_CONTROL'         => ['mesa_control', 'relevos', 'centro_control'],
                'PROGRAMACION'         => ['capturista', 'relevos'],
                'GESTOR_OPERADORES'    => ['operadores'],
                'ENCIERRO'             => ['encierro'],
                'CENTRO_CONTROL'       => ['centro_control'],
                'TITAN'                => ['titan'],
                'INFRACCION'           => ['infraccion'],
                'GENERAL'              => ['general'],
                'MANTENIMIENTO'        => ['mantenimiento', 'encierro', 'carga_combustible'],
                'CARGA_DE_COMBUSTIBLE' => ['carga_combustible'],
            ];

            // Caso especial usuario Miguel_Odon (perfil mixto)
            if ($user->usuario === 'Miguel_Odon') {
                return ['despacho', 'operadores'];
            }

            return $defaultModulesByRole[$user->role->codigo] ?? [];
        }

        return $modulos;
    }
}
