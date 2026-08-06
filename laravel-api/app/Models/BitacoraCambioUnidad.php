<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BitacoraCambioUnidad extends Model
{
    protected $table = 'bitacora_cambios_unidades';

    protected $fillable = [
        'fecha',
        'unidad_id',
        'usuario_id',
        'tipo_accion',
        'estatus_anterior',
        'estatus_nuevo',
        'detalles',
    ];

    public function unidad()
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
