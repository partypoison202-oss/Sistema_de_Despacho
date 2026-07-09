<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Checklist extends Model
{
    protected $fillable = [
        'usuario_id',
        'tipo_unidad',
        'conductor_id',
        'economico',
        'servicio',
        'puntos',
        'dibujo',
        'fecha_hora',
        'origen',
    ];

    protected $casts = [
        'puntos'     => 'array',
        'fecha_hora' => 'datetime',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    // Alias para que los controladores puedan usar ->with('user')
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}

