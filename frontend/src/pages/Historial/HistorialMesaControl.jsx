import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import { formatAccion, getAccionBadgeStyle } from '../../utils/historialHelper';
import './Historial.css';

export default function HistorialMesaControl() {
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('cambios'); // 'cambios', 'flota', 'resumen'
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const dropdownRef = useRef(null);

  // 1. Fechas con historial
  const { data: fechas = [], isLoading: isLoadingFechas } = useQuery({
    queryKey: ['historial-fechas'],
    queryFn: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/historial-operativo/fechas`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!response.ok) throw new Error('Error al obtener fechas');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (fechas.length > 0 && !selectedFecha) {
      setSelectedFecha(fechas[0]);
    }
  }, [fechas, selectedFecha]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Datos de Mesa de Control
  const { data: serverData = { inicio: [], cambios: [], fin: [], resumen: {} }, isLoading: isLoadingDatos } = useQuery({
    queryKey: ['historial-mesa-control', selectedFecha],
    queryFn: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/historial-operativo/mesa-control/${selectedFecha}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!response.ok) throw new Error('Error al obtener historial de mesa de control');
      return response.json();
    },
    enabled: !!selectedFecha,
    staleTime: 1000 * 60 * 5,
  });

  const cargando = isLoadingFechas || (isLoadingDatos && !!selectedFecha);
  const cambios = serverData.cambios || [];
  const flota = serverData.fin || serverData.inicio || [];
  const resumen = serverData.resumen || {};

  const handleFechaChange = (f) => {
    setSelectedFecha(f);
    setIsDropdownOpen(false);
  };

  const formatearHora = (fechaStr) => {
    if (!fechaStr) return '—';
    try {
      const f = new Date(fechaStr);
      return f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return fechaStr;
    }
  };

  // Filtrado de cambios
  const cambiosFiltrados = cambios.filter((c) => {
    const q = busqueda.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (c.economico && String(c.economico).toLowerCase().includes(q)) ||
      (c.tipo_unidad && c.tipo_unidad.toLowerCase().includes(q)) ||
      (c.tipo_accion && c.tipo_accion.toLowerCase().includes(q)) ||
      (c.detalles && c.detalles.toLowerCase().includes(q)) ||
      (c.usuario_nombre && c.usuario_nombre.toLowerCase().includes(q));

    const matchesTipo = !filtroTipo || String(c.tipo_unidad || '').toUpperCase() === filtroTipo.toUpperCase();
    return matchesSearch && matchesTipo;
  });

  // Filtrado de flota
  const flotaFiltrada = flota.filter((u) => {
    const q = busqueda.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.economico && String(u.economico).toLowerCase().includes(q)) ||
      (u.nombre_conductor && u.nombre_conductor.toLowerCase().includes(q)) ||
      (u.ruta && u.ruta.toLowerCase().includes(q)) ||
      (u.numero_tarjeton && String(u.numero_tarjeton).toLowerCase().includes(q));

    const matchesTipo = !filtroTipo || String(u.tipo || u.tipo_unidad || '').toUpperCase() === filtroTipo.toUpperCase();
    return matchesSearch && matchesTipo;
  });

  const exportToExcel = () => {
    if (activeTab === 'cambios') {
      if (cambiosFiltrados.length === 0) return;
      const worksheetData = cambiosFiltrados.map((d) => ({
        HORA: formatearHora(d.hora),
        ECO: d.economico || '',
        'TIPO DE UNIDAD': d.tipo_unidad ? String(d.tipo_unidad).toUpperCase() : '',
        'TIPO DE ACCIÓN': formatAccion(d.tipo_accion),
        'ESTATUS ANTERIOR': d.estatus_anterior ? String(d.estatus_anterior).toUpperCase() : 'N/A',
        'ESTATUS NUEVO': d.estatus_nuevo ? String(d.estatus_nuevo).toUpperCase() : 'N/A',
        DETALLES: d.detalles || '',
        'USUARIO RESPONSABLE': d.usuario_nombre || 'SISTEMA',
        ROL: d.usuario_rol || '—',
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const colWidths = Object.keys(worksheetData[0] || {}).map((key) => ({
        wch: Math.max(key.length, ...worksheetData.map((row) => String(row[key] || '').length)) + 2,
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos_Mesa_Control');
      XLSX.writeFile(workbook, `Movimientos_Mesa_Control_${selectedFecha}.xlsx`);
    } else {
      if (flotaFiltrada.length === 0) return;
      const worksheetData = flotaFiltrada.map((d) => ({
        ECO: d.economico || '',
        TIPO: d.tipo || d.tipo_unidad || '',
        ESTATUS: d.estatus ? String(d.estatus).toUpperCase() : '',
        RUTA: d.ruta || 'SIN RUTA',
        TARJETÓN: d.numero_tarjeton || '',
        CONDUCTOR: d.nombre_conductor || 'SIN ASIGNAR',
        'SALIDA PATIO': d.hora_salida || '—',
        ACOPLE: d.acople || '—',
        'OBS / MOTIVO': d.motivo || d.motivo_estatus || d.falla || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const colWidths = Object.keys(worksheetData[0] || {}).map((key) => ({
        wch: Math.max(key.length, ...worksheetData.map((row) => String(row[key] || '').length)) + 2,
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Flota_Mesa_Control');
      XLSX.writeFile(workbook, `Flota_Mesa_Control_${selectedFecha}.xlsx`);
    }
  };

  const getEstatusBadgeStyle = (estatus) => {
    const est = String(estatus || '').toLowerCase().trim();
    if (est.includes('operaci')) return { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' };
    if (est.includes('reserva')) return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
    if (est.includes('mantenimiento')) return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' };
    if (est.includes('percance')) return { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' };
    return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  };

  return (
    <div className="historial-page">
      <Header title="Historial Mesa de Control" hideBackButton={false} />

      <main className="historial-content">
        {/* Encabezado y Filtro de Fecha */}
        <div className="historial-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Histórico de Mesa de Control
              </h2>
              <span
                style={{
                  backgroundColor: '#601a2a',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em',
                }}
              >
                MOVIMIENTOS OPERATIVOS
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Registro de movimientos, cambios de unidad, reasignación de operadores y estatus de flota en Mesa de Control.
            </p>
          </div>

          <div className="historial-filter" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: '700', color: '#334155' }}>Fecha:</label>
            <div className="custom-dropdown-container" ref={dropdownRef}>
              <button
                type="button"
                className={`custom-dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
                onClick={() => !cargando && setIsDropdownOpen(!isDropdownOpen)}
                disabled={cargando}
              >
                {selectedFecha || 'SELECCIONAR'}
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </button>
              {isDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {fechas.map((f) => (
                      <button
                        key={f}
                        type="button"
                        className={`custom-dropdown-item ${selectedFecha === f ? 'selected' : ''}`}
                        onClick={() => handleFechaChange(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              className="export-excel-btn"
              onClick={exportToExcel}
              disabled={cargando || (activeTab === 'cambios' ? cambiosFiltrados.length === 0 : flotaFiltrada.length === 0)}
              title="Descargar datos en Excel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Excel
            </button>
          </div>
        </div>

        {/* Tarjetas KPI de Resumen */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Movimientos</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#601a2a', marginTop: '0.25rem' }}>
              {cargando ? '—' : (resumen.total_cambios ?? cambios.length)}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Acciones registradas</span>
          </div>

          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>En Operación</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#15803d', marginTop: '0.25rem' }}>
              {cargando ? '—' : (resumen.total_operacion ?? 0)}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Unidades activas</span>
          </div>

          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>En Reserva</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0369a1', marginTop: '0.25rem' }}>
              {cargando ? '—' : (resumen.total_reserva ?? 0)}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Disponibles</span>
          </div>

          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>En Mantenimiento</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#b45309', marginTop: '0.25rem' }}>
              {cargando ? '—' : (resumen.total_mantenimiento ?? 0)}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>En taller / patio</span>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="historial-tabs" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'cambios' ? 'active' : ''}`}
            onClick={() => setActiveTab('cambios')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Bitácora de Movimientos y Cambios ({cambios.length})
          </button>

          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'flota' ? 'active' : ''}`}
            onClick={() => setActiveTab('flota')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <path d="M16 8h4l3 5v3h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Estado de Flota ({flota.length})
          </button>
        </div>

        {/* Barra de Búsqueda y Filtro de Tipo */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94a3b8' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder={activeTab === 'cambios' ? 'Buscar por unidad, acción, detalles o usuario...' : 'Buscar por unidad, ruta, conductor o tarjetón...'}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Tipo:</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Todos los Tipos</option>
              <option value="URBANUSS">URBANUSS</option>
              <option value="ZAFIRO">ZAFIRO</option>
              <option value="VAGONETA">VAGONETA</option>
              <option value="ORION">ORIÓN</option>
            </select>
          </div>
        </div>

        {/* CONTENIDO SEGÚN PESTAÑA */}
        {cargando ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
            Cargando historial de Mesa de Control...
          </div>
        ) : activeTab === 'cambios' ? (
          cambiosFiltrados.length > 0 ? (
            <div className="historial-table-container">
              <table className="historial-table">
                <thead>
                  <tr>
                    <th style={{ width: '85px' }}>Hora</th>
                    <th style={{ width: '90px' }}>Unidad</th>
                    <th style={{ width: '110px' }}>Tipo</th>
                    <th>Acción / Movimiento</th>
                    <th>De (Anterior)</th>
                    <th>A (Nuevo)</th>
                    <th>Detalles de la Operación</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {cambiosFiltrados.map((c, i) => {
                    const badgeStyle = getAccionBadgeStyle(c.tipo_accion);
                    return (
                      <tr key={c.id || i}>
                        <td style={{ fontWeight: '700', color: '#64748b', fontSize: '0.8rem' }}>
                          {formatearHora(c.hora)}
                        </td>
                        <td style={{ fontWeight: '800', color: '#601a2a' }}>
                          {c.economico ? `ECO${String(c.economico).padStart(3, '0')}` : '—'}
                        </td>
                        <td style={{ fontWeight: '600', color: '#334155' }}>
                          {c.tipo_unidad ? String(c.tipo_unidad).toUpperCase() : '—'}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              letterSpacing: '0.03em',
                              backgroundColor: badgeStyle.backgroundColor,
                              color: badgeStyle.color,
                              border: badgeStyle.border,
                            }}
                          >
                            {formatAccion(c.tipo_accion)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                            {c.estatus_anterior ? String(c.estatus_anterior).toUpperCase() : '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '700' }}>
                            {c.estatus_nuevo ? String(c.estatus_nuevo).toUpperCase() : '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.83rem', color: '#334155' }}>
                          {c.detalles || 'Sin observaciones'}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: '700', color: '#1e293b', display: 'block' }}>
                            {c.usuario_nombre || 'Sistema'}
                          </span>
                          {c.usuario_rol && (
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {c.usuario_rol}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                No se registraron movimientos en Mesa de Control para esta fecha.
              </p>
            </div>
          )
        ) : flotaFiltrada.length > 0 ? (
          <div className="historial-table-container">
            <table className="historial-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Unidad</th>
                  <th style={{ width: '110px' }}>Tipo</th>
                  <th style={{ width: '130px' }}>Estatus</th>
                  <th>Ruta</th>
                  <th>Tarjetón</th>
                  <th>Conductor</th>
                  <th>Salida Patio</th>
                  <th>Acople</th>
                  <th>Motivo / Observación</th>
                </tr>
              </thead>
              <tbody>
                {flotaFiltrada.map((u, i) => {
                  const estStyle = getEstatusBadgeStyle(u.estatus);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: '800', color: '#601a2a' }}>
                        {u.economico ? `ECO${String(u.economico).padStart(3, '0')}` : '—'}
                      </td>
                      <td style={{ fontWeight: '600', color: '#334155' }}>
                        {u.tipo || u.tipo_unidad || '—'}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            ...estStyle,
                          }}
                        >
                          {u.estatus ? String(u.estatus).toUpperCase() : 'SIN ESTATUS'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', color: '#1e40af' }}>{u.ruta || '—'}</td>
                      <td style={{ fontWeight: '700' }}>{u.numero_tarjeton || '—'}</td>
                      <td>{u.nombre_conductor || 'Sin asignar'}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{u.hora_salida || '—'}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{u.acople || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {u.motivo || u.motivo_estatus || u.falla || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
              No se encontraron datos de flota para esta fecha.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
