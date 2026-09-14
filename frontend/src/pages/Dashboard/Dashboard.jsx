import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { transportModules } from '../../config/transportModules';
import './Dashboard.css';
import { descargarReportesGeneralesConAlerta } from '../../utils/reporteGeneralUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalPrefetch } from '../../hooks/useGlobalPrefetch';
import API_BASE from '../../config/api';

export default function Dashboard() {
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busquedaEco, setBusquedaEco] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useGlobalPrefetch();

  // Referencias para los elementos a capturar

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
            // Intento 1: Buscar en memoria (caché ultra rápido)
            const cachedData = queryClient.getQueryData(['unidades-list', modulo.id]);
            let unidades = cachedData || [];
            
            // Intento 2: Si no hay en caché, ir a red (fallback)
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
        const estatusUnidad = coincidencia.unidad.estatus || coincidencia.unidad.estado || 'operacion';
        const isOperacion = estatusUnidad.toLowerCase().trim().includes('operaci');
        if (!isOperacion) {
          Swal.fire({
            icon: 'warning',
            title: 'Unidad no disponible',
            text: `La unidad ${eco} no se puede procesar porque no está en operación.`,
            confirmButtonColor: '#601a2a',
          });
          return;
        }
        navigate(`/transporte/${coincidencia.modulo.id}?eco=${eco}`);
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

  const handleGenerarReporte = () => {
    descargarReportesGeneralesConAlerta(setIsGenerating);
  };

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
    refetchInterval: 5000, // Actualiza silenciosamente cada 5 segundos
  });

  return (
    <>
      <div className="dashboard">
        <Header />
        <main className="dashboard__main">
          <p className="page-eyebrow">SELECCIONE EL TIPO DE TRANSPORTE</p>
          <h1 className="page-title">DESPACHO DE UNIDADES</h1>
          <p className="dashboard__subtitle text-gray-500 dark:text-gray-300">
            Toque la imagen del transporte para comenzar el registro
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
            {transportModules.map((modulo) => (
              <TransportCard
                key={modulo.id}
                title={modulo.title}
                subtitle={modulo.subtitle}
                image={modulo.image}
                route={`/transporte/${modulo.id}`}
                cantidad={conteos[modulo.id] || 0}
                cargando={cargando}
              />
            ))}
          </div>

          {/* Botón para generar reportes */}
          <div className="dashboard__actions">
              <button
                onClick={handleGenerarReporte}
                disabled={isGenerating}
                className="btn-reporte"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '3px', margin: 0, borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: '#ffffff' }}></span>
                    Generando reportes...
                  </>
                ) : 'Reporte General'}
              </button>
          </div>
        </main>
      </div>
    </>
  );
}