<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ObservacionCatalogoController extends Controller
{
    public function index()
    {
        $observaciones = \App\Models\ObservacionCatalogo::orderBy('clave')->get();
        return response()->json($observaciones);
    }
}
