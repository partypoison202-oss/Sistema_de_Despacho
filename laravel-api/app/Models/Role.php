<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $table = 'roles';
    public $timestamps = false;

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion'
    ];

    public function users()
    {
        return $this->hasMany(User::class, 'rol_id');
    }
}
