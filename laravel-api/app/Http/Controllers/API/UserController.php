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
            'rol_id' => 'required|integer|exists:roles,id',
            'foto' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048'
        ]);

        $fotoPath = null;
        if ($request->hasFile('foto')) {
            $fotoPath = $request->file('foto')->store('usuarios/fotos', 'public');
        }

        $user = User::create([
            'nombre_completo' => $request->nombre_completo,
            'usuario' => $request->usuario,
            'contrasena' => Hash::make($request->contrasena),
            'rol_id' => $request->rol_id,
            'foto_url' => $fotoPath
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
            'activo' => 'sometimes|boolean',
            'foto' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048'
        ]);

        $data = $request->except(['contrasena', 'activo', 'foto']);
        
        if ($request->filled('contrasena')) {
            $data['contrasena'] = Hash::make($request->contrasena);
        }

        if ($request->hasFile('foto')) {
            // Eliminar la foto anterior si existe
            $oldFoto = $user->getRawOriginal('foto_url');
            if ($oldFoto) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldFoto);
            }
            $data['foto_url'] = $request->file('foto')->store('usuarios/fotos', 'public');
        }

        if (count($data) > 0) {
            $user->update($data);
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

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        
        // Eliminar foto del disco si existe
        $oldFoto = $user->getRawOriginal('foto_url');
        if ($oldFoto) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($oldFoto);
        }
        
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente']);
    }

    public function roles()
    {
        $roles = Role::all();
        return response()->json($roles);
    }
}

