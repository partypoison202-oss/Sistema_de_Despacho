<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UsuarioModulo extends Model
{
    protected $table    = 'usuario_modulos';
    protected $fillable = ['usuario_id', 'modulo_codigo'];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
