import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import API_BASE from '../config/api';
import { transportModules } from '../config/transportModules';

export function useGlobalPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const controller = new AbortController();
    const signal = controller.signal;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 1. Prefetch Conductores y Maniobristas (1 sola llamada de red que alimenta ambas cachés)
    queryClient.prefetchQuery({
      queryKey: ['conductores-list'],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/api/conductores`, { headers, signal });
        if (!res.ok) return [];
        const data = await res.json();
        const conductores = Array.isArray(data) ? data.map(c => ({
          id: c.tarjeton, tarjeton: c.tarjeton, nombre: c.nombre,
          estado_servicio: c.estado_servicio, tipo_tarjeton: c.tipo_tarjeton
        })) : [];

        // Alimentar maniobristas en memoria sin disparar otra petición de red
        const maniobristas = conductores
          .filter(m => m.estado_servicio === 'maniobrista')
          .map(m => ({
            id: m.tarjeton, tarjeton: m.tarjeton, nombre: m.nombre,
            estado_servicio: m.estado_servicio, tipo_tarjeton: m.tipo_tarjeton
          }));
        queryClient.setQueryData(['maniobristas-list'], maniobristas);

        return conductores;
      },
      staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });

    const formatearEco = (v) => `ECO${String(v ?? '').padStart(3, '0')}`;
    const mapUnidad = (u) => ({
      eco: String(u.numero_eco ?? '').padStart(3, '0'),
      tarjeton: String(u.tarjeton ?? '').trim(),
      display: formatearEco(u.numero_eco),
      estado: String(u.estatus ?? 'operacion').trim().toLowerCase(),
      ruta: String(u.ruta ?? '').trim(),
      acople: Boolean(u.acople && String(u.acople).trim() !== '' && String(u.acople).trim() !== '0'),
      kilometraje: u.kilometraje || '',
      socio: String(u.socio ?? '').trim(),
      horaRealSalidaPatio: String(u.hora_real_salida_patio ?? '').trim(),
      hora_real_salida_patio: String(u.hora_real_salida_patio ?? '').trim(),
      horaSalidaPatio: String(u.hora_salida_patio ?? '').trim(),
      estatus: String(u.estatus ?? 'operacion').trim().toLowerCase(),
      hora_encierro: u.hora_encierro || '',
      ya_encerrada: Boolean(u.ya_encerrada),
      yaEncerrada: Boolean(u.ya_encerrada),
    });

    // 2. Prefetch módulos de transporte (1 sola llamada por módulo alimenta Despacho, Mesa Control, Mantenimiento y Encierro)
    transportModules.forEach((modulo) => {
      queryClient.prefetchQuery({
        queryKey: ['unidades-list', modulo.id],
        queryFn: async () => {
          const res = await fetch(`${API_BASE}/api/unidades/listar/${modulo.id}`, { headers, signal });
          if (!res.ok) return [];
          const data = await res.json();
          const mapped = (Array.isArray(data) ? data : []).map(mapUnidad);

          // Sincronizar en memoria caché para los otros módulos sin saturar con peticiones duplicadas
          queryClient.setQueryData(['unidades-list-mesacontrol', modulo.id], mapped);
          queryClient.setQueryData(['unidades-list-mantenimiento', modulo.id], mapped);
          queryClient.setQueryData(['unidades-list-encierro', modulo.id], mapped);

          return mapped;
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
      });
    });

    // 3. Prefetch despacho de hoy
    queryClient.prefetchQuery({
      queryKey: ['despacho-hoy'],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/api/despacho/hoy`, { headers, signal });
        if (!res.ok) return [];
        return res.json();
      },
      staleTime: 1000 * 60 * 2, // 2 minutos
    });

    return () => {
      // Al salir de la pantalla, cancelar cualquier prefetch en progreso para liberar sockets
      controller.abort();
    };
  }, [queryClient]);
}
