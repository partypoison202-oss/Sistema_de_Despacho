import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import API_BASE from '../config/api';
import { transportModules } from '../config/transportModules';
import { encierroModules } from '../config/encierroModules';

export function useGlobalPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Prefetch Conductores
    queryClient.prefetchQuery({
      queryKey: ['conductores-list'],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/api/conductores`, { headers });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.map(c => ({
          id: c.tarjeton, tarjeton: c.tarjeton, nombre: c.nombre,
          estado_servicio: c.estado_servicio, tipo_tarjeton: c.tipo_tarjeton
        })) : [];
      },
      staleTime: 60000,
    });

    // Prefetch Maniobristas
    queryClient.prefetchQuery({
      queryKey: ['maniobristas-list'],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/api/conductores`, { headers });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data
          .filter(m => m.estado_servicio === 'maniobrista')
          .map(m => ({
            id: m.tarjeton, tarjeton: m.tarjeton, nombre: m.nombre,
            estado_servicio: m.estado_servicio, tipo_tarjeton: m.tipo_tarjeton
          })) : [];
      },
      staleTime: 60000,
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
      socio: String(u.socio ?? '').trim()
    });

    // Prefetch transport modules (Mesa Control / Despacho / Mantenimiento)
    transportModules.forEach((modulo) => {
      // Para Despacho y Mesa Control
      queryClient.prefetchQuery({
        queryKey: ['unidades-list', modulo.id],
        queryFn: async () => {
          const res = await fetch(`${API_BASE}/api/unidades/listar/${modulo.id}`, { headers });
          if (!res.ok) return [];
          const data = await res.json();
          return (Array.isArray(data) ? data : []).map(mapUnidad);
        },
        staleTime: 60000,
      });

      // Para Mantenimiento
      queryClient.prefetchQuery({
        queryKey: ['unidades-list-mantenimiento', modulo.id],
        queryFn: async () => {
          const res = await fetch(`${API_BASE}/api/unidades/listar/${modulo.id}`, { headers });
          if (!res.ok) return [];
          const data = await res.json();
          return (Array.isArray(data) ? data : []).map(mapUnidad);
        },
        staleTime: 60000,
      });
    });

    // Prefetch encierro modules
    encierroModules.forEach((modulo) => {
      queryClient.prefetchQuery({
        queryKey: ['unidades-list-encierro', modulo.id],
        queryFn: async () => {
          const res = await fetch(`${API_BASE}/api/unidades/listar/${modulo.id}`, { headers });
          if (!res.ok) return [];
          const data = await res.json();
          return (Array.isArray(data) ? data : []).map(mapUnidad);
        },
        staleTime: 60000,
      });
    });

  }, [queryClient]);
}
