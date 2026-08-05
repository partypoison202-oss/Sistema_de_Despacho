// src/pages/MesaControl/DashboardMesaControl.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { transportModules } from '../../config/transportModules';
import '../Mantenimiento/Mantenimiento.css'; // Reutiliza el CSS de Mantenimiento
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function DashboardMesaControl() {
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Precarga de datos (igual que en Mantenimiento)
  useEffect(() => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) return;

    transportModules.forEach((modulo) => {
      queryClient.prefetchQuery({
        queryKey: ['unidades-list', modulo.id],
        queryFn: async () => {
          const respuesta = await fetch(`${API_BASE}/api/unidades/listar/${modulo.id}`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (!respuesta.ok) return [];
          const datos = await respuesta.json();
          const formatearEco = (v) => `ECO${String(v ?? '').padStart(3, '0')}`;
          return (Array.isArray(datos) ? datos : []).map((u) => ({
            eco: String(u.numero_eco ?? '').padStart(3, '0'),
            tarjeton: String(u.tarjeton ?? '').trim(),
            display: formatearEco(u.numero_eco),
            estado: u.estatus || 'operacion',
          }));
        },
        staleTime: 60000,
      });
    });

    // Precarga conductores y rutas (opcional, pero útil)
    queryClient.prefetchQuery({
      queryKey: ['mesa-conductores'],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/api/conductores`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data)
          ? data.map((c) => ({
              id: c.tarjeton,
              tarjeton: c.tarjeton,
              nombre: c.nombre,
              estado_servicio: c.estado_servicio,
            }))
          : [];
      },
      staleTime: 30 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ['mesa-rutas'],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/api/despacho/rutas`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return { troncales: [], alimentadoras: [] };
        return res.json();
      },
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient]);

  const normalizarNumeroEco = (valor) => {
    const digitos = String(valor ?? '').trim().toUpperCase().match(/\d+/)?.[0] ?? '';
    return digitos.padStart(3, '0');
  };

  const handleBuscarUnidad = async (event) => {
    event?.preventDefault();

    const eco = normalizarNumeroEco(busquedaEco);
    if (!eco || eco === '000') {
      Swal.fire({
        icon: 'warning',
        title: 'Ingrese un número económico',
        text: 'Escriba el número de la unidad que desea buscar.',
        confirmButtonColor: '#601a2a',
      });
      return;
    }

    const allCached = transportModules.every(m => queryClient.getQueryData(['unidades-list', m.id])?.length > 0);
    if (!allCached) setBuscandoUnidad(true);

    try {
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const resultados = await Promise.all(
        transportModules.map(async (modulo) => {
          try {
            const cachedData = queryClient.getQueryData(['unidades-list', modulo.id]);
            let unidades = cachedData || [];

            if (unidades.length === 0) {
              const respuesta = await fetch(`${API_BASE}/api/unidades/listar/${modulo.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (respuesta.ok) {
                const datos = await respuesta.json();
                unidades = Array.isArray(datos) ? datos : [];
              }
            }
            const unidadEncontrada = unidades.find((unidad) => {
              const valorEco = unidad.numero_eco !== undefined ? unidad.numero_eco : unidad.eco;
              const numeroEcoUnidad = normalizarNumeroEco(valorEco ?? '');
              return numeroEcoUnidad === eco;
            });

            return unidadEncontrada ? { modulo, unidad: unidadEncontrada } : null;
          } catch (error) {
            console.error(`Error al consultar ${modulo.id}:`, error);
            return null;
          }
        })
      );

      const coincidencia = resultados.find(Boolean);
      if (coincidencia) {
        navigate(`/mesa-control/${coincidencia.modulo.id}?eco=${eco}`);
        return;
      }

      Swal.fire({
        icon: 'info',
        title: 'No se encontró la unidad',
        text: `No existe una unidad con el número económico ${eco}.`,
        confirmButtonColor: '#601a2a',
      });
    } catch (error) {
      console.error('Error al buscar la unidad:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo completar la búsqueda en este momento.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setBuscandoUnidad(false);
    }
  };

  // Conteo de unidades (opcional, puedes mantenerlo)
  const fetchConteos = async () => {
    const response = await fetch(`${API_BASE}/api/despacho/conteo-unidades`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
      },
    });
    if (!response.ok) throw new Error('Error de conexion');
    return response.json();
  };

  const { data: conteos = {}, isLoading: cargando } = useQuery({
    queryKey: ['conteo-unidades-global'],
    queryFn: fetchConteos,
    refetchInterval: 30000,
  });

  return (
    <div className="mantenimiento"> {/* Usamos la misma clase que Mantenimiento para heredar estilos */}
      <Header />
      <main className="mantenimiento__main">
        <p className="mantenimiento__eyebrow text-[#c5a059]">Mesa de Control</p>
        <h1 className="mantenimiento__title text-gray-900">Flota de Unidades</h1>
        <p className="mantenimiento__subtitle text-gray-500">
          Toque la imagen del transporte para gestionar la unidad
        </p>

        <form className="mantenimiento__search" onSubmit={handleBuscarUnidad}>
          <input
            type="text"
            value={busquedaEco}
            onChange={(event) => setBusquedaEco(event.target.value.replace(/\D/g, '').substring(0, 3))}
            placeholder="Buscar por número económico"
            className="mantenimiento__search-input text-gray-900 placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="mantenimiento__search-button"
            disabled={!busquedaEco || buscandoUnidad || parseInt(busquedaEco, 10) === 0}
          >
            {buscandoUnidad ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        <div className="mantenimiento__grid">
          {transportModules.map((modulo) => (
            <TransportCard
              key={modulo.id}
              title={modulo.title}
              subtitle={modulo.subtitle}
              image={modulo.image}
              route={`/mesa-control/${modulo.id}`}
              cantidad={conteos[modulo.id] || 0}
              cargando={cargando}
            />
          ))}
        </div>
      </main>
    </div>
  );
}