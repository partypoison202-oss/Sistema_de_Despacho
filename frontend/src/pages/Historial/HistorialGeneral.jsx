import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import './Historial.css';

const processResumenData = (inicio, cambios, fin) => {
  const resumenMap = {};

  (inicio || []).forEach(row => {
    const eco = row.economico;
    if (!eco) return;
    resumenMap[eco] = {
      economico: eco,
      tipo: row.tipo || '',
      rutas: new Set(row.ruta ? [row.ruta] : []),
      conductores: new Set(row.nombre_conductor ? [row.nombre_conductor] : []),
      estatuses: new Set(row.estatus ? [row.estatus] : []),
      corridas: new Set(row.corridas !== null && row.corridas !== undefined ? [row.corridas] : []),
      acoples: new Set(row.hora_acople ? [row.hora_acople] : []),
      motivos: new Set(row.motivo || row.motivo_estatus || row.falla ? [row.motivo || row.motivo_estatus || row.falla] : [])
    };
  });

  (cambios || []).forEach(change => {
    const eco = change.economico;
    if (!eco) return;

    if (!resumenMap[eco]) {
      resumenMap[eco] = {
        economico: eco,
        tipo: change.tipo_unidad || '',
        rutas: new Set(),
        conductores: new Set(),
        estatuses: new Set(),
        corridas: new Set(),
        acoples: new Set(),
        motivos: new Set()
      };
    }

    const item = resumenMap[eco];
    if (change.estatus_anterior) item.estatuses.add(change.estatus_anterior);
    if (change.estatus_nuevo) item.estatuses.add(change.estatus_nuevo);

    if (change.detalles) {
      const condMatch = change.detalles.match(/CONDUCTOR:\s*([^,\-\n\(\)]+)/i);
      if (condMatch && condMatch[1]) {
        const condName = condMatch[1].trim();
        if (condName && condName !== 'SIN ASIGNAR') {
          item.conductores.add(condName);
        }
      }

      const rutaMatch = change.detalles.match(/(?:RUTA|NUEVA):\s*([^,\-\n\(\)]+)/i);
      if (rutaMatch && rutaMatch[1]) {
        const rName = rutaMatch[1].trim();
        if (rName && rName !== 'SIN RUTA' && !rName.includes('HORA') && !rName.includes('ESTATUS')) {
          item.rutas.add(rName);
        }
      }

      const motivoMatch = change.detalles.match(/(?:MOTIVO|FALLA):\s*([^,\-\n\(\)]+)/i);
      if (motivoMatch && motivoMatch[1]) {
        const motVal = motivoMatch[1].trim();
        if (motVal) item.motivos.add(motVal);
      }
    }
  });

  (fin || []).forEach(row => {
    const eco = row.economico;
    if (!eco) return;

    if (!resumenMap[eco]) {
      resumenMap[eco] = {
        economico: eco,
        tipo: row.tipo || '',
        rutas: new Set(),
        conductores: new Set(),
        estatuses: new Set(),
        corridas: new Set(),
        acoples: new Set(),
        motivos: new Set()
      };
    }

    const item = resumenMap[eco];
    if (row.ruta) item.rutas.add(row.ruta);
    if (row.nombre_conductor) item.conductores.add(row.nombre_conductor);
    if (row.estatus) item.estatuses.add(row.estatus);
    if (row.corridas !== null && row.corridas !== undefined) item.corridas.add(row.corridas);
    if (row.hora_acople) item.acoples.add(row.hora_acople);
    
    const mot = row.motivo || row.motivo_estatus || row.falla;
    if (mot) item.motivos.add(mot);
  });

  return Object.values(resumenMap).map(item => {
    return {
      economico: item.economico,
      tipo: item.tipo,
      rutas: Array.from(item.rutas).join(', ') || '-',
      conductores: Array.from(item.conductores).join(', ') || 'SIN ASIGNAR',
      estatuses: Array.from(item.estatuses).map(e => {
        const lower = String(e).toLowerCase();
        if (lower === 'operacion' || lower === 'operación') return 'Operación';
        if (lower === 'mantenimiento') return 'Mantenimiento';
        if (lower === 'reserva') return 'Reserva';
        return e;
      }).join(', ') || '-',
      corridas: Array.from(item.corridas).join(', ') || '-',
      acoples: Array.from(item.acoples).join(', ') || '-',
      motivos: Array.from(item.motivos).join(', ') || '-'
    };
  }).sort((a, b) => {
    const customSortOrder = ['URBANUS', 'URBANUSS', 'ZAFIRO', 'VAGONETA', 'ORION'];
    const typeA = String(a.tipo || '').toUpperCase();
    const typeB = String(b.tipo || '').toUpperCase();
    let idxA = customSortOrder.indexOf(typeA);
    if (idxA === -1) idxA = 999;
    let idxB = customSortOrder.indexOf(typeB);
    if (idxB === -1) idxB = 999;

    if (idxA !== idxB) return idxA - idxB;

    const ecoA = parseInt(a.economico || '0', 10);
    const ecoB = parseInt(b.economico || '0', 10);
    return ecoA - ecoB;
  });
};

