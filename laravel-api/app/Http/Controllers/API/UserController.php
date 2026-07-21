<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('role')->get();
        return response()->json($users);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre_completo' => 'required|string|max:150',
            'usuario' => 'required|string|max:50|unique:usuarios',
            'contrasena' => 'required|string|min:6',
            'rol_id' => 'required|integer|exists:roles,id'
        ]);

        $user = User::create([
            'nombre_completo' => $request->nombre_completo,
            'usuario' => $request->usuario,
            'contrasena' => Hash::make($request->contrasena),
            'rol_id' => $request->rol_id
        ]);

        return response()->json($user->load('role'), 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'nombre_completo' => 'sometimes|string|max:150',
            'usuario' => 'sometimes|string|max:50|unique:usuarios,usuario,'.$id,
            'contrasena' => 'nullable|string|min:6',
            'rol_id' => 'sometimes|integer|exists:roles,id',
            'activo' => 'sometimes|boolean'
        ]);

        $data = $request->except(['contrasena']);
        
        if ($request->filled('contrasena')) {
            $data['contrasena'] = Hash::make($request->contrasena);
        }

        $user->update($data);

        return response()->json($user->load('role'));
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente']);
    }

    public function roles()
    {
        $roles = Role::all();
        return response()->json($roles);
    }
}

