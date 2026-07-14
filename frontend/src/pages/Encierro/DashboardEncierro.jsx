// src/pages/Encierro/DashboardEncierro.jsx
import React, { useState, useRef } from 'react';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { encierroModules } from '../../config/encierroModules';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import PlantillaReporteGeneral from '../../components/Reportes/PlantillaReporteGeneral';
import PlantillaReporteUnidades from '../../components/Reportes/PlantillaReporteUnidades';
import '../Dashboard/Dashboard.css';
import API_BASE from '../../config/api';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
          const token = localStorage.getItem('token');
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

  const [reporteDataRutas, setReporteDataRutas] = useState(null);
  const [reporteDataUnidades, setReporteDataUnidades] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Referencias para los elementos a capturar
  const reporteRutasRef = useRef(null);
  const reporteUnidadesRef = useRef(null);

  // Función para generar PDF a partir de una referencia
  const generarPDF = (elementRef, nombreArchivo) => {
    return new Promise((resolve, reject) => {
      const element = elementRef.current;
      if (!element) {
        reject(new Error(`Elemento ${nombreArchivo} no encontrado`));
        return;
      }
      html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/jpeg', 0.8);
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
          
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          const margin = 10;
          const imgWidth = pdfWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = margin;

          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= (pdfHeight - (margin * 2));

          while (heightLeft > 2) {
            position -= (pdfHeight - (margin * 2));
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= (pdfHeight - (margin * 2));
          }

          pdf.save(`${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.pdf`);
          resolve();
        })
        .catch(reject);
    });
  };

  const handleGenerarReporte = async () => {
    setIsGenerating(true);
    const token = localStorage.getItem('token');

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

      setReporteDataRutas(dataRutas);
      setReporteDataUnidades(dataUnidades);
      setMostrarReporte(true);

      // Esperar a que React renderice los componentes ocultos
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Generar PDF de rutas
      await generarPDF(reporteRutasRef, 'Reporte_Rutas_Encierro');
      
      // Generar PDF de unidades
      await generarPDF(reporteUnidadesRef, 'Reporte_Unidades_Encierro');

      Swal.fire({
        icon: 'success',
        title: '¡Reportes Generados!',
        text: 'Los reportes se han generado y descargado exitosamente.',
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
        title: 'Error de conexión',
        text: error.message || 'No se pudieron generar los reportes.',
        confirmButtonColor: '#601a2a'
      });
    } finally {
      setMostrarReporte(false);
      setIsGenerating(false);
    }
  };

  const fetchConteos = async () => {
    const response = await fetch(`${API_BASE}/api/despacho/conteo-unidades`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
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
      const token = localStorage.getItem('token');
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
              onChange={(event) => setBusquedaEco(event.target.value.replace(/\D/g, ''))}
              placeholder="Buscar por número económico"
              className="dashboard__search-input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button type="submit" className="dashboard__search-button" disabled={buscandoUnidad}>
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

      {mostrarReporte && reporteDataRutas && reporteDataUnidades && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: '-9999px',
            zIndex: -1,
          }}
        >
          <PlantillaReporteGeneral data={reporteDataRutas} ref={reporteRutasRef} />
          <PlantillaReporteUnidades data={reporteDataUnidades} ref={reporteUnidadesRef} />
        </div>
      )}
    </>
  );
}
