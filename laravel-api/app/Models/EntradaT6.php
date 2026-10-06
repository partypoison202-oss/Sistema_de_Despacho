<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EntradaT6 extends Model
{
    use HasFactory;

    protected $table = 'entradas_t6';

    protected $fillable = [
        'fecha',
        'unidad_id',
        'hora_entrada_t6',
    ];

    public function unidad()
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }
}
