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

        // Cargar módulos del usuario
        $modulos = $user->modulos()->pluck('modulo_codigo')->toArray();

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
        $modulos = $user->modulos()->pluck('modulo_codigo')->toArray();

        return response()->json(
            array_merge($user->toArray(), ['modulos' => $modulos])
        );
    }
}
