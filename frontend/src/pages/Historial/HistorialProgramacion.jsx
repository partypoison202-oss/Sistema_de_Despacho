import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import { AuthContext } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import './Historial.css';

export default function HistorialProgramacion({ isPastelesOnly = false }) {
  const { user } = useContext(AuthContext);
  const userRol = String(user?.role?.codigo || '').toUpperCase().trim();
  const isPastelesUser = userRol === 'PASTELES' || userRol === 'PROGRAMACION_PASTELES';
  const isPastelesMode = isPastelesOnly || isPastelesUser;

  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tabla'); // 'tabla', 'flota', 'rutas'
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroModo, setFiltroModo] = useState('TODOS'); // 'TODOS', 'ALIMENTADORAS', 'TRONCALES'
  const dropdownRef = useRef(null);

  // 1. Obtener fechas con historial
  const { data: fechas = [], isLoading: isLoadingFechas } = useQuery({
    queryKey: ['historial-fechas'],
    queryFn: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/historial-operativo/fechas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
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

  // 2. Obtener datos de programación del día seleccionado
  const { data: serverData = { programacion: [], resumen: {} }, isLoading: isLoadingDatos } = useQuery({
    queryKey: ['historial-programacion', selectedFecha],
    queryFn: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/historial-operativo/programacion/${selectedFecha}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener la programación');
      return response.json();
    },
    enabled: !!selectedFecha,
    staleTime: 1000 * 60 * 5,
  });

  const cargando = isLoadingFechas || (isLoadingDatos && !!selectedFecha);
  const rawProgramacion = serverData.programacion || [];
  const serverResumen = serverData.resumen || {};

  const handleFechaChange = (f) => {
    setSelectedFecha(f);
    setIsDropdownOpen(false);
  };

  // Helper para identificar si un tipo es Urbanuss (Troncal)
  const isTroncal = (tipoStr) => {
    const t = String(tipoStr || '').toUpperCase().trim();
    return t === 'URBANUSS' || t === 'URBANUS';
  };

  // Filtrado general según filtroModo (TODOS, ALIMENTADORAS, TRONCALES)
  const baseProgramacion = rawProgramacion.filter(item => {
    const tipo = item.tipo || item.tipo_unidad;
    if (filtroModo === 'ALIMENTADORAS') {
      return !isTroncal(tipo);
    }
    if (filtroModo === 'TRONCALES') {
      return isTroncal(tipo);
    }
    return true; // TODOS incluye URBANUSS y todas las demás unidades
  });

  // Cálculo de estadísticas dinámicas según el modo seleccionado
  const resumen = useMemo(() => {
    if (filtroModo === 'TODOS' && serverResumen.total_programadas !== undefined) {
      return serverResumen;
    }

    const total = baseProgramacion.length;
    const operacion = baseProgramacion.filter(d => String(d.estatus || '').toLowerCase().includes('operaci')).length;
    const reserva = baseProgramacion.filter(d => String(d.estatus || '').toLowerCase().includes('reserva')).length;
    const mantenimiento = baseProgramacion.filter(d => String(d.estatus || '').toLowerCase().includes('mantenimiento')).length;
    const percance = baseProgramacion.filter(d => String(d.estatus || '').toLowerCase().includes('percance')).length;
    const con_conductor = baseProgramacion.filter(d => d.nombre_conductor && String(d.nombre_conductor).trim() !== '').length;
    const sin_conductor = total - con_conductor;

    // Resumen por tipo
    const tiposMap = {};
    baseProgramacion.forEach(d => {
      let t = d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : 'OTRO';
      if (!tiposMap[t]) {
        tiposMap[t] = { tipo: t, total: 0, operacion: 0, reserva: 0, mantenimiento: 0, percance: 0 };
      }
      tiposMap[t].total++;
      const est = String(d.estatus || '').toLowerCase();
      if (est.includes('operaci')) tiposMap[t].operacion++;
      else if (est.includes('reserva')) tiposMap[t].reserva++;
      else if (est.includes('mantenimiento')) tiposMap[t].mantenimiento++;
      else if (est.includes('percance')) tiposMap[t].percance++;
    });

    // Resumen por ruta
    const rutasMap = {};
    baseProgramacion.forEach(d => {
      const r = d.ruta || 'SIN RUTA';
      if (!rutasMap[r]) {
        rutasMap[r] = { ruta: r, total: 0, unidades: [] };
      }
      rutasMap[r].total++;
      rutasMap[r].unidades.push({
        economico: d.economico,
        conductor: d.nombre_conductor,
        estatus: d.estatus
      });
    });

    return {
      total_programadas: total,
      operacion,
      reserva,
      mantenimiento,
      percance,
      con_conductor,
      sin_conductor,
      por_tipo: Object.values(tiposMap),
      por_ruta: Object.values(rutasMap)
    };
  }, [baseProgramacion, filtroModo, isPastelesOnly, serverResumen]);

  // Filtrado fino para la tabla (búsqueda, tipo específico, estatus)
  const programacionFiltrada = baseProgramacion.filter(item => {
    const q = busqueda.toLowerCase().trim();
    const matchesSearch = !q || (
      (item.economico && String(item.economico).toLowerCase().includes(q)) ||
      (item.nombre_conductor && item.nombre_conductor.toLowerCase().includes(q)) ||
      (item.numero_tarjeton && String(item.numero_tarjeton).toLowerCase().includes(q)) ||
      (item.ruta && item.ruta.toLowerCase().includes(q))
    );

    const matchesTipo = !filtroTipo || String(item.tipo || item.tipo_unidad || '').toUpperCase() === filtroTipo.toUpperCase();
    
    const estLower = String(item.estatus || '').toLowerCase().trim();
    const matchesEstatus = !filtroEstatus || estLower === filtroEstatus.toLowerCase().trim();

    return matchesSearch && matchesTipo && matchesEstatus;
  });

  const exportToExcel = () => {
    if (!programacionFiltrada || programacionFiltrada.length === 0) return;

    const worksheetData = programacionFiltrada.map(d => ({
      'ECO': d.economico || '',
      'TIPO DE UNIDAD': d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '',
      'RUTA': d.ruta || 'SIN RUTA',
      'TARJETÓN TITULAR': d.numero_tarjeton || '',
      'CONDUCTOR TITULAR': d.nombre_conductor || 'SIN ASIGNAR',
      'ESTATUS INICIAL': d.estatus ? String(d.estatus).toUpperCase() : '',
      'HORA SALIDA PATIO': d.hora_salida || '—',
      'HORA ACOPLE': d.acople || '—',
      'TARJETÓN RELEVO': d.relevo_tarjeton || '',
      'CONDUCTOR RELEVO': d.relevo_conductor || '',
      'MOTIVO / OBS': d.motivo || d.motivo_estatus || d.falla || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    const sheetName = isPastelesOnly || filtroModo === 'PASTELES' ? 'Prog_Pasteles' : 'Prog_Logistica';
    const fileName = isPastelesOnly || filtroModo === 'PASTELES'
      ? `Programacion_Pasteles_${selectedFecha}.xlsx`
      : `Programacion_Logistica_${selectedFecha}.xlsx`;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
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
      <Header title={isPastelesOnly ? "Programación y Logística (Pasteles)" : "Programación y Logística"} hideBackButton={false} />

      <main className="historial-content">
        {/* Cabecera con Título y Controles */}
        <div className="historial-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {isPastelesOnly
                  ? "Histórico de Programación y Logística (Pasteles)"
                  : "Histórico de Programación de Día Operativo"}
              </h2>
              {isPastelesOnly && (
                <span style={{
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em'
                }}>
                  CAMBIOS EN TIEMPO REAL
                </span>
              )}
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              {isPastelesOnly
                ? "Registro histórico de asignación de flota, cambios operativos al momento y relevos en turno."
                : "Registro de distribución de flota, operadores asignados y estatus logístico por fecha."}
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
                    {fechas.map(f => (
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
              disabled={cargando || programacionFiltrada.length === 0}
              title="Descargar Programación en Excel"
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

        {/* Tarjetas de Resumen Logístico */}
        {!cargando && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Programación Total</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{resumen.total_programadas || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Unidades registradas</p>
            </div>

            <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>En Operación</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#15803d' }}>{resumen.operacion || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#16a34a' }}>
                {filtroModo === 'PASTELES' ? 'Solo Alimentadoras' : filtroModo === 'TRONCALES' ? 'Solo Urbanuss' : 'Troncales y Alimentadoras'}
              </p>
            </div>

            <div style={{ background: '#f0f9ff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bae6fd', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#075985', textTransform: 'uppercase' }}>En Reserva</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#0369a1' }}>{resumen.reserva || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#0284c7' }}>Disponibles para relevo</p>
            </div>

            <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>Mantenimiento</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#b45309' }}>{resumen.mantenimiento || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#d97706' }}>Taller / Inactivas</p>
            </div>

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Conductores Asignados</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#6b1d33' }}>{resumen.con_conductor || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>{resumen.sin_conductor || 0} sin conductor</p>
            </div>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="historial-tabs">
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'tabla' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabla')}
          >
            Programación {isPastelesOnly || filtroModo === 'PASTELES' ? 'Pasteles' : 'General'}
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'flota' ? 'active' : ''}`}
            onClick={() => setActiveTab('flota')}
          >
            Resumen por Flota
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'rutas' ? 'active' : ''}`}
            onClick={() => setActiveTab('rutas')}
          >
            Distribución por Rutas
          </button>
        </div>

        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ marginBottom: '1.25rem' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Cargando programación...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.85rem' }}>Buscando información logística en la base de datos</p>
          </div>
        ) : activeTab === 'tabla' ? (
          <div>
            {/* Barra de Filtros */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  placeholder="Buscar por ECO, Conductor, Tarjetón o Ruta..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <select
                value={filtroModo}
                onChange={e => setFiltroModo(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #0d9488', outline: 'none', fontSize: '0.9rem', background: '#f0fdfa', color: '#0f766e', fontWeight: '800' }}
              >
                <option value="TODOS">TODAS LAS FLOTAS (URBANUSS + ALIMENTADORAS)</option>
                <option value="ALIMENTADORAS">SOLO ALIMENTADORAS (ZAFIRO, VAGONETA, ORION)</option>
                <option value="TRONCALES">SOLO TRONCALES (URBANUSS)</option>
              </select>

              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', background: '#fff', fontWeight: '600' }}
              >
                <option value="">TODOS LOS TIPOS</option>
                <option value="URBANUSS">URBANUSS</option>
                <option value="ZAFIRO">ZAFIRO</option>
                <option value="VAGONETA">VAGONETA</option>
                <option value="ORION">ORION</option>
              </select>

              <select
                value={filtroEstatus}
                onChange={e => setFiltroEstatus(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', background: '#fff', fontWeight: '600' }}
              >
                <option value="">TODOS LOS ESTATUS</option>
                <option value="operacion">OPERACIÓN</option>
                <option value="reserva">RESERVA</option>
                <option value="mantenimiento">MANTENIMIENTO</option>
                <option value="percance">PERCANCE</option>
              </select>
            </div>

            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="historial-table" style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '70px' }}>ECO</th>
                    <th style={{ minWidth: '120px' }}>TIPO UNIDAD</th>
                    <th style={{ minWidth: '130px' }}>RUTA</th>
                    <th style={{ minWidth: '100px' }}>TARJETÓN</th>
                    <th style={{ minWidth: '220px' }}>CONDUCTOR TITULAR</th>
                    <th style={{ minWidth: '140px' }}>ESTATUS PROGRAMADO</th>
                    <th style={{ minWidth: '110px' }}>SALIDA PATIO</th>
                    <th style={{ minWidth: '100px' }}>ACOPLE</th>
                    <th style={{ minWidth: '180px' }}>RELEVO</th>
                  </tr>
                </thead>
                <tbody>
                  {programacionFiltrada.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '800', color: '#0f172a' }}>{d.economico}</td>
                      <td style={{ fontWeight: '600' }}>{d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '-'}</td>
                      <td style={{ fontWeight: '700', color: '#1e3a8a' }}>{d.ruta || 'SIN RUTA'}</td>
                      <td style={{ fontWeight: '700', color: '#6b1d33' }}>{d.numero_tarjeton || '-'}</td>
                      <td style={{ fontWeight: '600', color: d.nombre_conductor ? '#1e293b' : '#94a3b8' }}>
                        {d.nombre_conductor || 'SIN ASIGNAR'}
                      </td>
                      <td>
                        <span className="estatus-badge" style={getEstatusBadgeStyle(d.estatus)}>
                          {d.estatus ? String(d.estatus).toUpperCase() : 'DESCONOCIDO'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', color: '#475569' }}>{d.hora_salida || '—'}</td>
                      <td style={{ fontWeight: '700', color: '#475569' }}>{d.acople || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {d.relevo_conductor ? (
                          <div>
                            <span style={{ fontWeight: '700', color: '#6b1d33' }}>{d.relevo_tarjeton}</span> - {d.relevo_conductor}
                            {d.relevo_hora && <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>({d.relevo_hora})</span>}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                  {programacionFiltrada.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No se encontraron registros de programación con los filtros seleccionados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'flota' ? (
          <div className="table-responsive">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>TIPO DE FLOTA</th>
                  <th className="text-center">TOTAL PROGRAMADAS</th>
                  <th className="text-center">OPERACIÓN</th>
                  <th className="text-center">RESERVA</th>
                  <th className="text-center">MANTENIMIENTO</th>
                  <th className="text-center">PERCANCE</th>
                </tr>
              </thead>
              <tbody>
                {(resumen.por_tipo || []).map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{t.tipo}</td>
                    <td className="text-center" style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>{t.total}</td>
                    <td className="text-center" style={{ fontWeight: '700', color: '#16a34a' }}>{t.operacion}</td>
                    <td className="text-center" style={{ fontWeight: '700', color: '#0284c7' }}>{t.reserva}</td>
                    <td className="text-center" style={{ fontWeight: '700', color: '#d97706' }}>{t.mantenimiento}</td>
                    <td className="text-center" style={{ fontWeight: '700', color: '#dc2626' }}>{t.percance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {(resumen.por_ruta || []).map((r, i) => (
              <div key={i} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1e3a8a' }}>{r.ruta}</h4>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '800', fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                    {r.total} Unidades
                  </span>
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {r.unidades.map((u, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: idx === r.unidades.length - 1 ? 'none' : '1px dashed #f1f5f9', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontWeight: '800', color: '#0f172a', marginRight: '0.5rem' }}>ECO {u.economico}</span>
                        <span style={{ color: '#475569' }}>{u.conductor || 'SIN CONDUCTOR'}</span>
                      </div>
                      <span className="estatus-badge" style={{ ...getEstatusBadgeStyle(u.estatus), fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                        {u.estatus ? String(u.estatus).toUpperCase() : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(resumen.por_ruta || []).length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                No hay asignación de rutas registradas en la programación de esta fecha.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
