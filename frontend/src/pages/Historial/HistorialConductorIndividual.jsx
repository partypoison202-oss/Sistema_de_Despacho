import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import { getProfileImageUrl } from '../../utils/imageUrl';
import { generarPDFHistorialConductor } from '../../utils/generarPDFHistorialConductor';
import './Historial.css';

export default function HistorialConductorIndividual() {
  const [selectedConductorId, setSelectedConductorId] = useState('');
  const [busquedaConductor, setBusquedaConductor] = useState('');
  const [isConductorSelectorOpen, setIsConductorSelectorOpen] = useState(false);
  const conductorDropdownRef = useRef(null);

  // Rango de fechas por defecto: últimos 30 días
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [hasta, setHasta] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [filtroTipoEvento, setFiltroTipoEvento] = useState('TODOS');
  const [busquedaEvento, setBusquedaEvento] = useState('');
  const [modoVisualizacion, setModoVisualizacion] = useState('LISTA'); // 'LISTA' | 'CALENDARIO'
  const [diaSeleccionadoModal, setDiaSeleccionadoModal] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };
  };

  // 1. Obtener lista de conductores para el selector
  const { data: listaConductores = [], isLoading: isLoadingConductores } = useQuery({
    queryKey: ['catalogo-conductores-historial-individual'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/conductores?incluir_bajas=true`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar catálogo de conductores');
      const json = await response.json();
      return Array.isArray(json) ? json : (json.conductores || []);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Autoseleccionar el primer conductor si aún no hay seleccionado
  useEffect(() => {
    if (listaConductores.length > 0 && !selectedConductorId) {
      setSelectedConductorId(String(listaConductores[0].id));
    }
  }, [listaConductores, selectedConductorId]);

  // 2. Obtener Historial Completo del Conductor Individual
  const {
    data: historialIndividualData = null,
    isLoading: isLoadingHistorial,
    isFetching: isFetchingHistorial,
    refetch: refetchHistorial
  } = useQuery({
    queryKey: ['historial-individual-conductor-page', selectedConductorId, desde, hasta],
    queryFn: async () => {
      if (!selectedConductorId) return null;
      const response = await fetch(
        `${API_BASE}/api/conductores/${selectedConductorId}/historial-completo?desde=${desde}&hasta=${hasta}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Error al obtener el historial completo del conductor');
      }
      return response.json();
    },
    enabled: !!selectedConductorId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Manejo de clicks fuera de dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (conductorDropdownRef.current && !conductorDropdownRef.current.contains(event.target)) {
        setIsConductorSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Presets de rangos de fecha rápidos
  const aplicarRangoRapido = (tipo) => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    if (tipo === 'HOY') {
      setDesde(hoyStr);
      setHasta(hoyStr);
    } else if (tipo === '7_DIAS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDesde(d.toISOString().split('T')[0]);
      setHasta(hoyStr);
    } else if (tipo === '30_DIAS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setDesde(d.toISOString().split('T')[0]);
      setHasta(hoyStr);
    } else if (tipo === 'ESTE_MES') {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setDesde(d.toISOString().split('T')[0]);
      setHasta(hoyStr);
    } else if (tipo === 'MES_ANTERIOR') {
      const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      setDesde(inicioMesAnt.toISOString().split('T')[0]);
      setHasta(finMesAnt.toISOString().split('T')[0]);
    } else if (tipo === 'ANIO_ACTUAL') {
      const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
      setDesde(inicioAnio.toISOString().split('T')[0]);
      setHasta(hoyStr);
    }
  };

  // Filtrado de conductores para el selector
  const conductoresFiltrados = useMemo(() => {
    const q = busquedaConductor.toLowerCase().trim();
    if (!q) return listaConductores;
    return listaConductores.filter(c => {
      const tarj = String(c.tarjeton || c.numero_tarjeton || '').toLowerCase();
      const nom = `${c.nombres || ''} ${c.apellidos || ''} ${c.nombre || ''}`.toLowerCase();
      return tarj.includes(q) || nom.includes(q);
    });
  }, [listaConductores, busquedaConductor]);

  const conductorSeleccionadoObj = useMemo(() => {
    return listaConductores.find(c => String(c.id) === String(selectedConductorId)) || null;
  }, [listaConductores, selectedConductorId]);

  // Eventos del historial individual filtrados por tipo y búsqueda
  const eventosFiltrados = useMemo(() => {
    if (!historialIndividualData || !historialIndividualData.eventos) return [];
    let list = historialIndividualData.eventos;

    if (filtroTipoEvento !== 'TODOS') {
      if (filtroTipoEvento === 'ASISTENCIA') {
        list = list.filter(e => e.tipo === 'ASISTENCIA' || e.tipo === 'PERMUTA_AP');
      } else if (filtroTipoEvento === 'FALTA') {
        list = list.filter(e => e.tipo === 'FALTA');
      } else if (filtroTipoEvento === 'FALTA_JUSTIFICADA') {
        list = list.filter(e => e.tipo === 'FALTA_JUSTIFICADA');
      } else if (filtroTipoEvento === 'DESCANSO') {
        list = list.filter(e => e.tipo === 'DESCANSO' || e.tipo === 'PERMUTA_DP');
      } else if (filtroTipoEvento === 'PERMUTA') {
        list = list.filter(e => e.tipo === 'PERMUTA' || e.tipo === 'PERMUTA_AP' || e.tipo === 'PERMUTA_DP');
      } else if (filtroTipoEvento === 'PERMISO') {
        list = list.filter(e => e.tipo === 'PERMISO');
      } else if (filtroTipoEvento === 'VACACIONES') {
        list = list.filter(e => e.tipo === 'VACACIONES');
      } else if (filtroTipoEvento === 'INCAPACIDAD') {
        list = list.filter(e => e.tipo === 'INCAPACIDAD');
      } else if (filtroTipoEvento === 'RETARDO') {
        list = list.filter(e => e.tipo === 'RETARDO');
      } else if (filtroTipoEvento === 'AMONESTACION') {
        list = list.filter(e => e.tipo === 'AMONESTACION' || e.tipo === 'BITACORA');
      }
    }

    const q = busquedaEvento.toLowerCase().trim();
    if (q) {
      list = list.filter(e => {
        return (
          (e.fecha && e.fecha.includes(q)) ||
          (e.titulo && e.titulo.toLowerCase().includes(q)) ||
          (e.descripcion && e.descripcion.toLowerCase().includes(q)) ||
          (e.detalles && e.detalles.toLowerCase().includes(q)) ||
          (e.origen && e.origen.toLowerCase().includes(q)) ||
          (e.usuario && e.usuario.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [historialIndividualData, filtroTipoEvento, busquedaEvento]);

  const exportarExcelIndividual = () => {
    if (!historialIndividualData || !eventosFiltrados || eventosFiltrados.length === 0) {
      Swal.fire('Atención', 'No hay registros en el rango seleccionado para exportar.', 'info');
      return;
    }

    const { conductor, rango, resumen } = historialIndividualData;

    const worksheetData = eventosFiltrados.map(ev => ({
      'FECHA': ev.fecha || 'N/D',
      'TIPO DE EVENTO': ev.tipo ? ev.tipo.replace('_', ' ') : 'EVENTO',
      'SUBTIPO': ev.subtipo || '-',
      'TÍTULO / ASIGNACIÓN': ev.titulo || '',
      'DESCRIPCIÓN OPERATIVA': ev.descripcion || '',
      'DETALLES / JUSTIFICACIÓN': ev.detalles || '',
      'ORIGEN': ev.origen || 'Sistema',
      'USUARIO RESPONSABLE': ev.usuario || 'Sistema'
    }));

    const wsEventos = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || '').length)) + 2
    }));
    wsEventos['!cols'] = colWidths;

    const wsResumenData = [
      { 'CAMPO': 'NOMBRE DE CONDUCTOR', 'VALOR': conductor?.nombre_completo || 'DESCONOCIDO' },
      { 'CAMPO': 'TARJETÓN', 'VALOR': conductor?.tarjeton || 'S/N' },
      { 'CAMPO': 'TIPO TARJETÓN', 'VALOR': conductor?.tipo_tarjeton || 'B' },
      { 'CAMPO': 'ESTADO DE SERVICIO', 'VALOR': conductor?.estado_servicio || 'Disponible' },
      { 'CAMPO': 'ESTATUS', 'VALOR': conductor?.estatus || 'Activo' },
      { 'CAMPO': 'PUESTO / CATEGORÍA', 'VALOR': `${conductor?.puesto || '-'} / ${conductor?.categoria || '-'}` },
      { 'CAMPO': 'TURNO / JORNADA', 'VALOR': `${conductor?.turno || '-'} / ${conductor?.jornada || '-'}` },
      { 'CAMPO': 'FECHA INGRESO', 'VALOR': conductor?.fecha_ingreso || '-' },
      { 'CAMPO': 'PERIODO CONSULTADO (DESDE)', 'VALOR': rango?.desde || desde },
      { 'CAMPO': 'PERIODO CONSULTADO (HASTA)', 'VALOR': rango?.hasta || hasta },
      { 'CAMPO': 'DÍAS TOTALES EN RANGO', 'VALOR': rango?.dias_totales || 0 },
      { 'CAMPO': '---', 'VALOR': '---' },
      { 'CAMPO': 'ASISTENCIAS TOTALES (DESPACHO + AP)', 'VALOR': resumen?.asistencias || 0 },
      { 'CAMPO': 'FALTAS INJUSTIFICADAS', 'VALOR': resumen?.faltas_injustificadas || 0 },
      { 'CAMPO': 'FALTAS JUSTIFICADAS', 'VALOR': resumen?.faltas_justificadas || 0 },
      { 'CAMPO': 'TOTAL FALTAS (INJ + JUST)', 'VALOR': resumen?.faltas_totales || 0 },
      { 'CAMPO': 'DESCANSOS TOTALES (ROL + DP)', 'VALOR': resumen?.descansos || 0 },
      { 'CAMPO': 'PERMUTAS ASISTENCIA (AP)', 'VALOR': resumen?.permutas_ap || 0 },
      { 'CAMPO': 'PERMUTAS DESCANSO (DP)', 'VALOR': resumen?.permutas_dp || 0 },
      { 'CAMPO': 'PERMISOS ECONÓMICOS / OFICIALES', 'VALOR': resumen?.permisos || 0 },
      { 'CAMPO': 'DÍAS DE VACACIONES', 'VALOR': resumen?.vacaciones || 0 },
      { 'CAMPO': 'INCAPACIDADES MÉDICAS', 'VALOR': resumen?.incapacidades || 0 },
      { 'CAMPO': 'RETARDOS REGISTRADOS', 'VALOR': resumen?.retardos || 0 },
      { 'CAMPO': 'AMONESTACIONES / SANCIONES', 'VALOR': resumen?.amonestaciones || 0 },
      { 'CAMPO': 'TASA DE CUMPLIMIENTO / ASISTENCIA (%)', 'VALOR': `${resumen?.tasa_asistencia_pct ?? 100}%` }
    ];

    const wsResumen = XLSX.utils.json_to_sheet(wsResumenData);
    wsResumen['!cols'] = [{ wch: 40 }, { wch: 40 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsEventos, 'Historial_Eventos');
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen_Conductor');

    const tarjClean = (conductor?.tarjeton || '0000').replace(/[^a-zA-Z0-9]/g, '');
    XLSX.writeFile(workbook, `Historial_${tarjClean}_${desde}_al_${hasta}.xlsx`);
  };

  const exportarPDFIndividual = async () => {
    if (!historialIndividualData) {
      Swal.fire('Atención', 'No hay datos cargados para generar el PDF.', 'info');
      return;
    }
    try {
      Swal.fire({
        title: 'Generando Reporte...',
        text: 'Compilando expediente en PDF...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await generarPDFHistorialConductor(historialIndividualData);
      Swal.close();
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo generar el documento PDF.', 'error');
    }
  };

  const getBadgeStyle = (tipo) => {
    switch (tipo) {
      case 'FALTA': return { bg: '#fee2e2', color: '#b91c1c', label: 'Falta Injustificada' };
      case 'FALTA_JUSTIFICADA': return { bg: '#d1fae5', color: '#047857', label: 'Falta Justificada' };
      case 'RETARDO': return { bg: '#fef9c3', color: '#a16207', label: 'Retardo' };
      case 'ASISTENCIA': return { bg: '#dcfce7', color: '#15803d', label: 'Asistencia' };
      case 'PERMUTA_AP': return { bg: '#e0e7ff', color: '#3730a3', label: 'Asistencia (Permuta)' };
      case 'PERMUTA_DP': return { bg: '#ede9fe', color: '#6d28d9', label: 'Descanso (Permuta)' };
      case 'PERMUTA': return { bg: '#ede9fe', color: '#6d28d9', label: 'Permuta' };
      case 'DESCANSO': return { bg: '#fed7aa', color: '#9a3412', label: 'Descanso' };
      case 'PERMISO': return { bg: '#e0f2fe', color: '#0284c7', label: 'Permiso' };
      case 'VACACIONES': return { bg: '#fef08a', color: '#854d0e', label: 'Vacaciones' };
      case 'INCAPACIDAD': return { bg: '#bfdbfe', color: '#1e40af', label: 'Incapacidad' };
      case 'AMONESTACION': return { bg: '#fef3c7', color: '#b45309', label: 'Amonestación' };
      default: return { bg: '#f1f5f9', color: '#475569', label: tipo || 'Movimiento' };
    }
  };

  const getIconForType = (tipo) => {
    switch (tipo) {
      case 'ASISTENCIA':
      case 'PERMUTA_AP':
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'FALTA':
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'FALTA_JUSTIFICADA':
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'DESCANSO':
      case 'PERMUTA_DP':
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
      case 'PERMUTA':
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'PERMISO':
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'VACACIONES':
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'INCAPACIDAD':
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'RETARDO':
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getCellClass = (codigo) => {
    switch (codigo) {
      case 'A': return 'cell-a';
      case 'F': return 'cell-f';
      case 'FJ': return 'cell-a';
      case 'D': return 'cell-d';
      case 'V': return 'cell-v';
      case 'I': return 'cell-i';
      case 'AP': return 'cell-ap';
      case 'DP': return 'cell-dp';
      case 'P': return 'cell-i';
      case 'R': return 'cell-r';
      default: return 'cell-empty';
    }
  };

  const conductorData = historialIndividualData?.conductor || conductorSeleccionadoObj || {};
  const resumenIndividual = historialIndividualData?.resumen || {};
  const matrizDias = historialIndividualData?.matriz_dias || [];

  return (
    <div className="historial-page">
      <Header title="Historial Individual de Persona Conductora" hideBackButton={false} />

      <main className="historial-content" style={{ maxWidth: '1440px' }}>
        {/* Cabecera Principal */}
        <div className="historial-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Historial y Expediente por Conductor
              </h2>
              <span style={{
                backgroundColor: '#6b1d33',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '800',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em'
              }}>
                EXPEDIENTE DETALLADO
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Visualiza todo el historial operativo (asistencias, faltas, retardos, descansos, permutas, permisos, vacaciones) de un conductor específico en el rango de fechas seleccionado.
            </p>
          </div>
        </div>

        {/* Panel de Selección y Filtros */}
        <div style={{
          background: '#ffffff',
          padding: '1.25rem',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Selector de Conductor */}
            <div style={{ flex: '1 1 320px', minWidth: '280px', position: 'relative' }} ref={conductorDropdownRef}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.03em' }}>
                1. Seleccionar Conductor:
              </label>
              
              <div
                onClick={() => setIsConductorSelectorOpen(!isConductorSelectorOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                  <span style={{
                    background: '#6b1d33',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '0.375rem',
                    fontFamily: 'monospace'
                  }}>
                    {conductorData?.tarjeton || 'S/N'}
                  </span>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conductorData?.nombre_completo || (conductorData?.nombres ? `${conductorData.nombres} ${conductorData.apellidos}` : 'Seleccione conductor...')}
                  </span>
                </div>
                <svg width="18" height="18" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: isConductorSelectorOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Menú Desplegable con Buscador */}
              {isConductorSelectorOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  borderRadius: '0.625rem',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  zIndex: 50,
                  padding: '0.5rem',
                  maxHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ padding: '0.25rem 0.25rem 0.5rem 0.25rem' }}>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Buscar por nombre o número de tarjetón..."
                      value={busquedaConductor}
                      onChange={(e) => setBusquedaConductor(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {isLoadingConductores ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Cargando catálogo...</div>
                    ) : conductoresFiltrados.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No se encontraron conductores</div>
                    ) : (
                      conductoresFiltrados.map(c => {
                        const isSelected = String(c.id) === String(selectedConductorId);
                        const nom = c.nombre_completo || c.nombre || `${c.nombres || ''} ${c.apellidos || ''}`.trim();
                        const tarj = c.tarjeton || c.numero_tarjeton || 'S/N';
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedConductorId(String(c.id));
                              setIsConductorSelectorOpen(false);
                              setBusquedaConductor('');
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#f1f5f9' : 'transparent',
                              borderLeft: isSelected ? '3px solid #6b1d33' : '3px solid transparent',
                              transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#e2e8f0' : '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#f1f5f9' : 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: '800',
                                fontSize: '0.8rem',
                                color: isSelected ? '#6b1d33' : '#334155',
                                backgroundColor: '#e2e8f0',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '0.25rem'
                              }}>
                                {tarj}
                              </span>
                              <span style={{ fontSize: '0.875rem', fontWeight: isSelected ? '700' : '500', color: '#0f172a' }}>
                                {nom}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              color: c.estatus === 'activo' || !c.estatus ? '#166534' : '#991b1b'
                            }}>
                              {c.estatus || 'Activo'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selectores de Fechas: Desde y Hasta */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.03em' }}>
                  Desde:
                </label>
                <AppleDatePicker value={desde} onChange={setDesde} disableFuture={false} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.03em' }}>
                  Hasta:
                </label>
                <AppleDatePicker value={hasta} onChange={setHasta} minDate={desde} disableFuture={false} />
              </div>
            </div>

            {/* Botones de Acción: Refrescar, Excel, PDF */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={() => refetchHistorial()}
                disabled={isLoadingHistorial || isFetchingHistorial}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Actualizar datos en vivo"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isFetchingHistorial ? 'spin 1s linear infinite' : 'none' }}>
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                {isFetchingHistorial ? 'Actualizando...' : 'Actualizar'}
              </button>

              <button
                type="button"
                className="export-excel-btn"
                onClick={exportarExcelIndividual}
                disabled={isLoadingHistorial || !historialIndividualData}
                title="Descargar Reporte en Excel"
                style={{ padding: '0.55rem 1rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Excel
              </button>

              <button
                type="button"
                onClick={exportarPDFIndividual}
                disabled={isLoadingHistorial || !historialIndividualData}
                style={{
                  backgroundColor: '#6b1d33',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.55rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 4px rgba(107, 29, 51, 0.25)'
                }}
                title="Generar Expediente en PDF"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                PDF
              </button>
            </div>
          </div>

          {/* Atajos de Fecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginRight: '0.25rem' }}>
              Atajos de fecha:
            </span>
            {[
              { id: 'HOY', label: 'Hoy' },
              { id: '7_DIAS', label: 'Últimos 7 días' },
              { id: '30_DIAS', label: 'Últimos 30 días' },
              { id: 'ESTE_MES', label: 'Este Mes' },
              { id: 'MES_ANTERIOR', label: 'Mes Anterior' },
              { id: 'ANIO_ACTUAL', label: 'Año 2026' }
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => aplicarRangoRapido(r.id)}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6b1d33'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* HERO CARD: Perfil y Datos del Conductor */}
        {conductorData && (
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            padding: '1.25rem 1.5rem',
            borderRadius: '1rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#e2e8f0',
                border: '3px solid #6b1d33',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {conductorData?.foto ? (
                  <img
                    src={getProfileImageUrl(conductorData.foto)}
                    alt={conductorData?.nombre_completo || 'Foto'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#6b1d33' }}>
                    {(conductorData?.nombres || 'C').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    {conductorData?.nombre_completo || `${conductorData?.nombres || ''} ${conductorData?.apellidos || ''}`.trim() || 'Conductor Seleccionado'}
                  </h3>
                  <span style={{
                    backgroundColor: '#6b1d33',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.375rem',
                    fontFamily: 'monospace'
                  }}>
                    TARJETÓN: {conductorData?.tarjeton || 'S/N'}
                  </span>
                  <span style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '0.375rem'
                  }}>
                    TIPO: {conductorData?.tipo_tarjeton || 'B'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.4rem', flexWrap: 'wrap', fontSize: '0.825rem', color: '#64748b' }}>
                  <span><strong>Puesto:</strong> {conductorData?.puesto || 'Conductor de Autobús'}</span>
                  <span><strong>Categoría / Turno:</strong> {conductorData?.categoria || 'A'} / {conductorData?.turno || 'Mixto'}</span>
                  <span><strong>Estado:</strong> <span style={{ color: conductorData?.estado_servicio === 'falta' ? '#dc2626' : '#16a34a', fontWeight: '700' }}>{conductorData?.estado_servicio || 'Disponible'}</span></span>
                  <span><strong>Estatus:</strong> <span style={{ color: '#0f172a', fontWeight: '700' }}>{(conductorData?.estatus || 'Activo').toUpperCase()}</span></span>
                </div>
              </div>
            </div>

            {/* Cumplimiento Operativo */}
            <div style={{
              background: '#ffffff',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.75rem',
              border: '1px solid #cbd5e1',
              textAlign: 'right',
              minWidth: '180px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                Tasa de Asistencia ({resumenIndividual?.dias_totales || 0} Días)
              </span>
              <div style={{
                fontSize: '1.6rem',
                fontWeight: '900',
                color: (resumenIndividual?.tasa_asistencia_pct ?? 100) >= 90 ? '#15803d' : ((resumenIndividual?.tasa_asistencia_pct ?? 100) >= 75 ? '#b45309' : '#dc2626')
              }}>
                {resumenIndividual?.tasa_asistencia_pct ?? 100}%
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {resumenIndividual?.asistencias || 0} Asistencias vs {resumenIndividual?.faltas_injustificadas || 0} Faltas
              </span>
            </div>
          </div>
        )}

        {/* TARJETAS KPI DE RESUMEN DEL RANGO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #15803d', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#15803d', textTransform: 'uppercase' }}>Asistencias</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#14532d' }}>
              {resumenIndividual?.asistencias || 0}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
              Despachos y permutas cubiertas
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #dc2626', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase' }}>Faltas Injustificadas</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#991b1b' }}>
              {resumenIndividual?.faltas_injustificadas || 0}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
              Inasistencias sin justificar
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #059669', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>Faltas Justificadas</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#065f46' }}>
              {resumenIndividual?.faltas_justificadas || 0}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
              Con comprobante / autorización
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ea580c', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#ea580c', textTransform: 'uppercase' }}>Descansos</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#9a3412' }}>
              {resumenIndividual?.descansos || 0}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
              Rol semanal y permutas DP
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' }}>Permutas</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#5b21b6' }}>
              {resumenIndividual?.permutas_totales || 0}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
              AP: {resumenIndividual?.permutas_ap || 0} | DP: {resumenIndividual?.permutas_dp || 0}
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>Permisos</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#075985' }}>
              {resumenIndividual?.permisos || 0}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
              Económicos y oficiales
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ca8a04', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#ca8a04', textTransform: 'uppercase' }}>Vacaciones</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#854d0e' }}>
              {resumenIndividual?.vacaciones || 0}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
              Días programados
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' }}>Incapacidades</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#1e40af' }}>
              {resumenIndividual?.incapacidades || 0}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
              Días médicos
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #d97706', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#d97706', textTransform: 'uppercase' }}>Retardos</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: '900', color: '#92400e' }}>
              {resumenIndividual?.retardos || 0}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
              Llegadas tarde
            </p>
          </div>
        </div>

        {/* Barra de Filtros y Modo de Vista */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div className="search-box-container" style={{ flex: '1 1 260px', maxWidth: '400px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="historial-search-input"
              placeholder="Buscar en eventos (ruta, unidad, motivo, etc.)..."
              value={busquedaEvento}
              onChange={(e) => setBusquedaEvento(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'ASISTENCIA', label: 'Asistencias' },
              { id: 'FALTA', label: 'Faltas' },
              { id: 'FALTA_JUSTIFICADA', label: 'Justificadas' },
              { id: 'DESCANSO', label: 'Descansos' },
              { id: 'PERMUTA', label: 'Permutas' },
              { id: 'PERMISO', label: 'Permisos' },
              { id: 'VACACIONES', label: 'Vacaciones' },
              { id: 'INCAPACIDAD', label: 'Incapacidades' },
              { id: 'RETARDO', label: 'Retardos' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltroTipoEvento(tab.id)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  border: '1px solid',
                  borderColor: filtroTipoEvento === tab.id ? '#6b1d33' : '#e2e8f0',
                  backgroundColor: filtroTipoEvento === tab.id ? '#6b1d33' : '#ffffff',
                  color: filtroTipoEvento === tab.id ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', background: '#e2e8f0', padding: '0.2rem', borderRadius: '0.5rem', gap: '0.2rem' }}>
            <button
              type="button"
              onClick={() => setModoVisualizacion('LISTA')}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: '800',
                border: 'none',
                backgroundColor: modoVisualizacion === 'LISTA' ? '#ffffff' : 'transparent',
                color: modoVisualizacion === 'LISTA' ? '#0f172a' : '#64748b',
                cursor: 'pointer'
              }}
            >
              Vista Detallada
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacion('CALENDARIO')}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: '800',
                border: 'none',
                backgroundColor: modoVisualizacion === 'CALENDARIO' ? '#ffffff' : 'transparent',
                color: modoVisualizacion === 'CALENDARIO' ? '#0f172a' : '#64748b',
                cursor: 'pointer'
              }}
            >
              Vista Calendario
            </button>
          </div>
        </div>

        {/* Tabla Detallada vs Calendario */}
        {isLoadingHistorial ? (
          <div className="historial-loading">
            <div className="spinner"></div>
            <p>Cargando expediente e historial del conductor...</p>
          </div>
        ) : modoVisualizacion === 'LISTA' ? (
          <div className="historial-table-container">
            <table className="historial-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Fecha</th>
                  <th style={{ width: '180px' }}>Tipo de Evento</th>
                  <th style={{ width: '260px' }}>Evento / Asignación</th>
                  <th>Descripción / Detalles Operativos</th>
                  <th style={{ width: '160px' }}>Origen / Auditor</th>
                </tr>
              </thead>
              <tbody>
                {eventosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                      <p style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', color: '#334155' }}>
                        Sin eventos en el periodo seleccionado
                      </p>
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem' }}>
                        No se encontraron registros de asistencias, faltas, retardos, descansos o permutas para este conductor en el rango del {desde} al {hasta}.
                      </p>
                    </td>
                  </tr>
                ) : (
                  eventosFiltrados.map((ev, idx) => {
                    const badge = getBadgeStyle(ev.tipo);
                    const icon = getIconForType(ev.tipo);

                    return (
                      <tr key={ev.id || idx}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.875rem' }}>
                              {ev.fecha}
                            </span>
                            <span style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'capitalize' }}>
                              {new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long' })}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.65rem',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            fontWeight: '800',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            letterSpacing: '0.02em'
                          }}>
                            {icon}
                            {badge.label}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                            {ev.titulo}
                          </div>
                          {ev.subtipo && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                              {ev.subtipo}
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: '600' }}>
                            {ev.descripcion}
                          </div>
                          {ev.detalles && (
                            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: '1.4' }}>
                              {ev.detalles}
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.825rem' }}>
                            {ev.origen || 'Sistema'}
                          </div>
                          <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                            {ev.usuario || 'Automático'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            background: '#ffffff',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
              Matriz Diaria de Estatus en el Periodo ({matrizDias.length} Días)
            </h4>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '0.75rem'
            }}>
              {matrizDias.map(dia => {
                const cellClass = getCellClass(dia.codigo);
                return (
                  <div
                    key={dia.fecha}
                    onClick={() => {
                      if (dia.eventos && dia.eventos.length > 0) {
                        setDiaSeleccionadoModal(dia);
                      }
                    }}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.625rem',
                      padding: '0.75rem',
                      background: dia.eventos?.length > 0 ? '#f8fafc' : '#ffffff',
                      cursor: dia.eventos?.length > 0 ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (dia.eventos?.length > 0) {
                        e.currentTarget.style.borderColor = '#6b1d33';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                        {dia.fecha.split('-').slice(1).join('/')}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'capitalize' }}>
                        {dia.dia_semana.substring(0, 3)}
                      </span>
                    </div>

                    <div className={`status-bubble ${cellClass}`} style={{ width: '100%', height: '32px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '900' }}>
                      {dia.codigo}
                    </div>

                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dia.etiqueta}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal de Detalle de Día */}
        {diaSeleccionadoModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '1rem',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: 'scaleIn 0.15s ease'
            }}>
              <div style={{
                background: '#6b1d33',
                color: '#ffffff',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>
                    Eventos del {diaSeleccionadoModal.fecha} ({diaSeleccionadoModal.dia_semana})
                  </h4>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                    Expediente de {conductorData?.nombre_completo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDiaSeleccionadoModal(null)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              <div style={{ padding: '1.25rem', maxHeight: '400px', overflowY: 'auto' }}>
                {diaSeleccionadoModal.eventos.map((ev, idx) => {
                  const badge = getBadgeStyle(ev.tipo);
                  return (
                    <div key={idx} style={{
                      padding: '0.85rem',
                      background: '#f8fafc',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: badge.bg,
                          color: badge.color
                        }}>
                          {badge.label}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {ev.origen}
                        </span>
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>
                        {ev.titulo}
                      </div>
                      <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '0.2rem' }}>
                        {ev.descripcion}
                      </div>
                      {ev.detalles && (
                        <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.3rem', fontStyle: 'italic' }}>
                          {ev.detalles}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: '0.75rem 1.25rem', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setDiaSeleccionadoModal(null)}
                  style={{
                    padding: '0.45rem 1rem',
                    background: '#6b1d33',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
