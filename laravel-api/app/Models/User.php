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

    // Accesor para obtener la URL pública de la foto
    public function getFotoUrlAttribute($value)
    {
        return $value ? asset('storage/' . $value) : null;
    }

    public function getAuthPassword()
    {
        return $this->contrasena;
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'rol_id');
    }

    protected $casts = [
        'activo' => 'boolean',
        'contrasena' => 'hashed',
    ];
}
