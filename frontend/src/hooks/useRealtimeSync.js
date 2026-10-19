import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import API_BASE from '../config/api';

const BROADCAST_CHANNEL_NAME = 'acotma_realtime_sync';

// Instancia compartida de BroadcastChannel para pestañas del mismo navegador
let sharedChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    sharedChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('[RealtimeSync] BroadcastChannel no soportado:', e);
}

/**
 * Función global para notificar a otras pestañas instantáneamente (0ms)
 * tras guardar un cambio en la interfaz local.
 */
export function broadcastUnitChange(version = null) {
  try {
    const v = version || String(Date.now());
    if (sharedChannel) {
      sharedChannel.postMessage({ type: 'UNIT_UPDATE', version: v });
    }
    window.dispatchEvent(new CustomEvent('unidades_version_change', { detail: { version: v } }));
  } catch (err) {
    console.warn('[RealtimeSync] Error emitiendo broadcast local:', err);
  }
}

/**
 * Hook global de sincronización en tiempo real.
 * Invalida automáticamente las cachés de React Query en cuanto cualquier
 * usuario (en la misma máquina o en cualquier otra computadora de la red/producción)
 * realice un cambio de estatus, conductor, horario o asignación.
 */
export function useRealtimeSync(options = {}) {
  const { enabled = true, intervalMs = 1500 } = options;
  const queryClient = useQueryClient();
  const lastVersionRef = useRef(null);
  const isFetchingRef = useRef(false);

  const invalidateUnitQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['unidades-list'] });
    queryClient.invalidateQueries({ queryKey: ['unidades-list-mesacontrol'] });
    queryClient.invalidateQueries({ queryKey: ['unidades-list-mantenimiento'] });
    queryClient.invalidateQueries({ queryKey: ['unidades-list-encierro'] });
    queryClient.invalidateQueries({ queryKey: ['unidades-reserva-reemplazo'] });
    queryClient.invalidateQueries({ queryKey: ['unidad-detalle'] });
    queryClient.invalidateQueries({ queryKey: ['unidadesDashboard'] });
    queryClient.invalidateQueries({ queryKey: ['conteo-unidades-global'] });
    queryClient.invalidateQueries({ queryKey: ['programacion-apertura-dia'] });
    queryClient.invalidateQueries({ queryKey: ['programacion-apertura-resumen'] });
    queryClient.invalidateQueries({ queryKey: ['monitoreo-conductores-dia'] });
    queryClient.invalidateQueries({ queryKey: ['despacho-hoy'] });
    queryClient.invalidateQueries({ queryKey: ['conductores-list'] });
    queryClient.invalidateQueries({ queryKey: ['maniobristas-list'] });
  }, [queryClient]);

  const checkVersion = useCallback(async () => {
    if (isFetchingRef.current || !enabled) return;
    isFetchingRef.current = true;

    try {
      const response = await fetch(`${API_BASE}/api/unidades/version`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });

      if (!response.ok) return;

      const data = await response.json();
      const currentVersion = data?.version;

      if (currentVersion) {
        if (lastVersionRef.current === null) {
          // Primera carga: memorizar versión inicial sin forzar refetch
          lastVersionRef.current = currentVersion;
        } else if (lastVersionRef.current !== currentVersion) {
          // La versión cambió en el servidor (alguien hizo un cambio en otra computadora)
          lastVersionRef.current = currentVersion;
          invalidateUnitQueries();
          window.dispatchEvent(new CustomEvent('unidades_version_change', { detail: { version: currentVersion } }));
        }
      }
    } catch (err) {
      // Fallo de red silencioso para no interrumpir al usuario
    } finally {
      isFetchingRef.current = false;
    }
  }, [enabled, invalidateUnitQueries]);

  useEffect(() => {
    if (!enabled) return;

    // 1. Escuchar mensajes instantáneos entre pestañas del mismo navegador (0ms)
    const handleBroadcastMessage = (event) => {
      if (event?.data?.type === 'UNIT_UPDATE' || event?.data?.tipo === 'CAMBIO_ESTATUS' || event?.data?.action === 'estatus_updated') {
        if (event.data?.version && lastVersionRef.current !== event.data.version) {
          lastVersionRef.current = event.data.version;
        }
        invalidateUnitQueries();
      }
    };

    let legacyChannel = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        legacyChannel = new BroadcastChannel('unidades_estatus_channel');
        legacyChannel.addEventListener('message', handleBroadcastMessage);
      }
    } catch (e) {}

    if (sharedChannel) {
      sharedChannel.addEventListener('message', handleBroadcastMessage);
    }

    // 2. Heartbeat rápido para detectar cambios entre diferentes computadoras
    let timerId = null;

    const scheduleNextCheck = () => {
      const currentDelay = document.hidden ? 5000 : intervalMs;
      timerId = setTimeout(async () => {
        await checkVersion();
        scheduleNextCheck();
      }, currentDelay);
    };

    // Ejecutar chequeo inicial
    checkVersion();
    scheduleNextCheck();

    // 3. Chequeo inmediato cuando la ventana recupere el foco
    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        checkVersion();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      if (timerId) clearTimeout(timerId);
      if (sharedChannel) {
        sharedChannel.removeEventListener('message', handleBroadcastMessage);
      }
      if (legacyChannel) {
        legacyChannel.removeEventListener('message', handleBroadcastMessage);
        legacyChannel.close();
      }
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [enabled, intervalMs, checkVersion, invalidateUnitQueries]);
}
