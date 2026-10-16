// src/pages/Encierro/DashboardEncierro.jsx
import React, { useState, useRef } from 'react';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { encierroModules } from '../../config/encierroModules';
import Swal from 'sweetalert2';
import '../Dashboard/Dashboard.css';
import API_BASE from '../../config/api';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalPrefetch } from '../../hooks/useGlobalPrefetch';
import { descargarReportesGeneralesConAlerta } from '../../utils/reporteGeneralUtils';

export default function DashboardEncierro() {
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useGlobalPrefetch();

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerarReporte = () => {
    descargarReportesGeneralesConAlerta(setIsGenerating);
  };

  const fetchConteos = async () => {
    const response = await fetch(`${API_BASE}/api/despacho/conteo-unidades-encierro`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
      },
    });
    if (!response.ok) throw new Error('Error de conexion');
    return response.json();
  };

  const { data: conteos = {}, isLoading: cargando } = useQuery({
    queryKey: ['conteo-unidades-encierro-global'],
    queryFn: fetchConteos,
    staleTime: 0,        // Siempre datos frescos al cargar el dashboard
    refetchInterval: 5000, // Refrescar cada 5s para que los cambios en Despacho se reflejen rápido
  });

  const normalizarNumeroEco = (eco) => {
    if (!eco) return '';
    const num = parseInt(eco.replace(/\D/g, ''), 10);
    return isNaN(num) ? '' : num.toString().padStart(3, '0');
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

    const allCached = encierroModules.every(m => queryClient.getQueryData(['unidades-list-encierro', m.id])?.length > 0);
    if (!allCached) setBuscandoUnidad(true);

    try {
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const resultados = await Promise.all(
        encierroModules.map(async (modulo) => {
          try {
            const cachedData = queryClient.getQueryData(['unidades-list-encierro', modulo.id]);
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
            let unidadEncontrada = unidades.find((unidad) => {
              const valorEco = unidad.numero_eco !== undefined ? unidad.numero_eco : unidad.eco;
              const numeroEcoUnidad = normalizarNumeroEco(valorEco ?? '');
              return numeroEcoUnidad === eco;
            });

            // Si se encontró en caché pero no parece estar en operación ni encerrada, consultar directamente al API para obtener el estado real
            if (unidadEncontrada && !unidadEncontrada.ya_encerrada && !unidadEncontrada.yaEncerrada) {
              const estatusNorm = (unidadEncontrada.estatus || unidadEncontrada.estado || '').toLowerCase().trim();
              if (!estatusNorm.includes('operaci')) {
                try {
                  const respuesta = await fetch(`${API_BASE}/api/unidades/listar/${modulo.id}`, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  if (respuesta.ok) {
                    const datos = await respuesta.json();
                    if (Array.isArray(datos)) {
                      queryClient.setQueryData(['unidades-list-encierro', modulo.id], datos);
                      const fresco = datos.find((u) => normalizarNumeroEco(u.numero_eco ?? u.eco ?? '') === eco);
                      if (fresco) unidadEncontrada = fresco;
                    }
                  }
                } catch (e) {
                  // ignorar fallo de refresco individual
                }
              }
            }

            return unidadEncontrada ? { modulo, unidad: unidadEncontrada } : null;
          } catch (error) {
            console.error(`Error al consultar ${modulo.id}:`, error);
            return null;
          }
        })
      );

      const coincidencia = resultados.find(Boolean);
      if (coincidencia) {
        const estatusUnidad = (coincidencia.unidad.estatus || coincidencia.unidad.estado || '').toLowerCase().trim();
        const isOperacion = estatusUnidad.includes('operaci');
        const isYaEncerrada = Boolean(
          coincidencia.unidad.ya_encerrada ||
          coincidencia.unidad.yaEncerrada ||
          (coincidencia.unidad.hora_encierro && String(coincidencia.unidad.hora_encierro).trim() !== '')
        );

        if (!isOperacion && !isYaEncerrada) {
          Swal.fire({
            icon: 'warning',
            title: 'Unidad no disponible',
            text: `La unidad ${eco} no se puede procesar porque no está en operación ni cuenta con registro de encierro.`,
            confirmButtonColor: '#601a2a',
          });
          return;
        }
        navigate(`/encierro/transporte/${coincidencia.modulo.id}?eco=${eco}`);
        return;
      }

      Swal.fire({
        icon: 'info',
        title: 'Unidad no encontrada',
        text: `No se encontró la unidad con económico ${eco} en ningún módulo.`,
        confirmButtonColor: '#601a2a',
      });
    } catch (error) {
      console.error('Error en búsqueda global:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de búsqueda',
        text: 'Hubo un problema al buscar la unidad.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setBuscandoUnidad(false);
    }
  };

  return (
    <>
      <div className="dashboard">
        <Header />
        <main className="dashboard__main">
          <p className="page-eyebrow">SELECCIONE EL TIPO DE TRANSPORTE</p>
          <h1 className="page-title">ENCIERRO DE UNIDADES</h1>
          <p className="dashboard__subtitle text-gray-500 dark:text-gray-300">
            Toque la imagen del transporte para comenzar el registro de encierro
          </p>

          <form className="dashboard__search" onSubmit={handleBuscarUnidad}>
            <input
              type="text"
              value={busquedaEco}
              onChange={(event) => setBusquedaEco(event.target.value.replace(/\D/g, '').substring(0, 3))}
              placeholder="Buscar por número económico"
              className="dashboard__search-input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              type="submit"
              className="dashboard__search-button"
              disabled={!busquedaEco || buscandoUnidad || parseInt(busquedaEco, 10) === 0}
            >
              {buscandoUnidad ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          <div className="dashboard__grid">
            {encierroModules.map((module) => {
              const cantidad = conteos[module.id] || 0;
              return (
                <TransportCard
                  key={module.id}
                  title={module.title}
                  subtitle={module.subtitle}
                  image={module.image}
                  route={module.route}
                  cantidad={cantidad}
                  cargando={cargando}
                />
              );
            })}
          </div>

          <div className="dashboard__actions">
            <button
              className="btn-capsula btn-capsula--gral"
              onClick={handleGenerarReporte}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="spinner"></span>
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M8 18v-2"></path>
                    <path d="M12 18v-4"></path>
                    <path d="M16 18v-6"></path>
                  </svg>
                  <span>Reporte General</span>
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
