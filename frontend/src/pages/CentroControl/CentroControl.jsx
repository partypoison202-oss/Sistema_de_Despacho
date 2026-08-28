import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import { generarPDFReporteGeneral } from '../../utils/generarPDFReporteGeneral';
import { generarPDFReporteUnidades } from '../../utils/generarPDFReporteUnidades';
import { generarPDFEstadisticasCentro } from '../../utils/generarPDFEstadisticasCentro';
import { generarPDFReporteOperacionalPorHora } from '../../utils/generarPDFReporteOperacionalPorHora';
import './CentroControl.css';
import API_BASE from '../../config/api';
// Mismos IDs / etiquetas que en ResumenDespacho.jsx para mantener consistencia
const modelsConfig = [
  { id: 'URBANUS', label: 'URBANUSS', image: '/images/urbanussfrenterealista.webp', color: 'maroon' },
  { id: 'ZAFIRO', label: 'ZAFIRO', image: '/images/zafirofrenterealista.webp', color: 'gold' },
  { id: 'VAGONETA', label: 'VAGONETA', image: '/images/vagoneta frente.webp', color: 'green' },
  { id: 'ORION', label: 'ORIÓN', image: '/images/orionfrente.webp', color: 'blue' },
];

// Nombre del rol tal como está guardado en la tabla `roles`
const ROL_TITAN = 'TITAN';

