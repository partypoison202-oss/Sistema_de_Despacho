<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class TrackUserActivity
{
    /**
     * Registra la actividad reciente del usuario autenticado en caché.
     */
    public function handle(Request $request, Closure $next)
    {
        // Si el usuario está cerrando sesión, no registrar actividad de conexión
        if ($request->is('*/logout') || $request->is('api/logout')) {
            return $next($request);
        }

        try {
            $user = $request->user();
            if ($user && isset($user->id)) {
                $tz = config('app.timezone', 'America/Mexico_City');
                Cache::put('user_online_' . $user->id, true, now()->addMinutes(5));
                Cache::put('user_last_seen_' . $user->id, Carbon::now($tz)->toIso8601String(), now()->addDays(7));

                $token = $user->currentAccessToken();
                if ($token && method_exists($token, 'forceFill')) {
                    $token->forceFill(['last_used_at' => now()])->save();
                }

                if (!$user->ultima_conexion || now()->diffInSeconds($user->ultima_conexion) > 60) {
                    $user->forceFill(['ultima_conexion' => now()])->save();
                }
            }
        } catch (\Throwable $e) {
            // Silencioso para no interferir con la respuesta principal
        }

        return $next($request);
    }
}
