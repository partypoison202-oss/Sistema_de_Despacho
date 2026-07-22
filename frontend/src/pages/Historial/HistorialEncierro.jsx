import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import './Historial.css';

export default function HistorialEncierro() {
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Obtener listado de fechas únicas registradas en el historial (Cacheado por 5 minutos)
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

  // 2. Obtener el historial para la fecha seleccionada (Cacheado por 5 minutos)
  const { data: datos = [], isLoading: isLoadingDatos } = useQuery({
    queryKey: ['historial-encierro', selectedFecha],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-operativo/encierro/${selectedFecha}`, {
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
      'TIPO': d.tipo || '',
      'ECO': d.economico || '',
      'ESTATUS': d.estatus || '',
      'MOTIVO DE ESTATUS (BAJA)': d.motivo_estatus || '',
      'FALLA REPORTADA': d.falla || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Auto-ajustar ancho de columnas
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial_Encierro");
    XLSX.writeFile(workbook, `Historial_Encierro_${selectedFecha}.xlsx`);
  };

  return (
    <div className="historial-page">
      <Header title="Historial Encierro" hideBackButton={false} />

      <main className="historial-content">
        <div className="historial-header">
          <h2>Unidades Fuera de Servicio (Mantenimiento/Reserva)</h2>
          <div className="historial-filter">
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
            
            <button 
              className="export-excel-btn" 
              onClick={exportToExcel}
              disabled={cargando || datos.length === 0}
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
                  <th>ESTATUS</th>
                  <th>MOTIVO DE ESTATUS (BAJA)</th>
                  <th>FALLA REPORTADA</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((d, i) => (
                  <tr key={i}>
                    <td>{d.tipo}</td>
                    <td>{d.economico}</td>
                    <td>
                      <span className={`estatus-badge estatus-${String(d.estatus || 'operacion').toLowerCase()}`}>
                        {d.estatus}
                      </span>
                    </td>
                    <td>{d.motivo_estatus || '-'}</td>
                    <td>{d.falla || '-'}</td>
                  </tr>
                ))}
                {datos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay unidades en mantenimiento/reserva para esta fecha.</td>
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