export default function HistorialGeneral() {
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'cambios', 'fin'
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

  // 2. Obtener el historial estructurado (inicio, cambios, fin)
  const { data: datos = { inicio: [], cambios: [], fin: [] }, isLoading: isLoadingDatos } = useQuery({
    queryKey: ['historial-general', selectedFecha],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-operativo/general/${selectedFecha}`, {
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
    if (activeTab === 'resumen') return processResumenData(datos.inicio, datos.cambios, datos.fin);
    return datos.fin || [];
  };

  const exportToExcel = () => {
    const activeData = getActiveData();
    if (!activeData || activeData.length === 0) return;

    let worksheetData;
    if (activeTab === 'cambios') {
      worksheetData = activeData.map(d => ({
        'HORA': d.hora ? new Date(d.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
        'ECO': d.economico || '',
        'TIPO DE UNIDAD': d.tipo_unidad ? String(d.tipo_unidad).toUpperCase() : '',
        'MODIFICACIÓN': d.tipo_accion || '',
        'VALOR ANTERIOR': d.estatus_anterior ? String(d.estatus_anterior).toUpperCase() : 'N/A',
        'VALOR NUEVO': d.estatus_nuevo ? String(d.estatus_nuevo).toUpperCase() : 'N/A',
        'DETALLES': d.detalles || '',
        'USUARIO': d.usuario_nombre || 'SISTEMA'
      }));
    } else if (activeTab === 'resumen') {
      worksheetData = activeData.map(d => ({
        'TIPO DE UNIDAD': d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '',
        'ECO': d.economico || '',
        'RUTAS': d.rutas || '',
        'OPERADORES': d.conductores || '',
        'ESTATUS': d.estatuses || '',
        'HORAS ACOPLE': d.acoples || '',
        'CORRIDAS': d.corridas || '',
        'OBSERVACIONES / MOTIVOS': d.motivos || ''
      }));
    } else {
      worksheetData = activeData.map(d => ({
        'TIPO DE UNIDAD': d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '',
        'ECO': d.economico || '',
        'RUTA': d.ruta || '',
        'TARJETÓN': d.numero_tarjeton || '',
        'CONDUCTOR': d.nombre_conductor || 'SIN ASIGNAR',
        'ESTATUS': d.estatus || '',
        'HORA DE ACOPLE': d.hora_acople || '00:00',
        'CORRIDAS': d.corridas || '',
        'OBSERVACIONES / MOTIVO': d.motivo || d.motivo_estatus || d.falla || ''
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Historial_${activeTab.toUpperCase()}`);
    XLSX.writeFile(workbook, `Historial_General_${activeTab.toUpperCase()}_${selectedFecha}.xlsx`);
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

  const activeData = getActiveData();

  return (
    <div className="historial-page">
      <Header title="Historial General (Capturista)" hideBackButton={false} />

      <main className="historial-content">
        <div className="historial-header">
          <h2>Registro General del Sistema</h2>
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
              disabled={cargando || activeData.length === 0}
              title="Descargar Historial en Excel"
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
            Cambios en el Transcurso
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'resumen' ? 'active' : ''}`}
            onClick={() => setActiveTab('resumen')}
          >
            Resumen de Cambios Diarios
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'fin' ? 'active' : ''}`}
            onClick={() => setActiveTab('fin')}
          >
            Estado Final (Fin)
          </button>
        </div>

        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ marginBottom: '1.25rem' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Cargando historial...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.85rem' }}>Buscando registros en la base de datos</p>
          </div>
        ) : activeTab === 'cambios' ? (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="historial-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '100px' }}>HORA</th>
                  <th style={{ minWidth: '80px' }}>ECO</th>
                  <th style={{ minWidth: '130px' }}>TIPO UNIDAD</th>
                  <th style={{ minWidth: '180px' }}>MODIFICACIÓN</th>
                  <th style={{ minWidth: '140px' }}>VALOR ANTERIOR</th>
                  <th style={{ minWidth: '140px' }}>VALOR NUEVO</th>
                  <th style={{ minWidth: '350px' }}>DETALLES DE LA ACCIÓN</th>
                  <th style={{ minWidth: '150px' }}>USUARIO</th>
                </tr>
              </thead>
              <tbody>
                {activeData.map((d, i) => (
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
                    <td style={{ wordBreak: 'break-word', whiteSpace: 'normal', paddingRight: '1rem' }}>{d.detalles}</td>
                    <td style={{ fontWeight: '600' }}>{d.usuario_nombre || 'SISTEMA'}</td>
                  </tr>
                ))}
                {activeData.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay modificaciones registradas en el transcurso de este día.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'resumen' ? (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="historial-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '130px' }}>TIPO UNIDAD</th>
                  <th style={{ minWidth: '80px' }}>ECO</th>
                  <th style={{ minWidth: '180px' }}>RUTAS</th>
                  <th style={{ minWidth: '220px' }}>OPERADORES</th>
                  <th style={{ minWidth: '160px' }}>ESTATUS</th>
                  <th style={{ minWidth: '130px' }}>HORAS ACOPLE</th>
                  <th style={{ minWidth: '110px' }}>CORRIDAS</th>
                  <th style={{ minWidth: '250px' }}>OBSERVACIONES / MOTIVOS</th>
                </tr>
              </thead>
              <tbody>
                {activeData.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()}</td>
                    <td style={{ fontWeight: '700' }}>{d.economico}</td>
                    <td>{d.rutas}</td>
                    <td style={{ fontWeight: '600', color: '#1e3a8a' }}>{d.conductores}</td>
                    <td>{d.estatuses}</td>
                    <td className="text-center">{d.acoples}</td>
                    <td className="text-center">{d.corridas}</td>
                    <td>{d.motivos}</td>
                  </tr>
                ))}
                {activeData.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay datos suficientes para generar el resumen de hoy.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="historial-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '130px' }}>TIPO UNIDAD</th>
                  <th style={{ minWidth: '80px' }}>ECO</th>
                  <th style={{ minWidth: '130px' }}>RUTA</th>
                  <th style={{ minWidth: '110px' }}>TARJETÓN</th>
                  <th style={{ minWidth: '200px' }}>CONDUCTOR</th>
                  <th style={{ minWidth: '140px' }}>ESTATUS</th>
                  <th style={{ minWidth: '130px' }}>HORA ACOPLE</th>
                  <th style={{ minWidth: '110px' }}>CORRIDAS</th>
                  <th style={{ minWidth: '220px' }}>OBSERVACIONES / MOTIVO</th>
                </tr>
              </thead>
              <tbody>
                {activeData.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()}</td>
                    <td style={{ fontWeight: '700' }}>{d.economico}</td>
                    <td>{d.ruta || '-'}</td>
                    <td>{d.numero_tarjeton || '-'}</td>
                    <td>{d.nombre_conductor || 'SIN ASIGNAR'}</td>
                    <td>
                      <span className={`estatus-badge estatus-${String(d.estatus || 'operacion').toLowerCase()}`}>
                        {d.estatus}
                      </span>
                    </td>
                    <td className="text-center">{d.hora_acople || '00:00'}</td>
                    <td className="text-center">{d.corridas || '-'}</td>
                    <td>{d.motivo || d.motivo_estatus || d.falla || '-'}</td>
                  </tr>
                ))}
                {activeData.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay registros de unidades para este estado de la fecha seleccionada.</td>
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
