// src/pages/CentroControl/CentroControl.jsx
import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import PlantillaReporteGeneral from '../../components/Reportes/PlantillaReporteGeneral';
import PlantillaReporteUnidades from '../../components/Reportes/PlantillaReporteUnidades';
import './CentroControl.css';
import API_BASE from '../../config/api';

// Mismos IDs / etiquetas que en ResumenDespacho.jsx para mantener consistencia
const modelsConfig = [
  { id: 'URBANUS', label: 'URBANUSS', image: '/images/urbanussfrenterealista.webp', color: 'maroon' },
  { id: 'ZAFIRO', label: 'ZAFIRO', image: '/images/zafirofrenterealista.webp', color: 'gold' },
  { id: 'VAGONETA', label: 'VAGONETA', image: '/images/vagoneta frente.webp', color: 'green' },
  { id: 'ORION', label: 'ORIÓN', image: '/images/orionfrente.webp', color: 'blue' },
];

export default function CentroControl() {
  const navigate = useNavigate();

  const [isGenerating, setIsGenerating] = useState(false);

  // Estado para la generación de los PDFs (igual que en Dashboard.jsx)
  const [reporteDataRutas, setReporteDataRutas] = useState(null);
  const [reporteDataUnidades, setReporteDataUnidades] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const reporteRutasRef = useRef(null);
  const reporteUnidadesRef = useRef(null);

  // ---- Carga y desglose de unidades por tipo y estatus ----
  const fetchDespachoHoy = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/despacho/hoy`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Error de conexion');
    return res.json();
  };

  const { data: apiData = [], isLoading: cargando } = useQuery({
    queryKey: ['despacho-hoy'],
    queryFn: fetchDespachoHoy,
    refetchInterval: 30000,
  });

  const modelData = React.useMemo(() => {
    return modelsConfig.map((mc) => {
      const units = (Array.isArray(apiData) ? apiData : []).filter((d) =>
        d.TIPO_DE_UNIDAD?.toUpperCase().includes(mc.id)
      );
      const getEstatus = (d) => (d.ESTATUS || '').toUpperCase().trim();

      const unidadesOperacion = units.filter((d) => getEstatus(d).includes('OPERACI'));
      const unidadesMantenimiento = units.filter((d) => getEstatus(d).includes('MANTENIMIENTO'));
      const unidadesReserva = units.filter((d) => getEstatus(d).includes('RESERVA'));

      const programadas = units.length;
      const operacion = unidadesOperacion.length;
      const mantenimiento = unidadesMantenimiento.length;
      const reserva = unidadesReserva.length;
      const otros = Math.max(programadas - operacion - mantenimiento - reserva, 0);

      const idsConEstatus = new Set([
        ...unidadesOperacion,
        ...unidadesMantenimiento,
        ...unidadesReserva,
      ]);
      const unidadesOtros = units.filter((d) => !idsConEstatus.has(d));

      return {
        ...mc,
        programadas,
        operacion,
        reserva,
        mantenimiento,
        otros,
        unidadesOperacion,
        unidadesReserva,
        unidadesMantenimiento,
        unidadesOtros,
        units,
      };
    });
  }, [apiData]);

  const totales = modelData.reduce(
    (acc, m) => ({
      programadas: acc.programadas + m.programadas,
      operacion: acc.operacion + m.operacion,
      reserva: acc.reserva + m.reserva,
      mantenimiento: acc.mantenimiento + m.mantenimiento,
    }),
    { programadas: 0, operacion: 0, reserva: 0, mantenimiento: 0 }
  );

  // ---- Generación de PDF (misma lógica que Dashboard.jsx) ----
  const generarPDF = (elementRef, nombreArchivo) => {
    return new Promise((resolve, reject) => {
      const element = elementRef.current;
      if (!element) {
        reject(new Error(`Elemento ${nombreArchivo} no encontrado`));
        return;
      }
      html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#f5f5f5',
        windowWidth: 1123,
        windowHeight: 795,
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
          pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
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

      await new Promise((resolve) => setTimeout(resolve, 800));

      await generarPDF(reporteRutasRef, 'Reporte_Rutas');
      await generarPDF(reporteUnidadesRef, 'Reporte_Unidades');

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
      setMostrarReporte(false);
      setIsGenerating(false);
    }
  };

  // Helper para % de cada segmento de la barra apilada
  const pct = (value, total) => (total > 0 ? (value / total) * 100 : 0);

  // Helpers para la búsqueda global
  const getNumeroEconomico = (d) =>
    d.NUMERO_ECONOMICO ?? d.NO_ECONOMICO ?? d.NUM_ECONOMICO ?? d.ECONOMICO ?? d.UNIDAD ?? d.NO_UNIDAD ?? 'S/N';
  const getRuta = (d) =>
    d.RUTA ?? d.NOMBRE_RUTA ?? d.NO_RUTA ?? d.RUTA_ASIGNADA ?? 'Sin ruta asignada';
  const getConductor = (d) =>
    d.CONDUCTOR ?? d.NOMBRE_CONDUCTOR ?? d.CHOFER ?? d.NOMBRE_CHOFER ?? d.OPERADOR ?? 'Sin conductor asignado';
  const getTarjeton = (d) =>
    d.TARJETON ?? d.TARJETON_CONDUCTOR ?? d.NO_TARJETON ?? '—';
  const getEstatus = (d) => (d.ESTATUS || '').toUpperCase().trim();

  // Filtrado de todas las unidades si hay búsqueda
  let allUnitsFiltered = [];
  if (globalSearch.trim() !== '') {
    const term = globalSearch.toLowerCase();
    const allUnits = modelData.flatMap((m) =>
      (m.units || []).map((u) => {
        const estatus = getEstatus(u);
        let colorClass = 'otros';
        let labelStatus = 'Otro estatus';

        if (estatus.includes('OPERACI')) { colorClass = 'operacion'; labelStatus = 'Operación'; }
        else if (estatus.includes('MANTENIMIENTO')) { colorClass = 'mantenimiento'; labelStatus = 'Mantenimiento'; }
        else if (estatus.includes('RESERVA')) { colorClass = 'reserva'; labelStatus = 'Reserva'; }

        return { ...u, __modelInfo: m, __statusColor: colorClass, __statusLabel: labelStatus };
      })
    );

    allUnitsFiltered = allUnits.filter((u) =>
      getNumeroEconomico(u).toString().toLowerCase().includes(term) ||
      getRuta(u).toLowerCase().includes(term) ||
      getConductor(u).toLowerCase().includes(term) ||
      getTarjeton(u).toString().toLowerCase().includes(term) ||
      u.__statusLabel.toLowerCase().includes(term) ||
      u.__modelInfo.label.toLowerCase().includes(term)
    );
  }

  return (
    <>
      <div className="centro-page">
        <Header title="Centro de Control" eyebrow="Panel administrativo" />

        <main className="centro-main">
          <div className="centro-welcome">
            <p className="centro-eyebrow">Visión general de la flota</p>
            <h1 className="centro-title">Centro de Control</h1>
            <p className="centro-subtitle">
              Consulta el total de unidades programadas, su estatus operativo
              y genera reportes generales del despacho.
            </p>
          </div>

          {/* ---------- Acceso al Plano de Patio ---------- */}
          <div className="centro-kpis-actions">
            <button
              type="button"
              className="centro-btn-plano"
              onClick={() => navigate('/plano-patio')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
                <path d="M9 3v15" />
                <path d="M15 6v15" />
              </svg>
              Ver Plano de Patio
            </button>
          </div>

          {/* ---------- KPIs globales ---------- */}
          <section className="centro-kpis">
            <div className="centro-kpi centro-kpi--total">
              <div className="centro-kpi__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <path d="M16 8h4l3 5v3h-7V8z" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <span className="centro-kpi__value">{cargando ? '—' : totales.programadas}</span>
              <span className="centro-kpi__label">Total Programadas</span>
            </div>

            <div className="centro-kpi centro-kpi--operacion">
              <div className="centro-kpi__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <span className="centro-kpi__value">{cargando ? '—' : totales.operacion}</span>
              <span className="centro-kpi__label">En Operación</span>
            </div>

            <div className="centro-kpi centro-kpi--reserva">
              <div className="centro-kpi__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="centro-kpi__value">{cargando ? '—' : totales.reserva}</span>
              <span className="centro-kpi__label">En Reserva</span>
            </div>

            <div className="centro-kpi centro-kpi--mantenimiento">
              <div className="centro-kpi__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a4 4 0 1 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 1 1 5.4-5.4z" />
                </svg>
              </div>
              <span className="centro-kpi__value">{cargando ? '—' : totales.mantenimiento}</span>
              <span className="centro-kpi__label">En Mantenimiento</span>
            </div>
          </section>

          {/* ---------- Desglose por tipo de unidad ---------- */}
          <section className="centro-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h2>Desglose por tipo de unidad</h2>
            <div className="centro-search-wrapper" style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '350px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Buscar unidad en toda la flota..." 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value.replace(/[^a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚ]/g, ''))}
                style={{
                  width: '100%',
                  padding: '8px 16px 8px 38px',
                  borderRadius: '999px',
                  border: '1.5px solid #e5e7eb',
                  outline: 'none',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#ffffff',
                  color: '#111827'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#601a2a';
                  e.target.style.boxShadow = '0 0 0 3px rgba(96, 26, 42, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </section>

          {globalSearch.trim() !== '' ? (
            <section className="centro-global-results" style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 16px rgba(96, 26, 42, 0.08)', overflow: 'hidden', marginBottom: '32px' }}>
              {allUnitsFiltered.length > 0 ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 100px 1fr 100px 1.2fr', gap: '12px', alignItems: 'center', padding: '12px 20px', background: '#f9fafb', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                    <span>Unidad</span>
                    <span>Modelo</span>
                    <span>Estatus</span>
                    <span>Ruta</span>
                    <span>Tarjetón</span>
                    <span>Conductor</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {allUnitsFiltered.map((u, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 100px 100px 1fr 100px 1.2fr', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#111827' }}>
                        <span style={{ fontWeight: '700', color: '#601a2a' }}>{getNumeroEconomico(u)}</span>
                        <span style={{ fontWeight: '600' }}>{u.__modelInfo.label}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', width: 'fit-content', color: u.__statusColor === 'operacion' ? '#059669' : u.__statusColor === 'reserva' ? '#b45309' : u.__statusColor === 'mantenimiento' ? '#dc2626' : '#4b5563', backgroundColor: u.__statusColor === 'operacion' ? '#ecfdf5' : u.__statusColor === 'reserva' ? '#fffbeb' : u.__statusColor === 'mantenimiento' ? '#fef2f2' : '#f3f4f6' }}>
                          {u.__statusLabel}
                        </span>
                        <span>{getRuta(u)}</span>
                        <span>{getTarjeton(u)}</span>
                        <span>{getConductor(u)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', padding: '40px 0', margin: 0 }}>
                  No se encontraron unidades con ese término de búsqueda.
                </p>
              )}
            </section>
          ) : (
            <section className="centro-type-grid">
            {modelsConfig.map((mc) => {
              const m = modelData.find((x) => x.id === mc.id) || {
                programadas: 0,
                operacion: 0,
                reserva: 0,
                mantenimiento: 0,
              };
              return (
                <div
                  className={`centro-type-card centro-type-card--${mc.color} ${!cargando ? 'centro-type-card--clickable' : ''}`}
                  style={cargando ? { opacity: 0.8, cursor: 'not-allowed' } : {}}
                  key={mc.id}
                  onClick={() => !cargando && navigate(`/centro-control/detalle/${mc.id}`, { state: { model: m } })}
                  role="button"
                  tabIndex={cargando ? -1 : 0}
                  onKeyDown={(e) => {
                    if (!cargando && (e.key === 'Enter' || e.key === ' ')) {
                      navigate(`/centro-control/detalle/${mc.id}`, { state: { model: m } });
                    }
                  }}
                >
                  <div className="centro-type-card__header">
                    <img src={mc.image} alt={mc.label} className="centro-type-card__image" />
                    <div className="centro-type-card__heading">
                      <span className="centro-type-card__label">{mc.label}</span>
                      <span className="centro-type-card__total">
                        {cargando ? '—' : m.programadas} unidades
                      </span>
                    </div>
                  </div>

                  {/* Barra apilada de proporción */}
                  <div className="centro-bar" role="img" aria-label={`Distribución de estatus ${mc.label}`}>
                    <span
                      className="centro-bar__seg centro-bar__seg--operacion"
                      style={{ width: `${pct(m.operacion, m.programadas)}%` }}
                    />
                    <span
                      className="centro-bar__seg centro-bar__seg--reserva"
                      style={{ width: `${pct(m.reserva, m.programadas)}%` }}
                    />
                    <span
                      className="centro-bar__seg centro-bar__seg--mantenimiento"
                      style={{ width: `${pct(m.mantenimiento, m.programadas)}%` }}
                    />
                  </div>

                  {/* Detalle por estatus */}
                  <div className="centro-status-list">
                    <div className="centro-status-row">
                      <span className="centro-status-dot centro-status-dot--operacion" />
                      <span className="centro-status-label">Operación</span>
                      <span className="centro-status-percent centro-status-percent--operacion">
                        {cargando ? '—' : `${Math.round(pct(m.operacion, m.programadas))}%`}
                      </span>
                      <span className="centro-status-value">{cargando ? '—' : m.operacion}</span>
                    </div>
                    <div className="centro-status-row">
                      <span className="centro-status-dot centro-status-dot--reserva" />
                      <span className="centro-status-label">Reserva</span>
                      <span className="centro-status-percent centro-status-percent--reserva">
                        {cargando ? '—' : `${Math.round(pct(m.reserva, m.programadas))}%`}
                      </span>
                      <span className="centro-status-value">{cargando ? '—' : m.reserva}</span>
                    </div>
                    <div className="centro-status-row">
                      <span className="centro-status-dot centro-status-dot--mantenimiento" />
                      <span className="centro-status-label">Mantenimiento</span>
                      <span className="centro-status-percent centro-status-percent--mantenimiento">
                        {cargando ? '—' : `${Math.round(pct(m.mantenimiento, m.programadas))}%`}
                      </span>
                      <span className="centro-status-value">{cargando ? '—' : m.mantenimiento}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
          )}

          {/* ---------- Acciones ---------- */}
          <section className="centro-actions">
            <button
              className="centro-btn centro-btn--primary"
              onClick={handleGenerarReporte}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="centro-spinner"></span> Generando PDFs...
                </>
              ) : (
                'Reporte General'
              )}
            </button>

            <button
              className="centro-btn centro-btn--secondary"
              onClick={() => navigate('/resumen-despacho')}
            >
              Ver Resumen de Despacho
            </button>
          </section>
        </main>
      </div>

      {/* Plantillas ocultas para capturar con html2canvas */}
      {mostrarReporte && reporteDataRutas && reporteDataUnidades && (
        <>
          <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1 }} ref={reporteRutasRef}>
            <PlantillaReporteGeneral data={reporteDataRutas} />
          </div>
          <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1 }} ref={reporteUnidadesRef}>
            <PlantillaReporteUnidades data={reporteDataUnidades} />
          </div>
        </>
      )}
    </>
  );
}