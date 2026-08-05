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
import { generarPDFReporteGeneral } from '../../utils/generarPDFReporteGeneral';
import { generarPDFReporteUnidades } from '../../utils/generarPDFReporteUnidades';
import { useEffect } from 'react';

export default function DashboardEncierro() {
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Precarga fantasma de las unidades de todas las flotillas (Encierro)
    encierroModules.forEach((modulo) => {
      queryClient.prefetchQuery({
        queryKey: ['unidades-list-encierro', modulo.id],
        queryFn: async () => {
          const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
          if (!token) return [];
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
            estado: String(u.estatus ?? 'operacion').toLowerCase(),
          }));
        },
        staleTime: 60000,
      });
    });
  }, [queryClient]);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerarReporte = async () => {
    setIsGenerating(true);
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));

    try {
      // Obtener ambos reportes
      const [respRutas, respUnidades] = await Promise.all([
        fetch(`${API_BASE}/api/despacho/reporte-general`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE}/api/despacho/reporte-unidades`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!respRutas.ok || !respUnidades.ok) {
        // Intentar obtener mensaje de error del servidor
        let errorMsg = 'Error al obtener los datos';
        if (!respRutas.ok) {
          const errData = await respRutas.json().catch(() => ({}));
          errorMsg = errData.error || errorMsg;
        } else {
          const errData = await respUnidades.json().catch(() => ({}));
          errorMsg = errData.error || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const dataRutas = await respRutas.json();
      const dataUnidades = await respUnidades.json();

      // Generar PDF nativos
      await generarPDFReporteGeneral(dataRutas);
      await generarPDFReporteUnidades(dataUnidades);

      Swal.fire({
        icon: 'success',
        title: '¡Reportes Generados!',
        text: 'Se han descargado los dos reportes correctamente.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });

    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Ocurrió un error al generar los reportes.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setIsGenerating(false);
    }
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
    refetchInterval: 30000,
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
            const unidadEncontrada = unidades.find((unidad) => {
              const valorEco = unidad.numero_eco !== undefined ? unidad.numero_eco : unidad.eco;
              const numeroEcoUnidad = normalizarNumeroEco(valorEco ?? '');
              const isOperacion = (unidad.estatus || '').toLowerCase().trim().includes('operaci');
              return numeroEcoUnidad === eco && isOperacion;
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
          <p className="dashboard__eyebrow text-[#c5a059] dark:text-[#c5a059]">Seleccione el tipo de transporte</p>
          <h1 className="dashboard__title text-gray-900 dark:text-white">Flota de Unidades</h1>
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
              className="btn-reporte"
              onClick={handleGenerarReporte}
              disabled={isGenerating}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {isGenerating ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '3px', margin: 0, borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: '#ffffff' }}></span>
                  Generando PDF...
                </>
              ) : (
                'Reporte General'
              )}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
