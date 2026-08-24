<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'usuarios';

    public $timestamps = true;
    const CREATED_AT = 'fecha_creacion';
    const UPDATED_AT = 'fecha_actualizacion';

    protected $fillable = [
        'nombre_completo',
        'usuario',
        'correo',
        'contrasena',
        'activo',
        'rol_id',
        'foto_url'
    ];

    protected $hidden = [
        'contrasena',
        'remember_token',
    ];

    // Nota: se removió el accessor getFotoUrlAttribute() que anteponía
    // asset('storage/...'). Ahora foto_url guarda directamente el data URI
    // Base64 (ej: "data:image/png;base64,...") listo para usarse en <img src>.

    public function getAuthPassword()
    {
        return $this->contrasena;
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'rol_id');
    }

    public function modulos()
    {
        return $this->hasMany(\App\Models\UsuarioModulo::class, 'usuario_id');
    }

    // Retorna array plano de códigos de módulos
    public function getModulosArrayAttribute(): array
    {
        return $this->modulos()->pluck('modulo_codigo')->toArray();
    }

    protected $casts = [
        'activo' => 'boolean',
        'contrasena' => 'hashed',
    ];
}