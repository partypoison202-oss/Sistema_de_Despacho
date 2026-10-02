import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import { formatAccion, getAccionBadgeStyle } from '../../utils/historialHelper';
import './Historial.css';

export default function HistorialCombustible() {
  const [selectedFecha, setSelectedFecha] = useState(() => {
    return new Date().toLocaleDateString('en-CA');
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [activeTab, setActiveTab] = useState('cargas'); // 'cargas', 'cambios', 'reportes'
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Obtener listado de fechas únicas
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

  // 2. Obtener historial de combustible (cargas, cambios, reportes)
  const { data: datos = { cargas: [], cambios: [], reportes: [] }, isLoading: isLoadingDatos, refetch: refetchCombustible, isFetching } = useQuery({
    queryKey: ['historial-combustible', selectedFecha],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-operativo/combustible/${selectedFecha}`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener el historial de combustible');
      return response.json();
    },
    enabled: !!selectedFecha,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const cargando = isLoadingFechas || (isLoadingDatos && !!selectedFecha);

  const handleFechaChange = (f) => {
    setSelectedFecha(f);
    setIsDropdownOpen(false);
  };

  const getActiveData = () => {
    if (activeTab === 'cargas') return datos.cargas || [];
    if (activeTab === 'cambios') return datos.cambios || [];
    return datos.reportes || [];
  };

  const activeData = getActiveData();

  // Filtrado local por buscador
  const datosFiltrados = activeData.filter(d => {
    if (!filtroBusqueda) return true;
    const busqueda = filtroBusqueda.toLowerCase();

    if (activeTab === 'cargas') {
      const ecoStr = String(d.economico || '').toLowerCase();
      const tipoStr = String(d.tipo || '').toLowerCase();
      const cinchoStr = String(d.numero_cincho || '').toLowerCase();
      return ecoStr.includes(busqueda) || tipoStr.includes(busqueda) || cinchoStr.includes(busqueda);
    } else if (activeTab === 'cambios') {
      const ecoStr = String(d.economico || '').toLowerCase();
      const detallesStr = String(d.detalles || '').toLowerCase();
      const usrStr = String(d.usuario_nombre || '').toLowerCase();
      return ecoStr.includes(busqueda) || detallesStr.includes(busqueda) || usrStr.includes(busqueda);
    } else {
      const folioStr = String(d.folio || '').toLowerCase();
      const usuarioStr = String(d.generado_por || '').toLowerCase();
      return folioStr.includes(busqueda) || usuarioStr.includes(busqueda);
    }
  });

  const exportToExcel = () => {
    if (datosFiltrados.length === 0) return;

    let worksheetData;
    if (activeTab === 'cargas') {
      worksheetData = datosFiltrados.map(d => ({
        'ECO': d.economico || '',
        'TIPO DE UNIDAD': d.tipo ? String(d.tipo).toUpperCase() : '',
        'NIVEL COMBUSTIBLE': d.nivel_combustible || '',
        'LITROS COMBUSTIBLE': d.litros_combustible || '',
        'NIVEL ADBLUE': d.nivel_adblue || '',
        'LITROS ADBLUE': d.litros_adblue || '',
        'NUMERO CINCHO': d.numero_cincho || '',
        'CINCHO ADBLUE': d.numero_cincho_adblue || '',
        'KILOMETRAJE / ODOMETRO': d.kilometraje || d.odometro || '',
        'FECHA ULTIMA CARGA': d.fecha_ultima_carga || '',
        'HORA DE REGISTRO': d.hora_guardado ? new Date(d.hora_guardado).toLocaleString('es-MX') : ''
      }));
    } else if (activeTab === 'cambios') {
      worksheetData = datosFiltrados.map(d => ({
        'HORA': d.hora ? new Date(d.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
        'ECO': d.economico || '',
        'TIPO DE UNIDAD': d.tipo_unidad ? String(d.tipo_unidad).toUpperCase() : '',
        'MODIFICACIÓN': formatAccion(d.tipo_accion),
        'VALOR ANTERIOR': d.estatus_anterior ? String(d.estatus_anterior).toUpperCase() : 'N/A',
        'VALOR NUEVO': d.estatus_nuevo ? String(d.estatus_nuevo).toUpperCase() : 'N/A',
        'DETALLES': d.detalles || '',
        'USUARIO': d.usuario_nombre || 'SISTEMA'
      }));
    } else {
      worksheetData = datosFiltrados.map(d => {
        let resumen = {};
        try {
          resumen = typeof d.datos_resumen === 'string' ? JSON.parse(d.datos_resumen) : (d.datos_resumen || {});
        } catch (e) {
          resumen = {};
        }
        return {
          'FOLIO': d.folio || '',
          'FECHA REPORTE': d.fecha_reporte || '',
          'GENERADO POR': d.generado_por || '',
          'LITROS TOTALES': resumen.litros_totales ?? '',
          'UNIDADES CARGARON': resumen.unidades_cargaron ?? '',
          'UNIDADES SIN CARGAR': resumen.unidades_sin_cargar ?? '',
          'RENDIMIENTO GLOBAL (km/L)': resumen.rendimiento ?? '',
          'FECHA CREACIÓN': d.created_at ? new Date(d.created_at).toLocaleString('es-MX') : ''
        };
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Combustible_${activeTab.toUpperCase()}`);
    XLSX.writeFile(workbook, `Historial_Combustible_${activeTab.toUpperCase()}_${selectedFecha}.xlsx`);
  };

  const handleEditClick = (row) => {
    setEditingRow(row.id_historial);
    setEditForm({
      nivel_combustible: row.nivel_combustible || '',
      litros_combustible: row.litros_combustible || '',
      nivel_adblue: row.nivel_adblue || '',
      litros_adblue: row.litros_adblue || '',
      numero_cincho: row.numero_cincho || '',
      numero_cincho_adblue: row.numero_cincho_adblue || '',
      kilometraje: row.kilometraje || row.odometro || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditForm({});
  };

  const handleChangeEdit = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async (id_historial) => {
    if (!id_historial) {
      Swal.fire('Error', 'Este registro no se puede editar porque es un dato heredado sin ID de historial.', 'error');
      return;
    }
    try {
      setIsSavingEdit(true);
      const response = await fetch(`${API_BASE}/api/historial-operativo/editar-carga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ id_historial, ...editForm })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al guardar');
      
      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'Registro actualizado correctamente',
        timer: 1500,
        showConfirmButton: false
      });
      setEditingRow(null);
      refetchCombustible();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleVerDetalleReporte = (reporte) => {
    let resumen = {};
    let detalle = [];
    try {
      resumen = typeof reporte.datos_resumen === 'string' ? JSON.parse(reporte.datos_resumen) : (reporte.datos_resumen || {});
      detalle = typeof reporte.datos_detalle === 'string' ? JSON.parse(reporte.datos_detalle) : (reporte.datos_detalle || []);
    } catch (e) {
      console.error("Error al parsear reporte:", e);
    }

    const htmlDetalle = Array.isArray(detalle) && detalle.length > 0 ? `
      <div style="text-align: left; max-height: 350px; overflow-y: auto; font-size: 0.85rem;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: #f3f4f6; text-align: left;">
              <th style="padding: 6px; border: 1px solid #ddd;">Tipo</th>
              <th style="padding: 6px; border: 1px solid #ddd;">Combust.</th>
              <th style="padding: 6px; border: 1px solid #ddd;">Litros</th>
              <th style="padding: 6px; border: 1px solid #ddd;">Cargaron</th>
              <th style="padding: 6px; border: 1px solid #ddd;">Rendimiento</th>
            </tr>
          </thead>
          <tbody>
            ${detalle.map(row => `
              <tr>
                <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${row.tipo_unidad || '-'}</td>
                <td style="padding: 6px; border: 1px solid #ddd;">${row.combustible || '-'}</td>
                <td style="padding: 6px; border: 1px solid #ddd;">${row.litros_cargados ?? 0} L</td>
                <td style="padding: 6px; border: 1px solid #ddd;">${row.unidades_cargaron ?? 0} / ${row.parque ?? 0}</td>
                <td style="padding: 6px; border: 1px solid #ddd;">${row.rendimiento ? row.rendimiento + ' km/L' : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 15px; background: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <strong>Resumen Global:</strong><br/>
          • Litros Totales: <b>${resumen.litros_totales ?? 0} L</b><br/>
          • Unidades con Carga: <b>${resumen.unidades_cargaron ?? 0}</b> | Sin Cargar: <b>${resumen.unidades_sin_cargar ?? 0}</b><br/>
          • Rendimiento Promedio: <b>${resumen.rendimiento ? resumen.rendimiento + ' km/L' : 'N/A'}</b>
        </div>
      </div>
    ` : '<p style="color: #6b7280;">No hay detalles de desglose disponibles.</p>';

    Swal.fire({
      title: `Folio: ${reporte.folio}`,
      html: `
        <p style="margin-bottom: 5px; color: #4b5563; font-size: 0.9rem;">
          Generado por: <strong>${reporte.generado_por}</strong> (${reporte.fecha_reporte})
        </p>
        ${htmlDetalle}
      `,
      width: '650px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b1d33',
    });
  };

  return (
    <div className="historial-page">
      <Header title="Historial Carga de Combustible" hideBackButton={false} />

      <main className="historial-content">
        <div className="historial-header">
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Registro Histórico de Carga de Combustible
            </h2>
            <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Consulta bitácoras de despacho de diesel, adblue, odómetros y reportes diarios.
            </p>
          </div>

          <div className="historial-filter" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => refetchCombustible()}
              disabled={cargando || isFetching}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '700', color: '#334155' }}>Buscar:</label>
              <input
                type="text"
                placeholder="Ej. ECO, tipo o folio..."
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
              Excel
            </button>
          </div>
        </div>

        {/* Pestañas de Historial */}
        <div className="historial-tabs">
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'cargas' ? 'active' : ''}`}
            onClick={() => setActiveTab('cargas')}
          >
            Registros de Cargas de Combustible
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'cambios' ? 'active' : ''}`}
            onClick={() => setActiveTab('cambios')}
          >
            Cambios en Bitácora
          </button>
          <button
            type="button"
            className={`historial-tab-btn ${activeTab === 'reportes' ? 'active' : ''}`}
            onClick={() => setActiveTab('reportes')}
          >
            Reportes Generados (Folios COMB)
          </button>
        </div>

        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ marginBottom: '1.25rem' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Cargando historial de combustible...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.85rem' }}>Buscando registros en la base de datos</p>
          </div>
        ) : activeTab === 'cargas' ? (
          <div className="table-responsive">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>ECO</th>
                  <th>TIPO</th>
                  <th>NIVEL COMBUSTIBLE</th>
                  <th>LITROS COMBUSTIBLE</th>
                  <th>NIVEL ADBLUE</th>
                  <th>LITROS ADBLUE</th>
                  <th>CINCHO COMBUSTIBLE</th>
                  <th>CINCHO ADBLUE</th>
                  <th>KILOMETRAJE</th>
                  <th>ÚLTIMA CARGA</th>
                  <th>HORA REGISTRO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.length > 0 ? (
                  datosFiltrados.map((d, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: '700' }}>{d.economico}</td>
                      <td>{d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '-'}</td>
                      
                      {editingRow === d.id_historial && d.id_historial ? (
                        <>
                          <td><input type="text" value={editForm.nivel_combustible} onChange={e => handleChangeEdit('nivel_combustible', e.target.value)} style={{width: '60px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', outline: 'none', fontSize: '0.85rem', color: '#111827'}} /></td>
                          <td><input type="number" value={editForm.litros_combustible} onChange={e => handleChangeEdit('litros_combustible', e.target.value)} style={{width: '70px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', outline: 'none', fontSize: '0.85rem', color: '#111827', fontWeight: 'bold'}} /></td>
                          <td><input type="text" value={editForm.nivel_adblue} onChange={e => handleChangeEdit('nivel_adblue', e.target.value)} style={{width: '60px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', outline: 'none', fontSize: '0.85rem', color: '#111827'}} /></td>
                          <td><input type="number" value={editForm.litros_adblue} onChange={e => handleChangeEdit('litros_adblue', e.target.value)} style={{width: '70px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', outline: 'none', fontSize: '0.85rem', color: '#111827', fontWeight: 'bold'}} /></td>
                          <td><input type="text" value={editForm.numero_cincho} onChange={e => handleChangeEdit('numero_cincho', e.target.value)} style={{width: '90px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', outline: 'none', fontSize: '0.85rem', color: '#111827', textTransform: 'uppercase'}} /></td>
                          <td><input type="text" value={editForm.numero_cincho_adblue} onChange={e => handleChangeEdit('numero_cincho_adblue', e.target.value)} style={{width: '90px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', outline: 'none', fontSize: '0.85rem', color: '#111827', textTransform: 'uppercase'}} /></td>
                          <td><input type="number" value={editForm.kilometraje} onChange={e => handleChangeEdit('kilometraje', e.target.value)} style={{width: '90px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', outline: 'none', fontSize: '0.85rem', color: '#111827'}} /></td>
                        </>
                      ) : (
                        <>
                          <td>{d.nivel_combustible || '-'}</td>
                          <td style={{ fontWeight: '600', color: '#047857' }}>{d.litros_combustible ? `${d.litros_combustible} L` : '-'}</td>
                          <td>{d.nivel_adblue || '-'}</td>
                          <td>{d.litros_adblue ? `${d.litros_adblue} L` : '-'}</td>
                          <td>{d.numero_cincho || '-'}</td>
                          <td>{d.numero_cincho_adblue || '-'}</td>
                          <td>{d.kilometraje ? Number(d.kilometraje).toLocaleString('es-MX') : d.odometro ? Number(d.odometro).toLocaleString('es-MX') : '-'}</td>
                        </>
                      )}

                      <td>{d.fecha_ultima_carga || '-'}</td>
                      <td>{d.hora_guardado ? new Date(d.hora_guardado).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      
                      <td>
                        {d.id_historial ? (
                          editingRow === d.id_historial ? (
                            <div style={{display: 'flex', gap: '6px'}}>
                              <button onClick={() => handleSaveEdit(d.id_historial)} disabled={isSavingEdit} style={{background: '#047857', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'}}>{isSavingEdit ? <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff', flexShrink: 0, aspectRatio: '1', boxSizing: 'border-box' }} /> : '✓'} Guardar</button>
                              <button onClick={handleCancelEdit} style={{background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'}}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => handleEditClick(d)} style={{background: '#f59e0b', color: 'white', border: '1px solid #d97706', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>✎ Editar</button>
                          )
                        ) : (
                          <span style={{fontSize: '0.8rem', color: '#9ca3af'}} title="Registro heredado">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="text-center" style={{ padding: '2rem', color: '#6b7280' }}>
                      No se encontraron cargas de combustible para la fecha seleccionada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'cambios' ? (
          <div className="table-responsive">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>HORA</th>
                  <th>ECO</th>
                  <th>TIPO DE UNIDAD</th>
                  <th>MODIFICACIÓN</th>
                  <th>ESTATUS ANTERIOR</th>
                  <th>ESTATUS NUEVO</th>
                  <th>DETALLES</th>
                  <th>USUARIO</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.length > 0 ? (
                  datosFiltrados.map((d) => (
                    <tr key={d.id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: '500' }}>
                        {d.hora ? new Date(d.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ fontWeight: '700' }}>{d.economico}</td>
                      <td>{d.tipo_unidad ? (String(d.tipo_unidad).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo_unidad).toUpperCase()) : '-'}</td>
                      <td>
                        <span className={`estatus-badge ${getAccionBadgeStyle(d.tipo_accion)}`}>
                          {formatAccion(d.tipo_accion)}
                        </span>
                      </td>
                      <td>{d.estatus_anterior ? String(d.estatus_anterior).toUpperCase() : 'N/A'}</td>
                      <td style={{ fontWeight: '600' }}>{d.estatus_nuevo ? String(d.estatus_nuevo).toUpperCase() : 'N/A'}</td>
                      <td style={{ maxWidth: '300px' }}>{d.detalles || '-'}</td>
                      <td style={{ fontWeight: '500', color: '#4b5563' }}>{d.usuario_nombre || 'SISTEMA'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '2rem', color: '#6b7280' }}>
                      No se encontraron modificaciones registradas en esta fecha.
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
                  <th>FOLIO</th>
                  <th>FECHA REPORTE</th>
                  <th>GENERADO POR</th>
                  <th>RESUMEN DE CARGA</th>
                  <th>HORA CREACIÓN</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.length > 0 ? (
                  datosFiltrados.map((r) => {
                    let resumen = {};
                    try {
                      resumen = typeof r.datos_resumen === 'string' ? JSON.parse(r.datos_resumen) : (r.datos_resumen || {});
                    } catch (e) {
                      resumen = {};
                    }
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: '700', color: '#6b1d33' }}>{r.folio}</td>
                        <td>{r.fecha_reporte}</td>
                        <td style={{ fontWeight: '500' }}>{r.generado_por}</td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>
                            <strong>{resumen.litros_totales ?? 0} L</strong> cargados ({resumen.unidades_cargaron ?? 0} unidades) | Rend: <strong>{resumen.rendimiento ? `${resumen.rendimiento} km/L` : 'N/A'}</strong>
                          </span>
                        </td>
                        <td>{r.created_at ? new Date(r.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleVerDetalleReporte(r)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              backgroundColor: '#6b1d33',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center" style={{ padding: '2rem', color: '#6b7280' }}>
                      No se encontraron reportes diarios generados para la fecha seleccionada.
                    </td>
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



