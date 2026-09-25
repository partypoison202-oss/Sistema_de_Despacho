import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import './Historial.css';

export default function HistorialConductores() {
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tipoAccionFiltro, setTipoAccionFiltro] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const dropdownRef = useRef(null);

  // 1. Obtener historial de acciones de conductores
  const { data: serverData = { fechas: [], fecha: '', acciones: [], resumen: {} }, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['historial-conductores', selectedFecha, tipoAccionFiltro],
    queryFn: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedFecha) params.append('fecha', selectedFecha);
      if (tipoAccionFiltro !== 'TODAS') params.append('tipo_accion', tipoAccionFiltro);

      const response = await fetch(`${API_BASE}/api/historial-operativo/conductores?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener el historial de conductores');
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const fechas = serverData.fechas || [];
  const acciones = serverData.acciones || [];
  const resumen = serverData.resumen || {};

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

  const handleFechaChange = (f) => {
    setSelectedFecha(f);
    setIsDropdownOpen(false);
  };

  // Filtrado local por búsqueda
  const accionesFiltradas = acciones.filter(a => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      (a.tarjeton && String(a.tarjeton).toLowerCase().includes(q)) ||
      (a.nombre_conductor && a.nombre_conductor.toLowerCase().includes(q)) ||
      (a.usuario_nombre && a.usuario_nombre.toLowerCase().includes(q)) ||
      (a.detalles && a.detalles.toLowerCase().includes(q)) ||
      (a.tipo_accion && a.tipo_accion.toLowerCase().includes(q))
    );
  });

  const exportToExcel = () => {
    if (!accionesFiltradas || accionesFiltradas.length === 0) return;

    const worksheetData = accionesFiltradas.map(a => ({
      'TARJETÓN': a.tarjeton || 'N/A',
      'OPERADOR': a.nombre_conductor || 'DESCONOCIDO',
      'ACCIÓN': a.tipo_accion || 'S/N',
      'USUARIO': a.usuario_nombre || 'Sistema',
      'DETALLES': a.detalles || '',
      'FECHA Y HORA': a.created_at ? new Date(a.created_at).toLocaleString('es-MX') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial_Conductores');
    XLSX.writeFile(workbook, `Historial_Conductores_${selectedFecha || 'general'}.xlsx`);
  };

  const getBadgeStyle = (tipo) => {
    switch (tipo) {
      case 'CREACION':
        return { bg: '#dcfce7', color: '#15803d', label: 'Creación' };
      case 'EDICION':
        return { bg: '#e0f2fe', color: '#0369a1', label: 'Edición' };
      case 'BAJA':
        return { bg: '#fee2e2', color: '#b91c1c', label: 'Baja' };
      case 'REINGRESO':
        return { bg: '#fef3c7', color: '#b45309', label: 'Reingreso' };
      case 'FALTA_REGISTRADA':
        return { bg: '#ffedd5', color: '#c2410c', label: 'Falta Registrada' };
      case 'FALTA_JUSTIFICADA':
        return { bg: '#d1fae5', color: '#047857', label: 'Falta Justificada' };
      case 'RETARDO':
        return { bg: '#fef9c3', color: '#a16207', label: 'Retardo' };
      case 'SUBIR_FOTO':
      case 'SUBIR_QR':
        return { bg: '#f3e8ff', color: '#6b21a8', label: 'Documento / Foto' };
      default:
        return { bg: '#f1f5f9', color: '#475569', label: tipo || 'Movimiento' };
    }
  };

  return (
    <div className="historial-page">
      <Header title="Histórico de Personas Conductoras" hideBackButton={false} />

      <main className="historial-content">
        {/* Cabecera con Título y Controles */}
        <div className="historial-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Histórico de Personas Conductoras
              </h2>
              <span style={{
                backgroundColor: '#6b1d33',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '800',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em'
              }}>
                CONTROL DE CONDUCTORES
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Registro auditor de altas, bajas, ediciones, faltas, retardos y documentos en el módulo de personas conductoras.
            </p>
          </div>

          <div className="historial-filter" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.85rem',
                fontSize: '0.875rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Refrescar datos en vivo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }}>
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              {isFetching ? 'Actualizando...' : 'Actualizar'}
            </button>

            <label style={{ fontWeight: '700', color: '#334155' }}>Fecha:</label>
            <div className="custom-dropdown-container" ref={dropdownRef}>
              <button
                type="button"
                className={`custom-dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
                onClick={() => !isLoading && setIsDropdownOpen(!isDropdownOpen)}
                disabled={isLoading}
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
              disabled={isLoading || accionesFiltradas.length === 0}
              title="Descargar Historial de Conductores en Excel"
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
        {!isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Acciones Totales</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{resumen.total_acciones || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Movimientos registrados en el día</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>Altas y Modificaciones</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#0284c7' }}>{resumen.modificaciones || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Creación, fotos y edición de perfil</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase' }}>Bajas y Reingresos</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#dc2626' }}>{resumen.bajas_reingresos || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Desactivaciones y reactivaciones</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#c2410c', textTransform: 'uppercase' }}>Faltas y Retardos</span>
              <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#ea580c' }}>{resumen.faltas_retardos || 0}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Inasistencias, retardos y justificantes</p>
            </div>
          </div>
        )}

        {/* Buscador y Filtros */}
        <div className="historial-toolbar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div className="search-box-container" style={{ flex: '1', minWidth: '260px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="historial-search-input"
              placeholder="Buscar por tarjetón, operador, usuario o detalle..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'TODAS', label: 'Todas las acciones' },
              { id: 'CREACION', label: 'Creación' },
              { id: 'EDICION', label: 'Edición' },
              { id: 'BAJA', label: 'Bajas' },
              { id: 'FALTA_REGISTRADA', label: 'Faltas' },
              { id: 'FALTA_JUSTIFICADA', label: 'Justificadas' },
              { id: 'RETARDO', label: 'Retardos' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTipoAccionFiltro(tab.id)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  border: '1px solid',
                  borderColor: tipoAccionFiltro === tab.id ? '#6b1d33' : '#e2e8f0',
                  backgroundColor: tipoAccionFiltro === tab.id ? '#6b1d33' : '#ffffff',
                  color: tipoAccionFiltro === tab.id ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido de la Tabla */}
        {isLoading ? (
          <div className="historial-loading">
            <div className="spinner"></div>
            <p>Cargando historial de personas conductoras...</p>
          </div>
        ) : (
          <div className="historial-table-container">
            <table className="historial-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Tarjetón</th>
                  <th style={{ width: '220px' }}>Operador</th>
                  <th style={{ width: '160px' }}>Acción</th>
                  <th style={{ width: '180px' }}>Usuario</th>
                  <th>Detalles del Registro</th>
                  <th style={{ width: '170px' }}>Fecha y Hora</th>
                </tr>
              </thead>
              <tbody>
                {accionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>No se encontraron registros</p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>No hay acciones registradas en el control de conductores para la fecha seleccionada.</p>
                    </td>
                  </tr>
                ) : (
                  accionesFiltradas.map((a, idx) => {
                    const badge = getBadgeStyle(a.tipo_accion);
                    const horaFormatted = a.created_at 
                      ? new Date(a.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : '—';

                    return (
                      <tr key={a.id || idx}>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            backgroundColor: '#f1f5f9',
                            color: '#0f172a',
                            fontWeight: '800',
                            borderRadius: '0.375rem',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace'
                          }}>
                            {a.tarjeton || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>
                            {a.nombre_conductor || 'Desconocido'}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            fontWeight: '700',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            letterSpacing: '0.02em'
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.85rem' }}>
                            {a.usuario_nombre || 'Sistema'}
                          </span>
                        </td>
                        <td style={{ color: '#334155', fontSize: '0.875rem', lineHeight: '1.4' }}>
                          {a.detalles || 'Sin detalles'}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.825rem', fontWeight: '600' }}>
                          {horaFormatted}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
