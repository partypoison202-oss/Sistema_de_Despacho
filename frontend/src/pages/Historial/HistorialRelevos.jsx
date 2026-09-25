import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import { formatAccion, getAccionBadgeStyle } from '../../utils/historialHelper';
import './Historial.css';

export default function HistorialRelevos() {
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tabla'); // 'tabla', 'bitacora', 'rutas'
  const [busqueda, setBusqueda] = useState('');
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

  // 2. Obtener datos de relevos de la fecha seleccionada
  const { data: serverData = { relevos: [], bitacora: [], resumen: {} }, isLoading: isLoadingDatos } = useQuery({
    queryKey: ['historial-relevos', selectedFecha],
    queryFn: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/historial-operativo/relevos/${selectedFecha}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener el historial de relevos');
      return response.json();
    },
    enabled: !!selectedFecha,
    staleTime: 1000 * 60 * 5,
  });

  const cargando = isLoadingFechas || (isLoadingDatos && !!selectedFecha);
  const relevos = serverData.relevos || [];
  const bitacora = serverData.bitacora || [];
  const resumen = serverData.resumen || {};

  const handleFechaChange = (f) => {
    setSelectedFecha(f);
    setIsDropdownOpen(false);
  };

  // Filtrado de relevos
  const relevosFiltrados = relevos.filter(r => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.economico && String(r.economico).toLowerCase().includes(q)) ||
      (r.titular_conductor && r.titular_conductor.toLowerCase().includes(q)) ||
      (r.titular_tarjeton && String(r.titular_tarjeton).toLowerCase().includes(q)) ||
      (r.relevo_conductor && r.relevo_conductor.toLowerCase().includes(q)) ||
      (r.relevo_tarjeton && String(r.relevo_tarjeton).toLowerCase().includes(q)) ||
      (r.ruta && r.ruta.toLowerCase().includes(q))
    );
  });

  const exportToExcel = () => {
    if (!relevosFiltrados || relevosFiltrados.length === 0) return;

    const worksheetData = relevosFiltrados.map(r => ({
      'ECO': r.economico || '',
      'TIPO DE UNIDAD': r.tipo ? (String(r.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(r.tipo).toUpperCase()) : '',
      'RUTA': r.ruta || 'SIN RUTA',
      'TARJETÓN TITULAR': r.titular_tarjeton || '',
      'CONDUCTOR TITULAR': r.titular_conductor || 'SIN ASIGNAR',
      'TARJETÓN RELEVO': r.relevo_tarjeton || '',
      'CONDUCTOR RELEVO': r.relevo_conductor || '',
      'HORA DE RELEVO': r.relevo_hora || '—',
      'ESTATUS': r.estatus ? String(r.estatus).toUpperCase() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial_Relevos');
    XLSX.writeFile(workbook, `Historial_Relevos_${selectedFecha}.xlsx`);
  };

  // Agrupar relevos por ruta
  const relevosPorRuta = {};
  relevosFiltrados.forEach(r => {
    const rutaKey = r.ruta || 'SIN RUTA';
    if (!relevosPorRuta[rutaKey]) {
      relevosPorRuta[rutaKey] = [];
    }
    relevosPorRuta[rutaKey].push(r);
  });

  return (
    <div className="historial-page">
      <Header title="Histórico de Relevos" hideBackButton={false} />

      <main className="historial-content">
        {/* Cabecera con Título y Controles */}
        <div className="historial-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Histórico de Relevos de Operadores
              </h2>
              <span style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '800',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em'
              }}>
                RELEVOS T6 Y PASTELES
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Registro de asignación de relevos de turno, cambio de tarjetones y movimientos por fecha.
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
              disabled={cargando || relevosFiltrados.length === 0}
              title="Descargar Historial de Relevos en Excel"
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

        {/* Tarjetas KPI */}
        {!cargando && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Relevos</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{resumen.total_relevos || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Unidades con relevo asignado</p>
            </div>

            <div style={{ background: '#f0f9ff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bae6fd', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>Rutas Afectadas</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#0284c7' }}>{resumen.total_rutas || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#0369a1' }}>Rutas con cambio de turno</p>
            </div>

            <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>Movimientos en Bitácora</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#b45309' }}>{resumen.total_cambios_bitacora || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#d97706' }}>Registros de cambios de relevo</p>
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
            Tabla de Relevos ({relevosFiltrados.length})
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'bitacora' ? 'active' : ''}`}
            onClick={() => setActiveTab('bitacora')}
          >
            Bitácora de Movimientos ({bitacora.length})
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
            <h3 style={{ color: '#4b5563', margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Cargando historial de relevos...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.85rem' }}>Consultando base de datos de la operación</p>
          </div>
        ) : activeTab === 'tabla' ? (
          <div>
            {/* Buscador */}
            <div style={{ marginBottom: '1rem', background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <input
                type="text"
                placeholder="Buscar por ECO, Conductor Titular, Relevo, Tarjetón o Ruta..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="historial-table" style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '70px' }}>ECO</th>
                    <th style={{ minWidth: '120px' }}>TIPO UNIDAD</th>
                    <th style={{ minWidth: '130px' }}>RUTA</th>
                    <th style={{ minWidth: '220px' }}>CONDUCTOR TITULAR</th>
                    <th style={{ minWidth: '220px' }}>CONDUCTOR RELEVO</th>
                    <th style={{ minWidth: '110px' }}>HORA RELEVO</th>
                    <th style={{ minWidth: '120px' }}>ESTATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {relevosFiltrados.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '800', color: '#0f172a' }}>{r.economico}</td>
                      <td style={{ fontWeight: '600' }}>{r.tipo ? (String(r.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(r.tipo).toUpperCase()) : '-'}</td>
                      <td style={{ fontWeight: '700', color: '#1e3a8a' }}>{r.ruta || 'SIN RUTA'}</td>
                      <td>
                        <span style={{ fontWeight: '700', color: '#6b1d33', marginRight: '0.5rem' }}>[{r.titular_tarjeton || '-'}]</span>
                        <span style={{ fontWeight: '600', color: '#334155' }}>{r.titular_conductor || 'SIN ASIGNAR'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', color: '#0284c7', marginRight: '0.5rem' }}>[{r.relevo_tarjeton || '-'}]</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{r.relevo_conductor || '—'}</span>
                      </td>
                      <td style={{ fontWeight: '700', color: '#475569' }}>{r.relevo_hora || '—'}</td>
                      <td>
                        <span className="estatus-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>
                          {r.estatus ? String(r.estatus).toUpperCase() : 'RELEVO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {relevosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No se encontraron registros de relevos para la fecha seleccionada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'bitacora' ? (
          <div className="table-responsive">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>HORA</th>
                  <th>ECO</th>
                  <th>USUARIO</th>
                  <th>TIPO DE ACCIÓN</th>
                  <th>DETALLES DE RELEVO</th>
                </tr>
              </thead>
              <tbody>
                {bitacora.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: '700', color: '#475569' }}>
                      {b.hora ? new Date(b.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                    </td>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{b.economico}</td>
                    <td style={{ fontWeight: '600', color: '#334155' }}>{b.usuario_nombre || 'Sistema'}</td>
                    <td>
                      <span className="estatus-badge" style={getAccionBadgeStyle(b.tipo_accion)}>
                        {formatAccion(b.tipo_accion)}
                      </span>
                    </td>
                    <td style={{ color: '#334155', fontSize: '0.9rem' }}>{b.detalles || '—'}</td>
                  </tr>
                ))}
                {bitacora.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No se registraron cambios en la bitácora de relevos para esta fecha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {Object.keys(relevosPorRuta).map((rutaName) => (
              <div key={rutaName} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1e3a8a' }}>{rutaName}</h4>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '800', fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                    {relevosPorRuta[rutaName].length} Relevos
                  </span>
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {relevosPorRuta[rutaName].map((item, idx) => (
                    <div key={idx} style={{ padding: '0.5rem 0', borderBottom: idx === relevosPorRuta[rutaName].length - 1 ? 'none' : '1px dashed #f1f5f9', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: '800', color: '#0f172a' }}>ECO {item.economico}</span>
                        <span style={{ fontWeight: '700', color: '#475569' }}>{item.relevo_hora || '—'}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                        <div><strong style={{ color: '#6b1d33' }}>Titular:</strong> [{item.titular_tarjeton || '-'}] {item.titular_conductor || 'Sin asignar'}</div>
                        <div><strong style={{ color: '#0284c7' }}>Relevo:</strong> [{item.relevo_tarjeton || '-'}] {item.relevo_conductor || 'Sin asignar'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(relevosPorRuta).length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                No hay asignación de relevos por rutas registradas en esta fecha.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
