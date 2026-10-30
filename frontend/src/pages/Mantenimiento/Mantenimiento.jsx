// src/pages/Mantenimiento/Mantenimiento.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { generarPDFPendientesMantenimiento } from '../../utils/generarPDFPendientesMantenimiento';
import { generarPDFReporteOperacionalPorHora } from '../../utils/generarPDFReporteOperacionalPorHora';
import { transportModules } from '../../config/transportModules';
import './Mantenimiento.css';
import '../CentroControl/CentroControl.css';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ReporteCombustiblePDF from './components/ReporteCombustiblePDF';
import { useGlobalPrefetch } from '../../hooks/useGlobalPrefetch';

export default function Mantenimiento() {
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isInspeccion = location.pathname.startsWith('/carga-combustible');

  // Estado para la generación del PDF
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfTotales, setPdfTotales] = useState(null);
  const pdfRef = useRef(null);
  
  // Estado para el modal de previsualización
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [generandoOperacional, setGenerandoOperacional] = useState(false);

  const queryClient = useQueryClient();

  // Limpieza del object URL cuando el componente se desmonta o cambia
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  useGlobalPrefetch();

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
        navigate(`${isInspeccion ? '/carga-combustible' : '/mantenimiento'}/${coincidencia.modulo.id}?eco=${eco}`);
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
    staleTime: 2000,
    refetchInterval: 5000,
  });

  // Sincronización instantánea de estatus y conteos entre módulos y pestañas
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    let bc;
    try {
      bc = new BroadcastChannel('unidades_estatus_channel');
      bc.onmessage = (event) => {
        if (event.data?.tipo === 'CAMBIO_ESTATUS') {
          queryClient.invalidateQueries({ queryKey: ['conteo-unidades-global'] });
          queryClient.invalidateQueries({ queryKey: ['unidades-list'] });
        }
      };
    } catch (e) {
      console.error('Error en listener de BroadcastChannel:', e);
    }
    return () => {
      if (bc) bc.close();
    };
  }, [queryClient]);

  const handleGenerarPDF = async () => {
    try {
      setGenerandoPDF(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      // 1. Obtener los datos del reporte
      const res = await fetch(`${API_BASE}/api/mantenimiento/reporte-combustible`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        let errMsg = 'Error al obtener datos';
        try {
          const errJson = await res.json();
          if (errJson && errJson.message) errMsg = errJson.message;
        } catch (_) {}
        throw new Error(errMsg);
      }
      const json = await res.json();

      if (json.status === 'success') {
        // 2. Registrar el reporte en la BD y obtener el folio único COMB-XXX
        const resReg = await fetch(`${API_BASE}/api/mantenimiento/reporte-combustible`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ data: json.data, totales: json.totales }),
        });
        const jsonReg = await resReg.json();
        const folioGenerado = jsonReg.status === 'success' ? jsonReg.folio : 'COMB-???';

        setPdfData(json.data);
        setPdfTotales({ ...json.totales, folio: folioGenerado });

        setTimeout(async () => {
          if (pdfRef.current) {
            const canvas = await html2canvas(pdfRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF({
              orientation: 'landscape',
              unit: 'px',
              format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            const todayStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
            pdf.save(`Reporte_Combustible_${folioGenerado}_${todayStr}.pdf`);
          }
          setPdfData(null);
          setPdfTotales(null);
          setGenerandoPDF(false);
          Swal.fire({
            title: `¡Reporte Generado! (${folioGenerado})`,
            text: 'El PDF se ha descargado correctamente y el registro ha sido guardado.',
            icon: 'success',
            confirmButtonColor: '#6b1d33'
          });
        }, 500);
      } else {
        throw new Error(json.message || 'Error desconocido');
      }
    } catch (e) {
      console.error(e);
      setGenerandoPDF(false);
      Swal.fire('Error', e.message || 'No se pudo generar el reporte', 'error');
    }
  };

  const handleDescargarPendientes = async (tipo) => {
    try {
      Swal.fire({
        title: 'Generando reporte...',
        text: 'Por favor espere.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      const response = await fetch(`${API_BASE}/api/despacho/pendientes-mantenimiento`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`
        }
      });
      if (!response.ok) throw new Error('Error al obtener datos');
      const data = await response.json();
      if (data && data.length > 0) {
        const { blob, filename } = await generarPDFPendientesMantenimiento(data, tipo);
        Swal.close();
        const url = URL.createObjectURL(blob);
        setPreviewPdfUrl(url);
        setPreviewFilename(filename);
      } else {
        Swal.close();
        Swal.fire('Atención', 'No hay unidades con este estatus', 'info');
      }
    } catch (error) {
      console.error('Error generando reporte de pendientes:', error);
      Swal.close();
      Swal.fire('Error', 'No se pudo generar el reporte', 'error');
    }
  };

  const handleGenerarReporteOperacionalPorHora = async () => {
    try {
      setGenerandoOperacional(true);
      Swal.fire({
        title: 'Generando reporte...',
        text: 'Obteniendo datos operativos del día...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const res = await fetch(`${API_BASE}/api/despacho/hoy`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Error al obtener datos operativos de hoy');
      const data = await res.json();

      if (!data || data.length === 0) {
        Swal.close();
        Swal.fire({
          icon: 'warning',
          title: 'Sin datos disponibles',
          text: 'No hay datos de despacho registrados para el día de hoy.',
          confirmButtonColor: '#601a2a',
        });
        return;
      }

      const { blob, filename } = await generarPDFReporteOperacionalPorHora(data, true);
      Swal.close();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewFilename(filename);
    } catch (error) {
      console.error('Error al generar reporte operacional por hora:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo generar el reporte operacional por hora.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setGenerandoOperacional(false);
    }
  };

  return (
    <>
      <div className="mantenimiento">
        <Header />
        <main className="mantenimiento__main">
          <p className="page-eyebrow">{isInspeccion ? 'SISTEMA DE GESTIÓN OPERATIVA' : 'SELECCIONE EL TIPO DE TRANSPORTE'}</p>
          <h1 className="page-title">
            {isInspeccion ? 'CONTROL DE COMBUSTIBLE' : 'MANTENIMIENTO PARQUE VEHICULAR'}
          </h1>
          <p className="mantenimiento__subtitle text-gray-500 dark:text-gray-300">
            {isInspeccion
              ? 'Captura diaria de combustible, AdBlue y seguimiento semanal de consumos'
              : 'Toque la imagen del transporte para comenzar el mantenimiento'}
          </p>

          <form className="mantenimiento__search" onSubmit={handleBuscarUnidad}>
            <input
              type="text"
              value={busquedaEco}
              onChange={(event) => setBusquedaEco(event.target.value.replace(/\D/g, '').substring(0, 3))}
              placeholder="Buscar por número económico"
              className="mantenimiento__search-input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                route={`${isInspeccion ? '/carga-combustible' : '/mantenimiento'}/${modulo.id}`}
                cantidad={conteos[modulo.id] || 0}
                cargando={cargando}
              />
            ))}
          </div>

          {/* Botones de reportes — al fondo */}
          {!isInspeccion && (
            <div className="mantenimiento__actions">
              <p className="mantenimiento__actions-label">Reportes del Parque Vehicular</p>
              <div className="mantenimiento__actions-btns">
                <button
                  className="mant-btn mant-btn--primary"
                  onClick={() => handleDescargarPendientes('pendientes')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="12" x2="12" y2="18" />
                    <polyline points="9 15 12 18 15 15" />
                  </svg>
                  <span>
                    <strong>Económicos en mantenimiento</strong>
                    <small>Económicos con incidencia asignada</small>
                  </span>
                </button>

                <button
                  className="mant-btn mant-btn--secondary"
                  onClick={() => handleDescargarPendientes('en-mantenimiento')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="12" x2="12" y2="18" />
                    <polyline points="9 15 12 18 15 15" />
                  </svg>
                  <span>
                    <strong>Económicos con folio</strong>
                    <small>Unidades con reporte de falla activo</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="mant-btn mant-btn--hora"
                  onClick={handleGenerarReporteOperacionalPorHora}
                  disabled={generandoOperacional}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>
                    <strong>{generandoOperacional ? 'Generando...' : 'Reporte Operativo por Hora'}</strong>
                    <small>Estatus de flota, taller y patio</small>
                  </span>
                </button>
              </div>

              {/* Botón hacia Historial Mantenimiento (Revisión e Historial de Folios Previos) */}
              <div className="mantenimiento__actions-extra">
                <button
                  type="button"
                  className="mant-btn mant-btn--historial"
                  onClick={() => navigate('/historial/mantenimiento', { state: { tab: 'folios' } })}
                  title="Ir a Historial de Mantenimiento - Revisión e Historial de Folios Previos"
                >
                  <svg className="mant-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v5h5" />
                    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                    <path d="M12 7v5l4 2" />
                  </svg>
                  <span>
                    <strong>Historial de Mantenimiento</strong>
                    <small>Revisión e Historial de Folios Previos</small>
                  </span>
                  <svg className="mant-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {isInspeccion && (
            <div className="mantenimiento__actions">
              <div className="mantenimiento__actions-btns">
                <button
                  className="mant-btn mant-btn--primary"
                  onClick={handleGenerarPDF}
                  disabled={generandoPDF}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="12" x2="12" y2="18" />
                    <polyline points="9 15 12 18 15 15" />
                  </svg>
                  <span>
                    <strong>{generandoPDF ? 'Generando...' : 'Reporte de Combustible'}</strong>
                    <small>Descargar PDF general</small>
                  </span>
                </button>
              </div>
            </div>
          )}

          <ReporteCombustiblePDF ref={pdfRef} data={pdfData} totales={pdfTotales} />
        </main>
      </div>

      {/* Modal de Previsualización de PDF */}
      {previewPdfUrl && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '8px', padding: '1rem',
            width: '100%', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#601a2a', fontSize: '1.25rem', fontWeight: 'bold' }}>Vista Previa del Reporte</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#601a2a', color: '#fff', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background-color 0.2s' }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#4a1420'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#601a2a'}
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = previewPdfUrl;
                    a.download = previewFilename;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Descargar PDF
                </button>
                <button
                  style={{
                    padding: '0.5rem 0.85rem', border: '1px solid #d1d5db', borderRadius: '6px',
                    backgroundColor: '#f9fafb', color: '#374151', cursor: 'pointer',
                    fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px'
                  }}
                  title="Abrir PDF en pestaña nueva"
                  onClick={() => window.open(previewPdfUrl, '_blank')}
                >
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Abrir PDF
                </button>
                <button
                  style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#f9fafb', color: '#374151', cursor: 'pointer', fontWeight: '500', transition: 'background-color 0.2s' }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#f9fafb'}
                  onClick={() => {
                    URL.revokeObjectURL(previewPdfUrl);
                    setPreviewPdfUrl(null);
                    setPreviewFilename('');
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
            <iframe src={previewPdfUrl} title="Vista previa PDF" style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '4px' }} />
          </div>
        </div>
      )}
    </>
  );
}