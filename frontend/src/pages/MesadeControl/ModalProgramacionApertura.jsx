// src/pages/MesadeControl/ModalProgramacionApertura.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import API_BASE from '../../config/api';
import './ModalProgramacionApertura.css';

export default function ModalProgramacionApertura({
  isOpen,
  onClose,
  tipoTransporte,
  configActual,
  onSelectUnit,
}) {
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS'); // TODOS, OPERACION, RESERVA, MANTENIMIENTO
  const [filtroRuta, setFiltroRuta] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const {
    data: respuesta,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['programacion-apertura-dia', tipoTransporte],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;
      const res = await fetch(`${API_BASE}/api/despacho/programacion-apertura/${tipoTransporte}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Error al cargar programación de apertura');
      return res.json();
    },
    enabled: isOpen && !!tipoTransporte,
    refetchInterval: isOpen ? 15000 : false,
  });

  const kpis = respuesta?.kpis || {
    total_flota: 0,
    total_operacion: 0,
    total_reserva: 0,
    total_mantenimiento: 0,
    con_conductor: 0,
    sin_conductor: 0,
  };

  const unidades = respuesta?.unidades || [];
  const fechaHoy = respuesta?.fecha || new Date().toISOString().split('T')[0];

  // Rutas únicas disponibles para filtrar
  const rutasDisponibles = useMemo(() => {
    const setRutas = new Set();
    unidades.forEach((u) => {
      if (u.ruta && u.ruta.trim() !== '') setRutas.add(u.ruta.trim());
    });
    return Array.from(setRutas).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [unidades]);

  // Filtrado reactivo de unidades
  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      // Filtro por estatus
      if (filtroEstatus === 'OPERACION' && u.estatus !== 'operacion') return false;
      if (filtroEstatus === 'RESERVA' && u.estatus !== 'reserva') return false;
      if (filtroEstatus === 'MANTENIMIENTO' && u.estatus !== 'mantenimiento') return false;

      // Filtro por ruta
      if (filtroRuta !== 'TODAS' && u.ruta !== filtroRuta) return false;

      // Búsqueda por texto (ECO, Conductor, Tarjetón, Motivo/Falla)
      if (busqueda.trim() !== '') {
        const q = busqueda.toLowerCase().trim();
        const eco = String(u.numero_eco || '').toLowerCase();
        const ruta = String(u.ruta || '').toLowerCase();
        const tarjeton = String(u.tarjeton || '').toLowerCase();
        const conductor = String(u.nombre_conductor || '').toLowerCase();
        const maniobrista = String(u.nombre_maniobrista || '').toLowerCase();
        const motivo = String(u.motivo || '').toLowerCase();
        const motivoEst = String(u.motivo_estatus || '').toLowerCase();
        const falla = String(u.falla || '').toLowerCase();

        const match =
          eco.includes(q) ||
          ruta.includes(q) ||
          tarjeton.includes(q) ||
          conductor.includes(q) ||
          maniobrista.includes(q) ||
          motivo.includes(q) ||
          motivoEst.includes(q) ||
          falla.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [unidades, filtroEstatus, filtroRuta, busqueda]);

  // Exportar vista filtrada a archivo CSV
  const handleExportCSV = () => {
    if (!unidadesFiltradas.length) return;
    const encabezados = [
      'ECONOMICO',
      'TIPO',
      'ESTATUS_APERTURA',
      'RUTA',
      'CORRIDA',
      'TARJETON',
      'CONDUCTOR',
      'MANIOBRISTA',
      'HORA_PROGRAMADA',
      'HORA_ACOPLE',
      'MOTIVO_FALLA'
    ];

    const filas = unidadesFiltradas.map((u) => [
      `"${u.numero_eco}"`,
      `"${u.tipo}"`,
      `"${u.estatus}"`,
      `"${u.ruta || ''}"`,
      `"${u.corridas || ''}"`,
      `"${u.tarjeton || ''}"`,
      `"${u.nombre_conductor || ''}"`,
      `"${u.nombre_maniobrista || ''}"`,
      `"${u.hora_programada || ''}"`,
      `"${u.acople || ''}"`,
      `"${u.motivo_estatus || u.motivo || u.falla || ''}"`
    ]);

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Programacion_Apertura_0430_${tipoTransporte}_${fechaHoy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="apertura-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="apertura-container" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="apertura-header">
          <div className="apertura-title-box">
            <div className="apertura-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div className="apertura-title-row">
                <h2 className="apertura-title">PROGRAMACIÓN DE APERTURA</h2>
                <span className="apertura-corte-badge" title="Corte congelado de Logística previo a las 04:30 AM">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                  </svg>
                  Corte Inicial 04:30 AM
                </span>
              </div>
              <p className="apertura-subtitle">
                {configActual?.title || 'Mesa de Control'} &bull; Programación original de Logística previa al inicio de operaciones
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handleExportCSV}
              title="Descargar tabla en CSV"
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                padding: '0.45rem 0.75rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              CSV
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              title="Actualizar datos"
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                padding: '0.45rem 0.75rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: isRefetching ? 'spin 1s linear infinite' : 'none' }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {isRefetching ? 'Cargando...' : 'Actualizar'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="apertura-close"
              title="Cerrar ventana (Esc)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="apertura-body">
          {/* Tarjetas KPIs */}
          <div className="apertura-kpis">
            <div className="ap-kpi-card ap-kpi-card--total">
              <div className="ap-kpi-info">
                <span className="ap-kpi-label">Flota en Apertura</span>
                <span className="ap-kpi-value">{kpis.total_flota}</span>
              </div>
              <div className="ap-kpi-icon" style={{ background: '#e2e8f0', color: '#475569' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
            </div>

            <div className="ap-kpi-card ap-kpi-card--operacion">
              <div className="ap-kpi-info">
                <span className="ap-kpi-label">En Operación</span>
                <span className="ap-kpi-value" style={{ color: '#15803d' }}>{kpis.total_operacion}</span>
              </div>
              <div className="ap-kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <div className="ap-kpi-card ap-kpi-card--reserva">
              <div className="ap-kpi-info">
                <span className="ap-kpi-label">En Reserva</span>
                <span className="ap-kpi-value" style={{ color: '#1d4ed8' }}>{kpis.total_reserva}</span>
              </div>
              <div className="ap-kpi-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            <div className="ap-kpi-card ap-kpi-card--mantenimiento">
              <div className="ap-kpi-info">
                <span className="ap-kpi-label">Mantenimiento / Taller</span>
                <span className="ap-kpi-value" style={{ color: '#b91c1c' }}>{kpis.total_mantenimiento}</span>
              </div>
              <div className="ap-kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="apertura-toolbar">
            <div className="ap-filter-chips">
              <button
                type="button"
                className={`ap-chip ${filtroEstatus === 'TODOS' ? 'ap-chip--active' : ''}`}
                onClick={() => setFiltroEstatus('TODOS')}
              >
                <span>Todas</span>
                <span className="ap-chip-count">{unidades.length}</span>
              </button>

              <button
                type="button"
                className={`ap-chip ${filtroEstatus === 'OPERACION' ? 'ap-chip--active' : ''}`}
                onClick={() => setFiltroEstatus('OPERACION')}
              >
                <span>Operación</span>
                <span className="ap-chip-count">{kpis.total_operacion}</span>
              </button>

              <button
                type="button"
                className={`ap-chip ${filtroEstatus === 'RESERVA' ? 'ap-chip--active' : ''}`}
                onClick={() => setFiltroEstatus('RESERVA')}
              >
                <span>Reserva</span>
                <span className="ap-chip-count">{kpis.total_reserva}</span>
              </button>

              <button
                type="button"
                className={`ap-chip ${filtroEstatus === 'MANTENIMIENTO' ? 'ap-chip--active' : ''}`}
                onClick={() => setFiltroEstatus('MANTENIMIENTO')}
              >
                <span>Mantenimiento</span>
                <span className="ap-chip-count">{kpis.total_mantenimiento}</span>
              </button>
            </div>

            <div className="ap-toolbar-controls">
              <select
                value={filtroRuta}
                onChange={(e) => setFiltroRuta(e.target.value)}
                className="ap-route-select"
              >
                <option value="TODAS">Todas las rutas</option>
                {rutasDisponibles.map((r) => (
                  <option key={r} value={r}>
                    Ruta {r}
                  </option>
                ))}
              </select>

              <div className="ap-search-input-box">
                <svg className="ap-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar ECO, conductor, tarjetón, falla..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="ap-search-input"
                />
              </div>
            </div>
          </div>

          {/* Tabla de Apertura */}
          <div className="apertura-table-wrap">
            {isLoading ? (
              <div className="ap-empty-state">
                <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #cbd5e1', borderTopColor: '#6b1d33', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Cargando programación de apertura...</p>
              </div>
            ) : unidadesFiltradas.length === 0 ? (
              <div className="ap-empty-state">
                <svg className="ap-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>No se encontraron registros de apertura</p>
                <p style={{ fontSize: '0.85rem' }}>Verifica los filtros seleccionados o el término de búsqueda.</p>
              </div>
            ) : (
              <table className="ap-table">
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>ECO</th>
                    <th style={{ width: '110px' }}>Estatus</th>
                    <th style={{ width: '120px' }}>Ruta / Corrida</th>
                    <th>Conductor de Apertura</th>
                    <th>Maniobrista</th>
                    <th style={{ width: '140px' }}>Horario Programado</th>
                    <th>Motivo / Falla Apertura</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {unidadesFiltradas.map((u) => {
                    const dotClass =
                      u.estatus === 'operacion'
                        ? 'ap-eco-dot--operacion'
                        : u.estatus === 'reserva'
                        ? 'ap-eco-dot--reserva'
                        : 'ap-eco-dot--mantenimiento';

                    const badgeClass =
                      u.estatus === 'operacion'
                        ? 'ap-status-badge--operacion'
                        : u.estatus === 'reserva'
                        ? 'ap-status-badge--reserva'
                        : 'ap-status-badge--mantenimiento';

                    const estatusTexto =
                      u.estatus === 'operacion'
                        ? 'Operación'
                        : u.estatus === 'reserva'
                        ? 'Reserva'
                        : 'Mantenimiento';

                    const detalleMotivo = u.motivo_estatus || u.motivo || u.falla || '-';

                    return (
                      <tr key={u.unidad_id || u.numero_eco}>
                        {/* ECO */}
                        <td>
                          <div>
                            <span className="ap-eco-badge">
                              <span className={`ap-eco-dot ${dotClass}`} />
                              {u.numero_eco}
                            </span>
                            {u.tipo && <div className="ap-type-pill">{u.tipo}</div>}
                          </div>
                        </td>

                        {/* Estatus */}
                        <td>
                          <span className={`ap-status-badge ${badgeClass}`}>
                            {estatusTexto}
                          </span>
                        </td>

                        {/* Ruta / Corrida */}
                        <td>
                          {u.ruta ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span className="ap-route-badge">{u.ruta}</span>
                              {u.corridas && (
                                <span className="ap-corrida-pill">
                                  Corrida: <strong>{u.corridas}</strong>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>Sin ruta</span>
                          )}
                        </td>

                        {/* Conductor */}
                        <td>
                          <div className="ap-driver-box">
                            {u.tarjeton ? (
                              <span className="ap-driver-tarjeton">TARJETÓN: {u.tarjeton}</span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>SIN TARJETÓN</span>
                            )}
                            <span
                              className="ap-driver-name"
                              style={{ color: u.nombre_conductor ? '#0f172a' : '#94a3b8' }}
                            >
                              {u.nombre_conductor || 'Sin conductor asignado'}
                            </span>
                          </div>
                        </td>

                        {/* Maniobrista */}
                        <td>
                          {u.nombre_maniobrista ? (
                            <div className="ap-driver-box">
                              {u.tarjeton_maniobrista && (
                                <span className="ap-driver-tarjeton" style={{ color: '#0369a1' }}>
                                  TARJ: {u.tarjeton_maniobrista}
                                </span>
                              )}
                              <span className="ap-driver-name">{u.nombre_maniobrista}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                          )}
                        </td>

                        {/* Horarios */}
                        <td>
                          <div className="ap-time-box">
                            {u.hora_programada && (
                              <span>Prog: <strong>{u.hora_programada}</strong></span>
                            )}
                            {u.acople && (
                              <span style={{ color: '#64748b' }}>Acople: {u.acople}</span>
                            )}
                            {!u.hora_programada && !u.acople && (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </div>
                        </td>

                        {/* Motivo / Falla */}
                        <td>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: detalleMotivo !== '-' ? '#b91c1c' : '#94a3b8',
                              fontWeight: detalleMotivo !== '-' ? 600 : 400,
                            }}
                          >
                            {detalleMotivo}
                          </span>
                        </td>

                        {/* Acción */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="ap-action-btn"
                            title={`Seleccionar unidad ${u.numero_eco} en Mesa de Control`}
                            onClick={() => {
                              if (onSelectUnit) {
                                onSelectUnit(u.numero_eco);
                              }
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                            Ver en Mesa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
