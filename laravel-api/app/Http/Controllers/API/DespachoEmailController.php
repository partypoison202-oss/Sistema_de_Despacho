<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class DespachoEmailController extends Controller
{
    public function enviarPdfFortaleza(Request $request)
    {
        $request->validate([
            'pdf_base64' => 'required|string',
            'nombre_archivo' => 'required|string',
        ]);

        $pdfBinario = base64_decode($request->input('pdf_base64'));
        $nombreArchivo = $request->input('nombre_archivo');
        $destinatario = 'fortalezacggo015@gmail.com';

        try {
            Mail::send([], [], function ($message) use ($destinatario, $pdfBinario, $nombreArchivo) {
                $fecha = now()->format('d/m/Y');
                $message
                    ->to($destinatario)
                    ->subject("Programación Operativa Diaria — {$fecha}")
                    ->html("<p>Se adjunta la programación operativa del día <strong>{$fecha}</strong>.</p>")
                    ->attachData($pdfBinario, $nombreArchivo, ['mime' => 'application/pdf']);
            });

            return response()->json(['status' => 'success', 'message' => 'PDF enviado correctamente.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}