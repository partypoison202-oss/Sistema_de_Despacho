import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import { formatAccion, getAccionBadgeStyle, DetalleOperacion, formatDetallesTexto, formatearFechaDiaMesAnio, getValoresTransicion } from '../../utils/historialHelper';
import HistorialSearchBar from './HistorialSearchBar';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import './Historial.css';

export default function HistorialEncierro() {
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'cambios', 'fin', 'encierros'
  const [busqueda, setBusqueda] = useState('');
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

  // Autoseleccionar la fecha más reciente al cargar las fechas (o hoy)
  useEffect(() => {
    if (fechas.length > 0 && !selectedFecha) {
      setSelectedFecha(fechas[0]);
    } else if (!selectedFecha) {
      setSelectedFecha(new Date().toISOString().split('T')[0]);
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

  // 2. Obtener el historial estructurado (inicio, cambios, fin, encierros)
  const { data: datos = { inicio: [], cambios: [], fin: [], encierros: [] }, isLoading: isLoadingDatos } = useQuery({
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

  const getActiveData = () => {
    if (activeTab === 'inicio') return datos.inicio || [];
    if (activeTab === 'cambios') return datos.cambios || [];
    if (activeTab === 'encierros') return datos.encierros || [];
    return datos.fin || [];
  };

  const activeData = getActiveData();

  // Filtrado reactivo según búsqueda y pestaña de encierro
  const filteredData = useMemo(() => {
    if (!busqueda || !busqueda.trim()) return activeData;
    const q = busqueda.toLowerCase().trim();

    if (activeTab === 'cambios') {
      return activeData.filter(d => {
        const eco = String(d.economico || '').toLowerCase();
        const tipo = String(d.tipo_unidad || d.tipo || '').toLowerCase();
        const accion = formatAccion(d.tipo_accion).toLowerCase();
        const ant = String(d.estatus_anterior || '').toLowerCase();
        const nvo = String(d.estatus_nuevo || '').toLowerCase();
        const det = String(d.detalles || '').toLowerCase();
        const usr = String(d.usuario_nombre || '').toLowerCase();
        return eco.includes(q) || tipo.includes(q) || accion.includes(q) || ant.includes(q) || nvo.includes(q) || det.includes(q) || usr.includes(q);
      });
    }

    if (activeTab === 'encierros') {
      return activeData.filter(d => {
        const hora = String(d.hora_encierro || '').toLowerCase();
        const eco = String(d.economico || '').toLowerCase();
        const tipo = String(d.tipo || d.tipo_unidad || '').toLowerCase();
        const est = String(d.estatus || '').toLowerCase();
        const mot = String(d.motivo_estatus || '').toLowerCase();
        const ruta = String(d.ruta || '').toLowerCase();
        const tarj = String(d.tarjeton || '').toLowerCase();
        const cond = String(d.nombre_conductor || '').toLowerCase();
        const relTarj = String(d.relevo_tarjeton || '').toLowerCase();
        const relCond = String(d.relevo_conductor || '').toLowerCase();
        return hora.includes(q) || eco.includes(q) || tipo.includes(q) || est.includes(q) || mot.includes(q) || ruta.includes(q) || tarj.includes(q) || cond.includes(q) || relTarj.includes(q) || relCond.includes(q);
      });
    }

    // inicio o fin
    return activeData.filter(d => {
      const eco = String(d.economico || '').toLowerCase();
      const tipo = String(d.tipo || d.tipo_unidad || '').toLowerCase();
      const est = String(d.estatus || '').toLowerCase();
      const mot = String(d.motivo_estatus || '').toLowerCase();
      const falla = String(d.falla || '').toLowerCase();
      return eco.includes(q) || tipo.includes(q) || est.includes(q) || mot.includes(q) || falla.includes(q);
    });
  }, [activeData, busqueda, activeTab]);

  const exportToExcel = () => {
    const dataToExport = busqueda.trim() ? filteredData : activeData;
    if (!dataToExport || dataToExport.length === 0) return;

    let worksheetData;
    if (activeTab === 'cambios') {
      worksheetData = dataToExport.map(d => {
        const t = d.tipo_unidad || d.tipo;
        return {
          'HORA': d.hora ? new Date(d.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
          'TIPO UNIDAD': t ? (String(t).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(t).toUpperCase()) : '',
          'ECONÓMICO': d.economico ? String(d.economico).padStart(3, '0') : '',
          'MODIFICACIÓN': formatAccion(d.tipo_accion),
          'VALOR ANTERIOR': d.estatus_anterior ? String(d.estatus_anterior).toUpperCase() : 'N/A',
          'VALOR NUEVO': d.estatus_nuevo ? String(d.estatus_nuevo).toUpperCase() : 'N/A',
          'DETALLES': formatDetallesTexto(d.detalles, d.estatus_anterior, d.estatus_nuevo),
          'USUARIO': d.usuario_nombre || 'SISTEMA'
        };
      });
    } else if (activeTab === 'encierros') {
      worksheetData = dataToExport.map(d => {
        const t = d.tipo || d.tipo_unidad;
        return {
          'HORA ENCIERRO': d.hora_encierro || '',
          'TIPO UNIDAD': t ? (String(t).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(t).toUpperCase()) : '',
          'ECONÓMICO': d.economico ? String(d.economico).padStart(3, '0') : '',
          'ESTATUS': d.estatus ? String(d.estatus).toUpperCase() : '',
          'MOTIVO': d.motivo_estatus || '',
          'RUTA': d.ruta || '',
          'TARJETÓN TITULAR': d.tarjeton || '',
          'CONDUCTOR TITULAR': d.nombre_conductor || '',
          'TARJETÓN RELEVO': d.relevo_tarjeton || '',
          'CONDUCTOR RELEVO': d.relevo_conductor || '',
          'HORA RELEVO': d.relevo_hora || ''
        };
      });
    } else {
      worksheetData = dataToExport.map(d => {
        const t = d.tipo || d.tipo_unidad;
        return {
          'TIPO UNIDAD': t ? (String(t).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(t).toUpperCase()) : '',
          'ECONÓMICO': d.economico ? String(d.economico).padStart(3, '0') : '',
          'ESTATUS': d.estatus || '',
          'MOTIVO DE ESTATUS (BAJA)': d.motivo_estatus || '',
          'FALLA REPORTADA': d.falla || ''
        };
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Historial_${activeTab.toUpperCase()}`);
    XLSX.writeFile(workbook, `Historial_Encierro_${activeTab.toUpperCase()}_${selectedFecha}.xlsx`);
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
      <Header title="Historial Encierro" hideBackButton={false} />

      <main className="historial-content">
        <div className="historial-header">
          <h2>Registro de Encierro (Bajas / Reservas / Mantenimiento)</h2>
          <div className="historial-filter" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '700', color: '#334155' }}>Fecha:</label>
              <div style={{ minWidth: '160px' }}>
                <AppleDatePicker
                  value={selectedFecha}
                  onChange={(val) => {
                    if (val) setSelectedFecha(val);
                  }}
                  disableFuture={false}
                />
              </div>
            </div>

            <button
              className="export-excel-btn"
              onClick={exportToExcel}
              disabled={cargando || activeData.length === 0}
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
            Cambios en el Transcurso (Encierro)
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'encierros' ? 'active' : ''}`}
            onClick={() => setActiveTab('encierros')}
          >
            Encierros del Día
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'fin' ? 'active' : ''}`}
            onClick={() => setActiveTab('fin')}
          >
            Estado Final (Fin)
          </button>
        </div>

        {/* Buscador Contextual Unificado */}
        <HistorialSearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder={
            activeTab === 'cambios'
              ? 'Buscar por económico, tipo, modificación, estatus, detalles o usuario...'
              : activeTab === 'encierros'
                ? 'Buscar por hora, económico, tipo, estatus, motivo, ruta o conductor...'
                : 'Buscar por económico, tipo de unidad, estatus, motivo de baja o falla...'
          }
          totalCount={activeData.length}
          filteredCount={filteredData.length}
        />

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
                  <th>TIPO UNIDAD</th>
                  <th>ECONÓMICO</th>
                  <th>MODIFICACIÓN</th>
                  <th>VALOR ANTERIOR</th>
                  <th>VALOR NUEVO</th>
                  <th>DETALLES DE LA ACCIÓN</th>
                  <th>USUARIO</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => (
                  <tr key={d.id || i}>
                    <td style={{ fontWeight: '700', color: '#64748b' }}>{formatearHora(d.hora)}</td>
                    <td style={{ fontWeight: '600' }}>{(d.tipo_unidad || d.tipo) ? (String(d.tipo_unidad || d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo_unidad || d.tipo).toUpperCase()) : '—'}</td>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{d.economico ? String(d.economico).padStart(3, '0') : '—'}</td>
                    <td>
                      <span className="estatus-badge" style={getAccionBadgeStyle(d.tipo_accion)}>
                        {formatAccion(d.tipo_accion)}
                      </span>
                    </td>
                    {(() => {
                      const trans = getValoresTransicion(d);
                      return (
                        <>
                          <td style={{ fontWeight: '700', color: '#dc2626' }}>{trans.anterior}</td>
                          <td style={{ fontWeight: '700', color: '#16a34a' }}>{trans.nuevo}</td>
                        </>
                      );
                    })()}
                    <td style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      <DetalleOperacion
                        detalles={d.detalles}
                        estatusAnterior={d.estatus_anterior}
                        estatusNuevo={d.estatus_nuevo}
                        fallback="Sin detalles adicionales"
                      />
                    </td>
                    <td style={{ fontWeight: '600' }}>{d.usuario_nombre || 'SISTEMA'}</td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '2.5rem', color: '#6b7280' }}>
                      {activeData.length === 0
                        ? 'No hay modificaciones registradas por Encierro en este día.'
                        : `No se encontraron registros que coincidan con "${busqueda}".`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'encierros' ? (
          <div className="table-responsive">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>HORA ENCIERRO</th>
                  <th>TIPO UNIDAD</th>
                  <th>ECONÓMICO</th>
                  <th>ESTATUS</th>
                  <th>MOTIVO</th>
                  <th>RUTA</th>
                  <th>TARJETÓN</th>
                  <th>CONDUCTOR</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '700', color: '#64748b' }}>{d.hora_encierro || '-'}</td>
                    <td style={{ fontWeight: '600' }}>{(d.tipo || d.tipo_unidad) ? (String(d.tipo || d.tipo_unidad).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo || d.tipo_unidad).toUpperCase()) : '—'}</td>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{d.economico ? String(d.economico).padStart(3, '0') : '—'}</td>
                    <td>
                      <span className={`estatus-badge estatus-${String(d.estatus || 'operacion').toLowerCase()}`}>
                        {d.estatus || '-'}
                      </span>
                    </td>
                    <td>{d.motivo_estatus || '-'}</td>
                    <td style={{ fontWeight: '600' }}>{d.ruta || '-'}</td>
                    <td>
                      <div>{d.tarjeton || '-'}</div>
                      {d.relevo_tarjeton && (
                        <div style={{ fontSize: '0.85em', color: '#16a34a', marginTop: '4px', fontWeight: 'bold' }}>
                          R: {d.relevo_tarjeton}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{d.nombre_conductor || '-'}</div>
                      {d.relevo_conductor && (
                        <div style={{ fontSize: '0.85em', color: '#16a34a', marginTop: '4px', fontWeight: 'bold' }}>
                          R: {d.relevo_conductor}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '2.5rem', color: '#6b7280' }}>
                      {activeData.length === 0
                        ? 'No hay encierros registrados en este día.'
                        : `No se encontraron registros que coincidan con "${busqueda}".`}
                    </td>
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
                  <th>TIPO UNIDAD</th>
                  <th>ECONÓMICO</th>
                  <th>ESTATUS</th>
                  <th>MOTIVO DE ESTATUS (BAJA)</th>
                  <th>FALLA REPORTADA</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{(d.tipo || d.tipo_unidad) ? (String(d.tipo || d.tipo_unidad).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo || d.tipo_unidad).toUpperCase()) : '—'}</td>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{d.economico ? String(d.economico).padStart(3, '0') : '—'}</td>
                    <td>
                      <span className={`estatus-badge estatus-${String(d.estatus || 'operacion').toLowerCase()}`}>
                        {d.estatus}
                      </span>
                    </td>
                    <td>{d.motivo_estatus || '-'}</td>
                    <td>{d.falla || '-'}</td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '2.5rem', color: '#6b7280' }}>
                      {activeData.length === 0
                        ? 'No hay registros de encierro para este estado de la fecha seleccionada.'
                        : `No se encontraron registros que coincidan con "${busqueda}".`}
                    </td>
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