export default function CentroControl() {
  const navigate = useNavigate();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingStats, setIsGeneratingStats] = useState(false);
  const [isGeneratingOperacional, setIsGeneratingOperacional] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');

  const reporteRutasRef = useRef(null);
  const reporteUnidadesRef = useRef(null);

  // ---- Titanes (activos / notificaciones) ----
  // TODO: reemplazar por datos reales cuando exista el endpoint de Titanes
  const [titanesActivos, setTitanesActivos] = useState(0);
  const [titanesNotificaciones, setTitanesNotificaciones] = useState(0);

  // ---- Carga y desglose de unidades por tipo y estatus ----
  const fetchDespachoHoy = async () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
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
    refetchInterval: 10000, // Cada 10s – monitoreo activo de operaciones
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

  const eficienciaGlobal = totales.programadas > 0 ? Math.round(((totales.operacion + totales.reserva) / totales.programadas) * 100) : 0;

  const handleGenerarReporte = async () => {
    setIsGenerating(true);
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));

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

  const handleGenerarReporteEstadisticas = async () => {
    setIsGeneratingStats(true);
    try {
      // Usamos los mismos datos calculados que ya están en el componente:
      // totales, modelData, y eficienciaGlobal
      await generarPDFEstadisticasCentro(totales, modelData, eficienciaGlobal);

      Swal.fire({
        icon: 'success',
        title: '¡Reporte Generado!',
        text: 'El reporte de estadísticas se ha descargado correctamente.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error('Error al generar estadísticas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al generar el reporte de estadísticas.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setIsGeneratingStats(false);
    }
  };

  const handleGenerarReporteOperacionalPorHora = async () => {
    setIsGeneratingOperacional(true);
    try {
      if (!apiData || apiData.length === 0) {
        throw new Error('No hay datos disponibles para generar el reporte.');
      }
      await generarPDFReporteOperacionalPorHora(apiData);
      
      Swal.fire({
        icon: 'success',
        title: '¡Reporte Generado!',
        text: 'El reporte operacional por hora se ha descargado correctamente.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error('Error al generar reporte operacional:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Ocurrió un error al generar el reporte operacional por hora.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setIsGeneratingOperacional(false);
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
    d.CONDUCTOR ?? d.NOMBRE_CONDUCTOR ?? d.CHOFER ?? d.NOMBRE_CHOFER ?? d.OPERADOR ?? 'Sin persona conductora asignada';
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

  // Obtenemos la fecha actual formateada en español
  const fechaActual = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <div className="centro-page">
        <Header title="Centro de Control" eyebrow="Panel administrativo" />

        <main className="centro-main">
          <div className="centro-welcome">
            <p className="page-eyebrow">Visión general de la flota</p>
            <h1 className="page-title">MONITOREO DE LA OPERACIÓN</h1>
            <p className="centro-date">{fechaActual}</p>
            <p className="centro-subtitle">
              Consulta el total de unidades programadas, su estatus operativo
              y genera reportes generales de la mesa de control.
            </p>
          </div>

          <div className="centro-kpis-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>

            {/* Botón Titanes */}
            <button
              type="button"
              className="centro-btn-plano"
              onClick={() => navigate('/reportestitanes')}
              style={{ position: 'relative' }}
            >
              <span
                title="Titanes activos"
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '-10px',
                  minWidth: '22px',
                  height: '22px',
                  padding: '0 5px',
                  borderRadius: '999px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.4)',
                  border: '2px solid #ffffff',
                  lineHeight: 1,
                }}
              >
                {titanesActivos}
              </span>

              {titanesNotificaciones > 0 && (
                <span
                  title="Notificaciones"
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 5px',
                    borderRadius: '999px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
                    border: '2px solid #ffffff',
                    lineHeight: 1,
                  }}
                >
                  {titanesNotificaciones}
                </span>
              )}

              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              Titanes
            </button>

            {/* ===== NUEVO BOTÓN BITÁCORA ===== */}
            <button
              type="button"
              className="centro-btn-plano centro-btn-plano--bitacora"
              onClick={() => navigate('/centro-control/bitacoras')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Bitácora
            </button>

            {/* ===== BOTÓN DASHBOARD INFRACCIONES ===== */}
            <button
              type="button"
              className="centro-btn-plano"
              onClick={() => navigate('/centro-control/infracciones')}
              style={{ backgroundColor: '#6A1B29', color: '#fff' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <rect x="7" y="10" width="4" height="8" />
                <rect x="15" y="4" width="4" height="14" />
              </svg>
              DASHBOARD
            </button>

            {/* Botón Plano de Patio */}
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
            {/* ... resto de KPIs (sin cambios) ... */}
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

            <div className="centro-kpi" style={{ borderLeft: '4px solid #d97706', background: 'linear-gradient(to right, rgba(251, 191, 36, 0.08), #ffffff)', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.1)' }}>
              <div className="centro-kpi__icon" style={{ color: '#d97706', background: 'rgba(217, 119, 6, 0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <span className="centro-kpi__value" style={{ color: '#92400e' }}>{cargando ? '—' : `${eficienciaGlobal}%`}</span>
              <span className="centro-kpi__label" style={{ color: '#b45309', fontWeight: 'bold' }}>Eficiencia operativa</span>
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
                      <div className="centro-status-row" style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #f3f4f6' }}>
                        <span className="centro-status-dot" style={{ backgroundColor: '#d97706' }} />
                        <span className="centro-status-label" style={{ fontWeight: '600', color: '#92400e' }}>Eficiencia</span>
                        <span className="centro-status-percent" style={{ color: '#b45309', backgroundColor: '#fef3c7', fontWeight: 'bold' }}>
                          {cargando ? '—' : `${Math.round(pct(m.operacion + m.reserva, m.programadas))}%`}
                        </span>
                        <span className="centro-status-value"></span>
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
              className="centro-btn centro-btn--primary"
              onClick={handleGenerarReporteEstadisticas}
              disabled={isGeneratingStats || cargando}
            >
              {isGeneratingStats ? (
                <>
                  <span className="centro-spinner"></span> Generando...
                </>
              ) : (
                'Reporte Estadístico'
              )}
            </button>

            <button
              className="centro-btn centro-btn--secondary"
              onClick={() => navigate('/resumen-despacho')}
            >
              Ver Resumen de Mesa de Control
            </button>
            
            <button
              className="centro-btn centro-btn--primary"
              onClick={handleGenerarReporteOperacionalPorHora}
              disabled={isGeneratingOperacional || cargando}
            >
              {isGeneratingOperacional ? (
                <>
                  <span className="centro-spinner"></span> Generando...
                </>
              ) : (
                'Reporte Operativo por Hora'
              )}
            </button>
          </section>
        </main>
      </div>
    </>
  );
}