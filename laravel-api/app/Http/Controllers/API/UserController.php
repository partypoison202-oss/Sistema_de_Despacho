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
        $users = User::with('role')
            ->where('usuario', '!=', 'sitmah_root')
            ->orderBy('id', 'asc')
            ->get();
        return response()->json($users);
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
            'usuario' => ['required', 'string', 'max:50', 'unique:usuarios', 'regex:/^[a-zA-Z0-9_.]+$/'],
            'contrasena' => ['required', 'string', 'min:6', 'regex:/^[\x20-\x7E]+$/'],
            'rol_id' => 'required|integer|exists:roles,id',
            'foto' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048'
        ], [
            'usuario.regex' => 'El usuario no debe contener acentos ni caracteres especiales.',
            'contrasena.regex' => 'La contraseña no debe contener acentos.'
        ]);

        $fotoBase64 = null;
        if ($request->hasFile('foto')) {
            $fotoBase64 = $this->fileToBase64($request->file('foto'));
        }

        $user = User::create([
            'nombre_completo' => $request->nombre_completo,
            'usuario' => $request->usuario,
            'contrasena' => Hash::make($request->contrasena),
            'rol_id' => $request->rol_id,
            'foto_url' => $fotoBase64
        ]);

        return response()->json($user->load('role'), 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'nombre_completo' => 'sometimes|string|max:150',
            'usuario' => ['sometimes', 'string', 'max:50', 'unique:usuarios,usuario,'.$id, 'regex:/^[a-zA-Z0-9_.]+$/'],
            'contrasena' => ['nullable', 'string', 'min:6', 'regex:/^[\x20-\x7E]+$/'],
            'rol_id' => 'sometimes|integer|exists:roles,id',
            'activo' => 'sometimes|boolean',
            'foto' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048'
        ], [
            'usuario.regex' => 'El usuario no debe contener acentos ni caracteres especiales.',
            'contrasena.regex' => 'La contraseña no debe contener acentos.'
        ]);

        $data = $request->except(['contrasena', 'activo', 'foto']);

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

        // Ya no hay archivo físico que eliminar: foto_url vive en la BD
        // como Base64, así que $user->delete() se encarga de todo.
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente']);
    }

    public function roles()
    {
        $roles = Role::all();
        return response()->json($roles);
    }
}