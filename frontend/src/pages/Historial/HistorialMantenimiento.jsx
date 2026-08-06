import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import './Historial.css';

export default function HistorialMantenimiento() {
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'cambios', 'fin', 'checklists'
  const dropdownRef = useRef(null);

  // 1. Obtener listado de fechas únicas (Cacheado por 5 minutos)
  const { data: fechas = [], isLoading: isLoadingFechas } = useQuery({
    queryKey: ['historial-fechas'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-operativo/fechas`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener fechas');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Autoseleccionar la fecha más reciente al cargar las fechas
  useEffect(() => {
    if (fechas.length > 0 && !selectedFecha) {
      setSelectedFecha(fechas[0]);
    }
  }, [fechas, selectedFecha]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Obtener el historial estructurado (inicio, cambios, fin, checklists)
  const { data: datos = { inicio: [], cambios: [], fin: [], checklists: [] }, isLoading: isLoadingDatos } = useQuery({
    queryKey: ['historial-mantenimiento', selectedFecha],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-operativo/mantenimiento/${selectedFecha}`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener el historial');
      return response.json();
    },
    enabled: !!selectedFecha,
    staleTime: 1000 * 60 * 5,
  });

  const cargando = isLoadingFechas || (isLoadingDatos && !!selectedFecha);

  const handleFechaChange = (f) => {
    setSelectedFecha(f);
    setIsDropdownOpen(false);
  };

  const getActiveData = () => {
    if (activeTab === 'inicio') return datos.inicio || [];
    if (activeTab === 'cambios') return datos.cambios || [];
    if (activeTab === 'fin') return datos.fin || [];
    return datos.checklists || [];
  };

  const activeData = getActiveData();

  // Filtrado local por buscador
  const datosFiltrados = activeData.filter(d => {
    if (!filtroBusqueda) return true;
    const busqueda = filtroBusqueda.toLowerCase();
    
    if (activeTab === 'cambios') {
      const ecoStr = String(d.economico || '').toLowerCase();
      const detallesStr = String(d.detalles || '').toLowerCase();
      const usrStr = String(d.usuario_nombre || '').toLowerCase();
      return ecoStr.includes(busqueda) || detallesStr.includes(busqueda) || usrStr.includes(busqueda);
    } else if (activeTab === 'checklists') {
      const tipoStr = d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()).toLowerCase() : '';
      const ecoStr = String(d.economico || '').toLowerCase();
      const cinchoStr = String(d.numero_cincho || '').toLowerCase();
      return tipoStr.includes(busqueda) || ecoStr.includes(busqueda) || cinchoStr.includes(busqueda);
    } else {
      const tipoStr = d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()).toLowerCase() : '';
      const ecoStr = String(d.economico || '').toLowerCase();
      const motivoStr = String(d.motivo_estatus || '').toLowerCase();
      const fallaStr = String(d.falla || '').toLowerCase();
      return tipoStr.includes(busqueda) || ecoStr.includes(busqueda) || motivoStr.includes(busqueda) || fallaStr.includes(busqueda);
    }
  });

  const exportToExcel = () => {
    if (datosFiltrados.length === 0) return;

    let worksheetData;
    if (activeTab === 'cambios') {
      worksheetData = datosFiltrados.map(d => ({
        'HORA': d.hora ? new Date(d.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
        'ECO': d.economico || '',
        'TIPO DE UNIDAD': d.tipo_unidad ? String(d.tipo_unidad).toUpperCase() : '',
        'MODIFICACIÓN': d.tipo_accion || '',
        'VALOR ANTERIOR': d.estatus_anterior ? String(d.estatus_anterior).toUpperCase() : 'N/A',
        'VALOR NUEVO': d.estatus_nuevo ? String(d.estatus_nuevo).toUpperCase() : 'N/A',
        'DETALLES': d.detalles || '',
        'USUARIO': d.usuario_nombre || 'SISTEMA'
      }));
    } else if (activeTab === 'checklists') {
      worksheetData = datosFiltrados.map(d => ({
        'TIPO': d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '',
        'ECO': d.economico || '',
        'COMBUSTIBLE': d.nivel_combustible || '',
        'ADBLUE': d.nivel_adblue || '',
        'KILOMETRAJE': d.kilometraje || '',
        'CINCHO': d.numero_cincho || '',
        'FECHA ÚLTIMA CARGA': d.fecha_ultima_carga || '',
        'HORA DE GUARDADO': d.hora_guardado ? new Date(d.hora_guardado).toLocaleString('es-MX') : ''
      }));
    } else {
      worksheetData = datosFiltrados.map(d => ({
        'TIPO': d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '',
        'ECO': d.economico || '',
        'ESTATUS': d.estatus || '',
        'MOTIVO DE ESTATUS (BAJA)': d.motivo_estatus || '',
        'FALLA REPORTADA': d.falla || ''
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Mantenimiento_${activeTab.toUpperCase()}`);
    XLSX.writeFile(workbook, `Historial_Mantenimiento_${activeTab.toUpperCase()}_${selectedFecha}.xlsx`);
  };

  const exportRowToExcel = (d) => {
    const worksheetData = [{
      'TIPO': d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '',
      'ECO': d.economico || '',
      'COMBUSTIBLE': d.nivel_combustible || '',
      'ADBLUE': d.nivel_adblue || '',
      'KILOMETRAJE': d.kilometraje || '',
      'CINCHO': d.numero_cincho || '',
      'FECHA ÚLTIMA CARGA': d.fecha_ultima_carga || '',
      'HORA DE GUARDADO': d.hora_guardado ? new Date(d.hora_guardado).toLocaleString('es-MX') : ''
    }];
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0]).map(key => ({
      wch: Math.max(key.length, String(worksheetData[0][key]).length) + 2
    }));
    worksheet['!cols'] = colWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Mantenimiento_${d.economico}`);
    XLSX.writeFile(workbook, `Mantenimiento_ECO_${d.economico}_${selectedFecha}.xlsx`);
  };

  const formatearHora = (fechaStr) => {
    if (!fechaStr) return '';
    try {
      const f = new Date(fechaStr);
      return f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="historial-page">
      <Header title="Historial Mantenimiento" hideBackButton={false} />

      <main className="historial-content">
        <div className="historial-header">
          <h2>Registro Diario de Mantenimiento</h2>
          <div className="historial-filter" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label>Seleccionar Fecha:</label>
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
                      {fechas.length === 0 && (
                        <div className="custom-dropdown-item" style={{ color: '#9ca3af' }}>Sin fechas disponibles</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label>Buscar:</label>
              <input 
                type="text" 
                placeholder="Ej. ECO, tipo o texto..."
                value={filtroBusqueda}
                onChange={e => setFiltroBusqueda(e.target.value)}
                style={{ padding: '0.5rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', outline: 'none', fontSize: '0.9rem', width: '200px' }}
                disabled={cargando}
              />
            </div>
            
            <button 
              className="export-excel-btn" 
              onClick={exportToExcel}
              disabled={cargando || datosFiltrados.length === 0}
              title="Descargar Historial en Excel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Descargar Excel
            </button>
          </div>
        </div>

        {/* Pestañas de Historial */}
        <div className="historial-tabs">
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'inicio' ? 'active' : ''}`}
            onClick={() => setActiveTab('inicio')}
          >
            Estado Inicial (Inicio)
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'cambios' ? 'active' : ''}`}
            onClick={() => setActiveTab('cambios')}
          >
            Cambios en el Transcurso (Mantenimiento)
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'fin' ? 'active' : ''}`}
            onClick={() => setActiveTab('fin')}
          >
            Estado Final (Fin)
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'checklists' ? 'active' : ''}`}
            onClick={() => setActiveTab('checklists')}
          >
            Hojas de Mantenimiento (Chequeos)
          </button>
        </div>

        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ marginBottom: '1.25rem' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Cargando historial...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.85rem' }}>Buscando registros en la base de datos</p>
          </div>
        ) : activeTab === 'cambios' ? (
          <div className="table-responsive">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>HORA</th>
                  <th>ECO</th>
                  <th>TIPO UNIDAD</th>
                  <th>MODIFICACIÓN</th>
                  <th>VALOR ANTERIOR</th>
                  <th>VALOR NUEVO</th>
                  <th>DETALLES DE LA ACCIÓN</th>
                  <th>USUARIO</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((d, i) => (
                  <tr key={d.id || i}>
                    <td style={{ fontWeight: '700', color: '#64748b' }}>{formatearHora(d.hora)}</td>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{d.economico}</td>
                    <td style={{ fontWeight: '600' }}>{d.tipo_unidad ? String(d.tipo_unidad).toUpperCase() : '-'}</td>
                    <td>
                      <span className={`estatus-badge estatus-accion`}>
                        {d.tipo_accion}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: '#dc2626' }}>{d.estatus_anterior || 'N/A'}</td>
                    <td style={{ fontWeight: '700', color: '#16a34a' }}>{d.estatus_nuevo || 'N/A'}</td>
                    <td style={{ maxWidth: '280px', wordBreak: 'break-word' }}>{d.detalles}</td>
                    <td style={{ fontWeight: '600' }}>{d.usuario_nombre || 'SISTEMA'}</td>
                  </tr>
                ))}
                {datosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay modificaciones registradas por Mantenimiento en este día.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'checklists' ? (
          <div className="table-responsive">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>TIPO</th>
                  <th>ECO</th>
                  <th>COMBUSTIBLE</th>
                  <th>ADBLUE</th>
                  <th>KILOMETRAJE</th>
                  <th>CINCHO</th>
                  <th>FECHA CARGA</th>
                  <th>HORA GUARDADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((d, i) => (
                  <tr key={i}>
                    <td>{String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()}</td>
                    <td>{d.economico}</td>
                    <td>{d.nivel_combustible || '-'}</td>
                    <td>{d.nivel_adblue || '-'}</td>
                    <td>{d.kilometraje || '-'}</td>
                    <td>{d.numero_cincho || '-'}</td>
                    <td>{d.fecha_ultima_carga || '-'}</td>
                    <td>{d.hora_guardado ? new Date(d.hora_guardado).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td>
                      <button 
                        onClick={() => exportRowToExcel(d)}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '0.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, margin: '0 auto' }}
                        title="Descargar este registro"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
                {datosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay registros de hojas de mantenimiento que coincidan con la búsqueda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>TIPO</th>
                  <th>ECO</th>
                  <th>ESTATUS</th>
                  <th>MOTIVO DE ESTATUS (BAJA)</th>
                  <th>FALLA REPORTADA</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()}</td>
                    <td style={{ fontWeight: '700' }}>{d.economico}</td>
                    <td>
                      <span className={`estatus-badge estatus-${String(d.estatus || 'operacion').toLowerCase()}`}>
                        {d.estatus}
                      </span>
                    </td>
                    <td>{d.motivo_estatus || '-'}</td>
                    <td>{d.falla || '-'}</td>
                  </tr>
                ))}
                {datosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay registros de unidades en mantenimiento para este estado de la fecha seleccionada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <style>{`
        .historial-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
        }
        .historial-tab-btn {
          padding: 8px 16px;
          border: none;
          background: none;
          font-size: 0.88rem;
          font-weight: 700;
          color: #6b7280;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .historial-tab-btn.active {
          color: #6b1d33;
        }
        .historial-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 0;
          right: 0;
          height: 3px;
          background-color: #6b1d33;
          border-radius: 2px;
        }
        .estatus-badge.estatus-accion {
          background-color: #f3f4f6;
          color: #374151;
        }
      `}</style>
    </div>
  );
}
