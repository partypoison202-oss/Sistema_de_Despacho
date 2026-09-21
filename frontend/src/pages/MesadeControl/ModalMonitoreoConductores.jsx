// src/pages/MesadeControl/ModalMonitoreoConductores.jsx
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import API_BASE from '../../config/api';
import './ModalMonitoreoConductores.css';

export default function ModalMonitoreoConductores({
  isOpen,
  onClose,
  tipoTransporte,
  configActual,
  onSelectUnit,
}) {
  const [filtroTipo, setFiltroTipo] = useState('TODOS'); // TODOS, RELEVOS, TITULARES, SIN_CONDUCTOR
  const [filtroRuta, setFiltroRuta] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const {
    data: respuesta,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['monitoreo-conductores-dia', tipoTransporte],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;
      const res = await fetch(`${API_BASE}/api/despacho/monitoreo-conductores/${tipoTransporte}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Error al cargar monitoreo de conductores');
      return res.json();
    },
    enabled: isOpen && !!tipoTransporte,
    refetchInterval: isOpen ? 8000 : false,
  });

  const kpis = respuesta?.kpis || {
    total_flota: 0,
    total_operacion: 0,
    total_titulares: 0,
    total_relevos: 0,
    total_sin_conductor: 0,
    total_conductores_falta: 0,
  };

  const unidades = respuesta?.unidades || [];
  const conductoresFaltaList = respuesta?.conductores_falta || [];

  // Obtener rutas únicas para el filtro
  const rutasDisponibles = useMemo(() => {
    const setRutas = new Set();
    unidades.forEach((u) => {
      if (u.ruta_actual && u.ruta_actual !== 'Sin ruta') setRutas.add(u.ruta_actual);
      if (u.ruta_inicial && u.ruta_inicial !== 'Sin ruta') setRutas.add(u.ruta_inicial);
    });
    return Array.from(setRutas).sort();
  }, [unidades]);

  // Filtrado reactivo de conductores con falta
  const conductoresFaltaFiltrados = useMemo(() => {
    return conductoresFaltaList.filter((c) => {
      if (busqueda.trim() !== '') {
        const q = busqueda.toLowerCase().trim();
        const tarj = String(c.tarjeton || '').toLowerCase();
        const nom = String(c.nombre_completo || '').toLowerCase();
        const est = String(c.estado_servicio || '').toLowerCase();
        const tel = String(c.telefono || '').toLowerCase();
        const obs = String(c.observaciones || '').toLowerCase();

        return tarj.includes(q) || nom.includes(q) || est.includes(q) || tel.includes(q) || obs.includes(q);
      }
      return true;
    });
  }, [conductoresFaltaList, busqueda]);

  // Filtrado reactivo de unidades
  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      // Filtro por tipo/estado de conductor
      if (filtroTipo === 'RELEVOS' && !u.tiene_relevo) return false;
      if (filtroTipo === 'TITULARES' && u.estado_visual !== 'titular') return false;
      if (filtroTipo === 'SIN_CONDUCTOR' && u.estado_visual !== 'sin_conductor') return false;

      // Filtro por ruta
      if (filtroRuta !== 'TODAS') {
        const coincideRuta = (u.ruta_actual === filtroRuta) || (u.ruta_inicial === filtroRuta);
        if (!coincideRuta) return false;
      }

      // Buscador por texto (ECO, Tarjetón o Nombre)
      if (busqueda.trim() !== '') {
        const q = busqueda.toLowerCase().trim();
        const eco = String(u.numero_eco || '').toLowerCase();
        const iniTarj = String(u.tarjeton_inicial || '').toLowerCase();
        const iniCond = String(u.conductor_inicial || '').toLowerCase();
        const actTarj = String(u.tarjeton_actual || '').toLowerCase();
        const actCond = String(u.conductor_actual || '').toLowerCase();
        const ruta = String(u.ruta_actual || '').toLowerCase();

        const match = eco.includes(q) || iniTarj.includes(q) || iniCond.includes(q) || actTarj.includes(q) || actCond.includes(q) || ruta.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [unidades, filtroTipo, filtroRuta, busqueda]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="monitoreo-conductores-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="monitoreo-conductores-container" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="monitoreo-conductores-header">
          <div className="monitoreo-conductores-title-box">
            <div className="monitoreo-conductores-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h2 className="monitoreo-conductores-title">
                CONTROL DE CONDUCTORES Y RELEVOS
              </h2>
              <p className="monitoreo-conductores-subtitle">
                {configActual?.title || 'Mesa de Control'} &bull; Comparativa de Logística Inicial vs Operación Activa
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => refetch()}
              title="Actualizar datos"
              style={{
                background: '#f1f5f9',
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
              {isRefetching ? 'Actualizando...' : 'Actualizar'}
            </button>

            <button
              type="button"
              className="monitoreo-conductores-close"
              onClick={onClose}
              title="Cerrar ventana"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="monitoreo-conductores-body">
          {/* Tarjetas KPIs */}
          <div className="monitoreo-conductores-kpis">
            <div className="mc-kpi-card">
              <div className="mc-kpi-info">
                <span className="mc-kpi-label">Flota Activa</span>
                <span className="mc-kpi-value">{kpis.total_flota}</span>
              </div>
              <div className="mc-kpi-icon" style={{ background: '#f1f5f9', color: '#475569' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
            </div>

            <div className="mc-kpi-card mc-kpi-card--titulares">
              <div className="mc-kpi-info">
                <span className="mc-kpi-label">Titulares (Sin Cambios)</span>
                <span className="mc-kpi-value" style={{ color: '#15803d' }}>
                  {kpis.total_titulares}
                </span>
              </div>
              <div className="mc-kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>

            <div className="mc-kpi-card mc-kpi-card--relevos">
              <div className="mc-kpi-info">
                <span className="mc-kpi-label">Relevos / Cambios Hoy</span>
                <span className="mc-kpi-value" style={{ color: '#b45309' }}>
                  {kpis.total_relevos}
                </span>
              </div>
              <div className="mc-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>

            <div className="mc-kpi-card mc-kpi-card--sinconductor">
              <div className="mc-kpi-info">
                <span className="mc-kpi-label">Sin Conductor</span>
                <span className="mc-kpi-value" style={{ color: '#b91c1c' }}>
                  {kpis.total_sin_conductor}
                </span>
              </div>
              <div className="mc-kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            <button
              type="button"
              className={`mc-kpi-card mc-kpi-card--falta ${filtroTipo === 'FALTAS' ? 'mc-kpi-card--selected' : ''}`}
              onClick={() => setFiltroTipo('FALTAS')}
              style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
              title="Ver conductores con falta, permuta, incapacidad o enfermedad"
            >
              <div className="mc-kpi-info">
                <span className="mc-kpi-label">Conductores con Falta</span>
                <span className="mc-kpi-value" style={{ color: '#be123c' }}>
                  {kpis.total_conductores_falta || conductoresFaltaList.length}
                </span>
              </div>
              <div className="mc-kpi-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="17" y1="8" x2="22" y2="13" />
                  <line x1="22" y1="8" x2="17" y2="17" />
                </svg>
              </div>
            </button>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="monitoreo-conductores-toolbar">
            <div className="mc-filter-chips">
              <button
                type="button"
                className={`mc-chip ${filtroTipo === 'TODOS' ? 'mc-chip--active' : ''}`}
                onClick={() => setFiltroTipo('TODOS')}
              >
                Todos <span className="mc-chip-count">{unidades.length}</span>
              </button>
              <button
                type="button"
                className={`mc-chip ${filtroTipo === 'RELEVOS' ? 'mc-chip--active' : ''}`}
                onClick={() => setFiltroTipo('RELEVOS')}
              >
                Relevos y Cambios <span className="mc-chip-count">{kpis.total_relevos}</span>
              </button>
              <button
                type="button"
                className={`mc-chip ${filtroTipo === 'TITULARES' ? 'mc-chip--active' : ''}`}
                onClick={() => setFiltroTipo('TITULARES')}
              >
                Titulares <span className="mc-chip-count">{kpis.total_titulares}</span>
              </button>
              <button
                type="button"
                className={`mc-chip ${filtroTipo === 'SIN_CONDUCTOR' ? 'mc-chip--active' : ''}`}
                onClick={() => setFiltroTipo('SIN_CONDUCTOR')}
              >
                Sin Conductor <span className="mc-chip-count">{kpis.total_sin_conductor}</span>
              </button>
              <button
                type="button"
                className={`mc-chip ${filtroTipo === 'FALTAS' ? 'mc-chip--active' : ''}`}
                onClick={() => setFiltroTipo('FALTAS')}
              >
                Conductores con Falta <span className="mc-chip-count">{kpis.total_conductores_falta || conductoresFaltaList.length}</span>
              </button>
            </div>

            <div className="mc-filter-search">
              {filtroTipo !== 'FALTAS' && (
                <select
                  className="mc-route-select"
                  value={filtroRuta}
                  onChange={(e) => setFiltroRuta(e.target.value)}
                >
                  <option value="TODAS">Todas las rutas</option>
                  {rutasDisponibles.map((r) => (
                    <option key={r} value={r}>
                      Ruta {r}
                    </option>
                  ))}
                </select>
              )}

              <div className="mc-search-input-box">
                <svg className="mc-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder={filtroTipo === 'FALTAS' ? 'Buscar por tarjetón, nombre, estatus...' : 'Buscar por ECO, tarjetón, conductor...'}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="mc-search-input"
                />
              </div>
            </div>
          </div>

          {/* Tabla Comparativa / Conductores con Falta */}
          <div className="monitoreo-conductores-table-wrap">
            {isLoading ? (
              <div className="mc-empty-state">
                <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #cbd5e1', borderTopColor: '#6b1d33', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Cargando información de conductores...</p>
              </div>
            ) : filtroTipo === 'FALTAS' ? (
              conductoresFaltaFiltrados.length === 0 ? (
                <div className="mc-empty-state">
                  <svg className="mc-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>No se encontraron conductores con falta</p>
                  <p style={{ fontSize: '0.85rem' }}>No hay registradas faltas, permutas, incapacidades o enfermedades activas.</p>
                </div>
              ) : (
                <table className="mc-table">
                  <thead>
                    <tr>
                      <th style={{ width: '110px' }}>Tarjetón</th>
                      <th>Nombre del Conductor</th>
                      <th style={{ width: '110px' }}>Tipo</th>
                      <th style={{ width: '160px' }}>Estatus / Condición</th>
                      <th style={{ width: '140px' }}>Teléfono</th>
                      <th>Observaciones / Detalle</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conductoresFaltaFiltrados.map((c, index) => {
                      const est = (c.estado_servicio || '').toLowerCase();
                      let badgeClass = 'mc-status-badge--permiso';
                      let labelEstado = (c.estado_servicio || 'FALTA').toUpperCase();

                      if (est === 'falta') {
                        badgeClass = 'mc-status-badge--falta';
                        labelEstado = 'FALTA';
                      } else if (est === 'permuta') {
                        badgeClass = 'mc-status-badge--permuta';
                        labelEstado = 'PERMUTA';
                      } else if (est === 'incapacidad') {
                        badgeClass = 'mc-status-badge--incapacidad';
                        labelEstado = 'INCAPACIDAD';
                      } else if (est === 'enfermedad') {
                        badgeClass = 'mc-status-badge--enfermedad';
                        labelEstado = 'ENFERMEDAD';
                      }

                      return (
                        <tr key={c.id ? `c-${c.id}` : `falta-${c.tarjeton}-${index}`}>
                          {/* Tarjetón */}
                          <td>
                            <span className="mc-eco-badge" style={{ color: '#be123c', background: '#ffe4e6', border: '1px solid #fecdd3' }}>
                              {c.tarjeton}
                            </span>
                          </td>

                          {/* Conductor */}
                          <td>
                            <div className="mc-driver-box">
                              <span className="mc-driver-name" style={{ fontWeight: 700, color: '#0f172a' }}>
                                {c.nombre_completo}
                              </span>
                              {c.fecha_actualizacion && (
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  Actualizado: {c.fecha_actualizacion}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Tipo */}
                          <td>
                            <span className="mc-route-badge">
                              {c.tipo_tarjeton ? `Tipo ${c.tipo_tarjeton}` : 'General'}
                            </span>
                          </td>

                          {/* Estatus */}
                          <td>
                            <span className={`mc-status-badge ${badgeClass}`}>
                              {labelEstado}
                            </span>
                          </td>

                          {/* Teléfono */}
                          <td>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                              {c.telefono}
                            </span>
                          </td>

                          {/* Observaciones */}
                          <td>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {c.observaciones || 'Sin detalles'}
                            </span>
                          </td>

                          {/* Acumulado */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700 }}>
                              <span title="Total acumulado de faltas" style={{ background: '#fee2e2', color: '#991b1b', padding: '0.15rem 0.45rem', borderRadius: '0.3rem' }}>
                                F: {c.faltas}
                              </span>
                              <span title="Total acumulado de permutas" style={{ background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.45rem', borderRadius: '0.3rem' }}>
                                P: {c.permutas}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : unidadesFiltradas.length === 0 ? (
              <div className="mc-empty-state">
                <svg className="mc-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>No se encontraron unidades</p>
                <p style={{ fontSize: '0.85rem' }}>Prueba ajustando los filtros o el término de búsqueda.</p>
              </div>
            ) : (
              <table className="mc-table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>ECO</th>
                    <th style={{ width: '130px' }}>Ruta / Corrida</th>
                    <th>Conductor Inicial (Logística)</th>
                    <th>Conductor Actual</th>
                    <th style={{ width: '160px' }}>Estado</th>
                    <th>Detalle Relevo / Movimiento</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {unidadesFiltradas.map((u) => {
                    const statusDotClass =
                      u.estatus === 'operacion'
                        ? 'mc-eco-status-dot--operacion'
                        : u.estatus === 'reserva'
                        ? 'mc-eco-status-dot--reserva'
                        : u.estatus === 'mantenimiento'
                        ? 'mc-eco-status-dot--mantenimiento'
                        : 'mc-eco-status-dot--percance';

                    return (
                      <tr key={u.unidad_id}>
                        {/* ECO */}
                        <td>
                          <span className="mc-eco-badge">
                            <span className={`mc-eco-status-dot ${statusDotClass}`} />
                            {u.numero_eco}
                          </span>
                        </td>

                        {/* Ruta / Corrida */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span className="mc-route-badge">{u.ruta_actual}</span>
                            {u.corrida_actual && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Corrida: <strong>{u.corrida_actual}</strong>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Conductor Inicial */}
                        <td>
                          <div className="mc-driver-box">
                            {u.tarjeton_inicial ? (
                              <span className="mc-driver-tarjeton">
                                TARJETÓN: {u.tarjeton_inicial}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                SIN TARJETÓN
                              </span>
                            )}
                            <span className="mc-driver-name" style={{ color: u.conductor_inicial?.includes('No asignado') ? '#94a3b8' : '#0f172a' }}>
                              {u.conductor_inicial}
                            </span>
                          </div>
                        </td>

                        {/* Conductor Actual */}
                        <td>
                          <div className="mc-driver-box">
                            {u.tarjeton_actual ? (
                              <span className="mc-driver-tarjeton" style={{ color: u.tiene_relevo ? '#b45309' : '#15803d' }}>
                                TARJETÓN: {u.tarjeton_actual}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                                SIN CONDUCTOR
                              </span>
                            )}
                            <span
                              className="mc-driver-name"
                              style={{
                                color: u.tarjeton_actual ? (u.tiene_relevo ? '#78350f' : '#0f172a') : '#ef4444',
                                fontWeight: u.tiene_relevo ? 700 : 600,
                              }}
                            >
                              {u.conductor_actual}
                            </span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td>
                          {u.estado_visual === 'titular' && (
                            <span className="mc-status-badge mc-status-badge--titular">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Titular
                            </span>
                          )}
                          {u.estado_visual === 'relevo' && (
                            <span className="mc-status-badge mc-status-badge--relevo">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                              Relevo Realizado
                            </span>
                          )}
                          {u.estado_visual === 'sin_conductor' && (
                            <span className="mc-status-badge mc-status-badge--sinconductor">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              Sin Conductor
                            </span>
                          )}
                        </td>

                        {/* Detalle Relevo */}
                        <td>
                          {u.tiene_relevo || u.hora_movimiento ? (
                            <div>
                              {u.hora_movimiento && (
                                <div className="mc-detail-time">
                                  Hora: {u.hora_movimiento}
                                </div>
                              )}
                              <div className="mc-detail-reason" title={u.motivo_movimiento || 'Relevo de operación'}>
                                {u.motivo_movimiento || 'Relevo de operación'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                          )}
                        </td>

                        {/* Acción */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="mc-action-btn"
                            onClick={() => {
                              if (typeof onSelectUnit === 'function') {
                                onSelectUnit(u.numero_eco);
                              }
                              onClose();
                            }}
                            title={`Seleccionar unidad ECO ${u.numero_eco}`}
                          >
                            <span>Ver</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
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
