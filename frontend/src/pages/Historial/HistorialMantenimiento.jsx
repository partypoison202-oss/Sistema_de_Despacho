import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import './Historial.css';

export default function HistorialMantenimiento() {
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const dropdownRef = useRef(null);

  const { data: fechas = [], isLoading: isLoadingFechas } = useQuery({
    queryKey: ['historial-mantenimiento-fechas'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-mantenimiento/fechas`, {
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

  const { data: datos = [], isLoading: isLoadingDatos } = useQuery({
    queryKey: ['historial-mantenimiento', selectedFecha],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-mantenimiento/${selectedFecha}`, {
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

  const exportToExcel = () => {
    if (!datos || datos.length === 0) return;
    
    const worksheetData = datos.map(d => ({
      'TIPO': d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '',
      'ECO': d.economico || '',
      'COMBUSTIBLE': d.nivel_combustible || '',
      'ADBLUE': d.nivel_adblue || '',
      'KILOMETRAJE': d.kilometraje || '',
      'CINCHO': d.numero_cincho || '',
      'FECHA ÚLTIMA CARGA': d.fecha_ultima_carga || '',
      'HORA DE GUARDADO': d.hora_guardado ? new Date(d.hora_guardado).toLocaleString('es-MX') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial_Mantenimiento");
    XLSX.writeFile(workbook, `Historial_Mantenimiento_${selectedFecha}.xlsx`);
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

  const datosFiltrados = datos.filter(d => {
    if (!filtroBusqueda) return true;
    const busqueda = filtroBusqueda.toLowerCase();
    const tipoStr = d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()).toLowerCase() : '';
    const ecoStr = String(d.economico || '').toLowerCase();
    return tipoStr.includes(busqueda) || ecoStr.includes(busqueda);
  });

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
                placeholder="Ej. URBANUSS o ECO"
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
              title="Descargar Historial Completo en Excel"
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

        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ marginBottom: '1.25rem' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Cargando datos del historial...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.85rem' }}>Buscando registros en base de datos</p>
          </div>
        ) : (
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
                    <td colSpan="9" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay registros que coincidan con tu búsqueda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
