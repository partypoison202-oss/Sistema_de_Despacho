import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import './Historial.css';

export default function HistorialAcciones() {
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // 1. Obtener listado de fechas únicas registradas (Cacheado por 5 minutos)
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

  // 2. Obtener el historial de acciones para la fecha seleccionada
  const { data: datos = [], isLoading: isLoadingDatos } = useQuery({
    queryKey: ['historial-acciones', selectedFecha],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-operativo/acciones/${selectedFecha}`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener el historial de acciones');
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

  // Filtrado local
  const registrosFiltrados = datos.filter(d => {
    const term = searchTerm.toLowerCase();
    return (
      (d.economico && String(d.economico).toLowerCase().includes(term)) ||
      (d.tipo_unidad && String(d.tipo_unidad).toLowerCase().includes(term)) ||
      (d.tipo_accion && String(d.tipo_accion).toLowerCase().includes(term)) ||
      (d.usuario_nombre && String(d.usuario_nombre).toLowerCase().includes(term)) ||
      (d.detalles && String(d.detalles).toLowerCase().includes(term))
    );
  });

  const exportToExcel = () => {
    if (!datos || datos.length === 0) return;

    const worksheetData = datos.map(d => ({
      'HORA': d.hora ? new Date(d.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
      'ECO': d.economico || '',
      'TIPO DE UNIDAD': d.tipo_unidad ? String(d.tipo_unidad).toUpperCase() : '',
      'ACCIÓN / MOVIMIENTO': d.tipo_accion || '',
      'ESTATUS ANTERIOR': d.estatus_anterior ? String(d.estatus_anterior).toUpperCase() : 'N/A',
      'ESTATUS NUEVO': d.estatus_nuevo ? String(d.estatus_nuevo).toUpperCase() : 'N/A',
      'DETALLES': d.detalles || '',
      'USUARIO': d.usuario_nombre || 'SISTEMA'
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Auto-ajustar ancho de columnas
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial_Acciones");
    XLSX.writeFile(workbook, `Historial_Acciones_${selectedFecha}.xlsx`);
  };

  const formatearHora = (fechaStr) => {
    if (!fechaStr) return '';
    try {
      const fechaObj = new Date(fechaStr);
      return fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getAccionBadgeClass = (tipo) => {
    switch (tipo) {
      case 'INCORPORACION':
        return 'badge-incorporacion';
      case 'DESINCORPORACION':
        return 'badge-desincorporacion';
      case 'CAMBIO_ESTATUS':
        return 'badge-cambio-estatus';
      default:
        return 'badge-default';
    }
  };

  return (
    <div className="dashboard-container">
      <Header />

      <main className="dashboard-main" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div className="historial-header-nav">
          <h2 className="dashboard-heading">
            Historial de <span className="text-highlight">Acciones y Cambios</span>
          </h2>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Buscador local */}
            <input
              type="text"
              placeholder="Buscar por unidad, usuario, detalles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0 1rem',
                height: '42px',
                borderRadius: '8px',
                border: '1.5px solid #e5e7eb',
                fontSize: '0.88rem',
                fontWeight: 600,
                outline: 'none',
                width: '260px'
              }}
            />

            {/* Selector de Fecha */}
            <div className="dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                className="dropdown-trigger"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={isLoadingFechas}
              >
                <span>{selectedFecha || 'Seleccionar Fecha'}</span>
                <svg className={`arrow-icon ${isDropdownOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, width: '200px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                  <div className="dropdown-menu__scroll" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {fechas.length > 0 ? (
                      fechas.map(f => (
                        <button
                          key={f}
                          className={`dropdown-item ${selectedFecha === f ? 'active' : ''}`}
                          onClick={() => handleFechaChange(f)}
                          style={{ width: '100%', padding: '10px 15px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.88rem' }}
                        >
                          {f}
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '10px 15px', color: '#9ca3af', fontSize: '0.88rem' }}>Sin fechas</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botón de Excel */}
            <button
              className="export-btn"
              onClick={exportToExcel}
              disabled={datos.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 1.2rem',
                height: '42px',
                borderRadius: '8px',
                border: 'none',
                background: '#10b981',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                opacity: datos.length === 0 ? 0.6 : 1
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Cargando registros...</p>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="no-data-box">
            <p>No se encontraron acciones o movimientos registrados para esta fecha.</p>
          </div>
        ) : (
          <div className="historial-table-wrapper" style={{ overflowX: 'auto', marginTop: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
            <table className="historial-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>HORA</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>ECO</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>TIPO</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>ACCIÓN / MOVIMIENTO</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>ANTERIOR</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>NUEVO</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>DETALLES DE LA ACCIÓN</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>USUARIO</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', hover: { background: '#f8fafc' } }} className="historial-row">
                    <td style={{ padding: '14px 16px', fontSize: '0.88rem', fontWeight: 700, color: '#64748b' }}>
                      {formatearHora(item.hora)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      {item.economico}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                      {item.tipo_unidad ? String(item.tipo_unidad).toUpperCase() : ''}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge-accion ${getAccionBadgeClass(item.tipo_accion)}`} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.3px', display: 'inline-block' }}>
                        {item.tipo_accion}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>
                      {item.estatus_anterior ? String(item.estatus_anterior).toUpperCase() : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>
                      {item.estatus_nuevo ? String(item.estatus_nuevo).toUpperCase() : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', maxWidth: '300px', wordBreak: 'break-word' }}>
                      {item.detalles}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                      {item.usuario_nombre || 'SISTEMA'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Estilos locales para las etiquetas/badges de acciones */}
      <style>{`
        .badge-accion {
          text-transform: uppercase;
        }
        .badge-incorporacion {
          background-color: #d1fae5;
          color: #065f46;
        }
        .badge-desincorporacion {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .badge-cambio-estatus {
          background-color: #e0f2fe;
          color: #075985;
        }
        .badge-default {
          background-color: #f3f4f6;
          color: #374151;
        }
        .historial-row:hover {
          background-color: #f8fafc;
        }
      `}</style>
    </div>
  );
}
