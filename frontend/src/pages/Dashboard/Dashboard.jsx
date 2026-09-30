import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { transportModules } from '../../config/transportModules';
import './Dashboard.css';
import { descargarReportesGeneralesConAlerta, descargarProgramacionOperativaDespachoConAlerta } from '../../utils/reporteGeneralUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalPrefetch } from '../../hooks/useGlobalPrefetch';
import API_BASE from '../../config/api';

export default function Dashboard() {
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isGeneratingProgramacion, setIsGeneratingProgramacion] = useState(false);
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
    descargarReportesGeneralesConAlerta(setIsGenerating, queryClient);
  };

  const handleGenerarResumenExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const { descargarResumenDespachoExcel } = await import('../../utils/generarExcelResumenDespacho');
      await descargarResumenDespachoExcel(setIsGeneratingExcel);
    } catch (err) {
      console.error(err);
      setIsGeneratingExcel(false);
    }
  };

  const handleGenerarProgramacionOperativa = () => {
    descargarProgramacionOperativaDespachoConAlerta(setIsGeneratingProgramacion, queryClient);
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

          {/* Botones para generar reportes */}
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

              <button
                onClick={handleGenerarResumenExcel}
                disabled={isGeneratingExcel}
                className="btn-reporte btn-reporte--excel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  cursor: isGeneratingExcel ? 'not-allowed' : 'pointer'
                }}
              >
                {isGeneratingExcel ? (
                  <>
                    <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '3px', margin: 0, borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: '#ffffff' }}></span>
                    <span>Generando Excel...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="8" y1="13" x2="16" y2="13"></line>
                      <line x1="8" y1="17" x2="16" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <span>Resumen Despacho (Excel)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleGenerarProgramacionOperativa}
                disabled={isGeneratingProgramacion}
                className="btn-reporte btn-reporte--programacion"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#1e3a8a',
                  color: '#ffffff',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  cursor: isGeneratingProgramacion ? 'not-allowed' : 'pointer'
                }}
              >
                {isGeneratingProgramacion ? (
                  <>
                    <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '3px', margin: 0, borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: '#ffffff' }}></span>
                    <span>Generando PDF...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Programación Operativa</span>
                  </>
                )}
              </button>
          </div>
        </main>
      </div>
    </>
  );
}