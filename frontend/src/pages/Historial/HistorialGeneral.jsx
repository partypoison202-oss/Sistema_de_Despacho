import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import API_BASE from '../../config/api';
import { formatAccion, getAccionBadgeStyle, DetalleOperacion, formatDetallesTexto } from '../../utils/historialHelper';
import HistorialSearchBar from './HistorialSearchBar';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import './Historial.css';

const processResumenData = (inicio, cambios, fin) => {
  const resumenMap = {};
  const nameToTarjeton = {};

  (inicio || []).forEach(row => {
    if (row.nombre_conductor && row.numero_tarjeton) {
      nameToTarjeton[row.nombre_conductor.toUpperCase().trim()] = row.numero_tarjeton.trim();
    }
  });
  (fin || []).forEach(row => {
    if (row.nombre_conductor && row.numero_tarjeton) {
      nameToTarjeton[row.nombre_conductor.toUpperCase().trim()] = row.numero_tarjeton.trim();
    }
  });

  const getTarjeton = (name) => {
    if (!name) return '';
    const cleanName = name.toUpperCase().trim();
    return nameToTarjeton[cleanName] || name;
  };

  (inicio || []).forEach(row => {
    const eco = row.economico;
    if (!eco) return;
    
    const initialTarjeton = row.numero_tarjeton || getTarjeton(row.nombre_conductor);

    resumenMap[eco] = {
      economico: eco,
      tipo: row.tipo || '',
      rutas: new Set(row.ruta ? [row.ruta] : []),
      conductores: new Set(initialTarjeton ? [initialTarjeton] : []),
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
      const condMatch = change.detalles.match(/CONDUCTOR:\s*([^,\-\n()]+)/i);
      if (condMatch && condMatch[1]) {
        const condName = condMatch[1].trim();
        if (condName && condName !== 'SIN ASIGNAR') {
          const tarj = getTarjeton(condName);
          if (tarj) item.conductores.add(tarj);
        }
      }

      const rutaMatch = change.detalles.match(/(?:RUTA|NUEVA):\s*([^,\-\n()]+)/i);
      if (rutaMatch && rutaMatch[1]) {
        const rName = rutaMatch[1].trim();
        if (rName && rName !== 'SIN RUTA' && !rName.includes('HORA') && !rName.includes('ESTATUS')) {
          item.rutas.add(rName);
        }
      }

      const motivoMatch = change.detalles.match(/(?:MOTIVO|FALLA):\s*([^,\-\n()]+)/i);
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

    const finalTarjeton = row.numero_tarjeton || getTarjeton(row.nombre_conductor);
    if (finalTarjeton) item.conductores.add(finalTarjeton);

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

  // Autoseleccionar la fecha más reciente al cargar las fechas
  useEffect(() => {
    if (fechas.length > 0 && !selectedFecha) {
      setSelectedFecha(fechas[0]);
    } else if (!selectedFecha && !isLoadingFechas) {
      const d = new Date();
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      setSelectedFecha(`${yr}-${mo}-${da}`);
    }
  }, [fechas, selectedFecha, isLoadingFechas]);

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

  const activeData = getActiveData();

  // Filtrado reactivo según el término de búsqueda y la pestaña activa
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

    if (activeTab === 'resumen') {
      return activeData.filter(d => {
        const eco = String(d.economico || '').toLowerCase();
        const tipo = String(d.tipo || d.tipo_unidad || '').toLowerCase();
        const rutas = String(d.rutas || '').toLowerCase();
        const cond = String(d.conductores || '').toLowerCase();
        const est = String(d.estatuses || '').toLowerCase();
        const aco = String(d.acoples || '').toLowerCase();
        const cor = String(d.corridas || '').toLowerCase();
        const mot = String(d.motivos || '').toLowerCase();
        return eco.includes(q) || tipo.includes(q) || rutas.includes(q) || cond.includes(q) || est.includes(q) || aco.includes(q) || cor.includes(q) || mot.includes(q);
      });
    }

    // inicio o fin
    return activeData.filter(d => {
      const eco = String(d.economico || '').toLowerCase();
      const tipo = String(d.tipo || d.tipo_unidad || '').toLowerCase();
      const ruta = String(d.ruta || '').toLowerCase();
      const tarj = String(d.numero_tarjeton || '').toLowerCase();
      const cond = String(d.nombre_conductor || '').toLowerCase();
      const relTarj = String(d.relevo_tarjeton || '').toLowerCase();
      const relCond = String(d.relevo_conductor || '').toLowerCase();
      const est = String(d.estatus || '').toLowerCase();
      const aco = String(d.hora_acople || '').toLowerCase();
      const cor = String(d.corridas || '').toLowerCase();
      const mot = String(d.motivo || d.motivo_estatus || d.falla || '').toLowerCase();
      return eco.includes(q) || tipo.includes(q) || ruta.includes(q) || tarj.includes(q) || cond.includes(q) || relTarj.includes(q) || relCond.includes(q) || est.includes(q) || aco.includes(q) || cor.includes(q) || mot.includes(q);
    });
  }, [activeData, busqueda, activeTab]);

  const getTipoDisplay = (d) => {
    const t = d.tipo || d.tipo_unidad;
    if (!t) return '';
    return String(t).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(t).toUpperCase();
  };

  const exportToExcel = () => {
    const dataToExport = busqueda.trim() ? filteredData : activeData;
    if (!dataToExport || dataToExport.length === 0) return;

    let worksheetData;
    if (activeTab === 'cambios') {
      worksheetData = dataToExport.map(d => ({
        'HORA': d.hora ? new Date(d.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
        'TIPO UNIDAD': getTipoDisplay(d),
        'ECONÓMICO': d.economico ? String(d.economico).padStart(3, '0') : '',
        'MODIFICACIÓN': formatAccion(d.tipo_accion),
        'VALOR ANTERIOR': d.estatus_anterior ? String(d.estatus_anterior).toUpperCase() : 'N/A',
        'VALOR NUEVO': d.estatus_nuevo ? String(d.estatus_nuevo).toUpperCase() : 'N/A',
        'DETALLES': formatDetallesTexto(d.detalles, d.estatus_anterior, d.estatus_nuevo),
        'USUARIO': d.usuario_nombre || 'SISTEMA'
      }));
    } else if (activeTab === 'resumen') {
      worksheetData = dataToExport.map(d => ({
        'TIPO UNIDAD': getTipoDisplay(d),
        'ECONÓMICO': d.economico ? String(d.economico).padStart(3, '0') : '',
        'RUTAS': d.rutas || '',
        'TARJETONES': d.conductores || '',
        'ESTATUS': d.estatuses || '',
        'HORAS ACOPLE': d.acoples || '',
        'CORRIDAS': d.corridas || '',
        'OBSERVACIONES / MOTIVOS': d.motivos || ''
      }));
    } else {
      worksheetData = dataToExport.map(d => ({
        'TIPO UNIDAD': getTipoDisplay(d),
        'ECONÓMICO': d.economico ? String(d.economico).padStart(3, '0') : '',
        'RUTA': d.ruta || '',
        'TARJETÓN TITULAR': d.numero_tarjeton || '',
        'CONDUCTOR TITULAR': d.nombre_conductor || 'SIN ASIGNAR',
        'TARJETÓN RELEVO': d.relevo_tarjeton || '',
        'CONDUCTOR RELEVO': d.relevo_conductor || '',
        'HORA RELEVO': d.relevo_hora || '',
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

  return (
    <div className="historial-page">
      <Header title="Historial General (Capturista)" hideBackButton={false} />

      <main className="historial-content">
        <div className="historial-header">
          <h2>Registro General del Sistema</h2>
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

        {/* Buscador Contextual Unificado */}
        <HistorialSearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder={
            activeTab === 'cambios'
              ? 'Buscar por económico, tipo, modificación, estatus, detalles o usuario...'
              : activeTab === 'resumen'
              ? 'Buscar por económico, tipo, rutas, conductores, estatus u observaciones...'
              : 'Buscar por económico, tipo, ruta, conductor titular/relevo, tarjetón o estatus...'
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
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="historial-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '100px' }}>HORA</th>
                  <th style={{ minWidth: '130px' }}>TIPO UNIDAD</th>
                  <th style={{ minWidth: '90px' }}>ECONÓMICO</th>
                  <th style={{ minWidth: '180px' }}>MODIFICACIÓN</th>
                  <th style={{ minWidth: '140px' }}>VALOR ANTERIOR</th>
                  <th style={{ minWidth: '140px' }}>VALOR NUEVO</th>
                  <th style={{ minWidth: '350px' }}>DETALLES DE LA ACCIÓN</th>
                  <th style={{ minWidth: '150px' }}>USUARIO</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => (
                  <tr key={d.id || i}>
                    <td style={{ fontWeight: '700', color: '#64748b' }}>{formatearHora(d.hora)}</td>
                    <td style={{ fontWeight: '600' }}>{getTipoDisplay(d) || '-'}</td>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{d.economico ? String(d.economico).padStart(3, '0') : '-'}</td>
                    <td>
                      <span className="estatus-badge" style={getAccionBadgeStyle(d.tipo_accion)}>
                        {formatAccion(d.tipo_accion)}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: '#dc2626' }}>{d.estatus_anterior ? String(d.estatus_anterior).toUpperCase() : '-'}</td>
                    <td style={{ fontWeight: '700', color: '#16a34a' }}>{d.estatus_nuevo ? String(d.estatus_nuevo).toUpperCase() : '-'}</td>
                    <td style={{ wordBreak: 'break-word', whiteSpace: 'normal', paddingRight: '1rem' }}>
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
                        ? 'No hay modificaciones registradas en el transcurso de este día.' 
                        : `No se encontraron registros que coincidan con "${busqueda}".`}
                    </td>
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
                  <th style={{ minWidth: '90px' }}>ECONÓMICO</th>
                  <th style={{ minWidth: '180px' }}>RUTAS</th>
                  <th style={{ minWidth: '150px' }}>TARJETONES</th>
                  <th style={{ minWidth: '160px' }}>ESTATUS</th>
                  <th style={{ minWidth: '130px' }}>HORAS ACOPLE</th>
                  <th style={{ minWidth: '110px' }}>CORRIDAS</th>
                  <th style={{ minWidth: '250px' }}>OBSERVACIONES / MOTIVOS</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{getTipoDisplay(d) || '-'}</td>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{d.economico ? String(d.economico).padStart(3, '0') : '-'}</td>
                    <td>{d.rutas}</td>
                    <td>{d.conductores}</td>
                    <td>{d.estatuses}</td>
                    <td className="text-center">{d.acoples}</td>
                    <td className="text-center">{d.corridas}</td>
                    <td>{d.motivos}</td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '2.5rem', color: '#6b7280' }}>
                      {activeData.length === 0
                        ? 'No hay datos suficientes para generar el resumen de hoy.'
                        : `No se encontraron registros que coincidan con "${busqueda}".`}
                    </td>
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
                  <th style={{ minWidth: '90px' }}>ECONÓMICO</th>
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
                {filteredData.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{getTipoDisplay(d) || '-'}</td>
                    <td style={{ fontWeight: '800', color: '#0f172a' }}>{d.economico ? String(d.economico).padStart(3, '0') : '-'}</td>
                    <td>{d.ruta || '-'}</td>
                    <td>
                      <div>{d.numero_tarjeton || '-'}</div>
                      {d.relevo_tarjeton && (
                        <div style={{ fontSize: '0.85em', color: '#16a34a', marginTop: '4px', fontWeight: 'bold' }}>
                          R: {d.relevo_tarjeton}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{d.nombre_conductor || 'SIN ASIGNAR'}</div>
                      {d.relevo_conductor && (
                        <div style={{ fontSize: '0.85em', color: '#16a34a', marginTop: '4px', fontWeight: 'bold' }}>
                          R: {d.relevo_conductor}
                        </div>
                      )}
                    </td>
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
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center" style={{ padding: '2.5rem', color: '#6b7280' }}>
                      {activeData.length === 0
                        ? 'No hay registros de unidades para este estado de la fecha seleccionada.'
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
