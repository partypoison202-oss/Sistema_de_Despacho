<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class SyncService
{
    const CACHE_KEY = 'unidades_sync_version';

    /**
     * Notifica que ocurrió un cambio en el estado operativo de las unidades.
     */
    public static function notifyChange(): string
    {
        $version = (string) microtime(true);
        try {
            Cache::forever(self::CACHE_KEY, $version);
        } catch (\Throwable $e) {
            \Log::warning('SyncService::notifyChange cache warning: ' . $e->getMessage());
        }
        return $version;
    }

    /**
     * Obtiene la versión actual del estado de las unidades.
     */
    public static function getVersion(): string
    {
        try {
            $version = Cache::get(self::CACHE_KEY);
            if (!$version) {
                $version = (string) microtime(true);
                Cache::forever(self::CACHE_KEY, $version);
            }
            return (string) $version;
        } catch (\Throwable $e) {
            return (string) microtime(true);
        }
    }
}
