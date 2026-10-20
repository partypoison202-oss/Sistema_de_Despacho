import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import { formatAccion, getAccionBadgeStyle, interpretarCambioMantenimiento, parseDetallesModificacion, formatearFechaDiaMesAnio } from '../../utils/historialHelper';
import HistorialSearchBar from './HistorialSearchBar';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import './Historial.css';

export default function HistorialMantenimiento() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFecha, setSelectedFecha] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [activeTab, setActiveTab] = useState(location?.state?.tab || 'folios'); // 'folios', 'inicio', 'cambios', 'fin', 'checklists'
  const [verSoloFechaFolios, setVerSoloFechaFolios] = useState(true);
  const [filtroTipoFolio, setFiltroTipoFolio] = useState('todos'); // 'todos', 'con_incidencia', 'con_folio', 'sin_folio'
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (location?.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location?.state?.tab]);

  // Estados para Modal de Edición de Folio / Fecha
  const [modalEdicionOpen, setModalEdicionOpen] = useState(false);
  const [folioEditando, setFolioEditando] = useState(null);
  const [formFolio, setFormFolio] = useState('');
  const [formFechaFolio, setFormFechaFolio] = useState('');
  const [formIncidencia, setFormIncidencia] = useState('');
  const [formFechaIncidencia, setFormFechaIncidencia] = useState('');
  const [formMotivoCambio, setFormMotivoCambio] = useState('');
  const [isGuardandoEdicion, setIsGuardandoEdicion] = useState(false);

  // Estados para Modales de Historial de Modificaciones
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
  const [registroHistorialSeleccionado, setRegistroHistorialSeleccionado] = useState(null);
  const [modalGlobalHistorialOpen, setModalGlobalHistorialOpen] = useState(false);
  const [filtroHistorialGlobal, setFiltroHistorialGlobal] = useState('');
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isRefreshingInstant, setIsRefreshingInstant] = useState(false);

  // Estados y Query para Expediente Histórico Profundo por Unidad
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [tabExpediente, setTabExpediente] = useState('taller'); // 'taller' | 'bitacora'
  const [isConsultandoEco, setIsConsultandoEco] = useState(false);

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

  // 2. Obtener el historial estructurado diario (inicio, cambios, fin, checklists)
  const { data: datos = { inicio: [], cambios: [], fin: [], checklists: [] }, isLoading: isLoadingDatos, refetch: refetchDatos } = useQuery({
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
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });

  // 3. Trazabilidad histórica: Consulta de folios pasados con visualización cronológica
  const { data: foliosHistoricos = [], isLoading: isLoadingFolios, refetch: refetchFolios } = useQuery({
    queryKey: ['historial-folios'],
    queryFn: async () => {
      const url = `${API_BASE}/api/historial-operativo/mantenimiento-folios`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener el historial de folios');
      return response.json();
    },
    enabled: activeTab === 'folios' || modalGlobalHistorialOpen,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });

  // 4. Bitácora global de modificaciones de folios
  const { data: historialModificacionesGlobal = [], isLoading: isLoadingHistorialGlobal, refetch: refetchHistorialGlobal } = useQuery({
    queryKey: ['auditoria-folios-global'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-operativo/auditoria-folios`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener bitácora de modificaciones');
      return response.json();
    },
    enabled: modalGlobalHistorialOpen,
    staleTime: 0,
  });

  // 5. [ALTERNATIVA 1] Sin detección automática en el buscador: el expediente solo se abre al hacer clic en el ECO.
  // (La detección por buscador pertenece a la Alternativa 2: rama Mantenimiento-alt2)
  const ecoBuscado = useMemo(() => '', []);

  const { data: expedienteProfundo, isLoading: isLoadingExpediente } = useQuery({
    queryKey: ['expediente-profundo-unidad', ecoBuscado],
    queryFn: async () => {
      if (!ecoBuscado) return null;
      const response = await fetch(`${API_BASE}/api/historial-operativo/expediente-unidad/${ecoBuscado}`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: Boolean(ecoBuscado),
    staleTime: 60000,
  });

  // Escuchar eventos en vivo desde otras ventanas o pestañas (ej. cambios en DetalleUnidadMantenimiento)
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('unidades_estatus_channel');
        bc.onmessage = (event) => {
          if (event.data?.tipo === 'CAMBIO_ESTATUS') {
            refetchDatos?.();
            refetchFolios?.();
            refetchHistorialGlobal?.();
          }
        };
        return () => {
          bc.close();
        };
      } catch (e) {
        console.error('Error suscribiendo a BroadcastChannel en HistorialMantenimiento:', e);
      }
    }
  }, [refetchDatos, refetchFolios, refetchHistorialGlobal]);

  const cargando = isLoadingFechas || (isLoadingDatos && !!selectedFecha && activeTab !== 'folios') || (isLoadingFolios && activeTab === 'folios');

  const handleFechaChange = (f) => {
    setSelectedFecha(f);
    setIsDropdownOpen(false);
    setVerSoloFechaFolios(true);
  };

  const extraerFechaYMD = (val) => {
    if (!val) return '';
    const str = String(val).trim();
    if (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10);
    }
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    } catch (e) {}
    return '';
  };

  // Métricas KPI de Folios (calculadas estrictamente sobre unidades con folio o incidencia)
  const foliosValidosGlobal = (foliosHistoricos || []).filter(f => 
    (f.folio_mantenimiento && String(f.folio_mantenimiento).trim() !== '') || 
    (f.numero_incidencia && String(f.numero_incidencia).trim() !== '')
  );

  // Unidades correspondientes a la fecha seleccionada que SIGUEN en taller/percance.
  // Las que ya regresaron a Operación salen de esta vista y quedan solo en su Historial.
  const yaEnOperacion = (f) => {
    const est = String(f.estatus || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return est === 'operacion';
  };
  const foliosValidosDia = foliosValidosGlobal.filter(f => {
    if (yaEnOperacion(f)) return false;
    if (!selectedFecha) return true;
    const fFolio = extraerFechaYMD(f.fecha_folio_mantenimiento);
    const fInc = extraerFechaYMD(f.fecha_registro);
    return fFolio === selectedFecha || fInc === selectedFecha;
  });

  // Lista base según el modo de alcance activo (Por Día vs Todos los Días / Historial Completo)
  const foliosBase = verSoloFechaFolios ? foliosValidosDia : foliosValidosGlobal;

  const kpiTotalDia = foliosValidosDia.length;
  const kpiTotalGlobal = foliosValidosGlobal.length;

  const tieneFolioValido = (folio) => {
    if (!folio) return false;
    const str = String(folio).trim().toLowerCase();
    return str !== '' && str !== 's/f' && str !== 'sin folio' && str !== 'sin_folio' && str !== 'pendiente' && str !== 'n/a' && str !== 'null';
  };

  const kpiTotalActivo = foliosBase.length;
  const kpiConIncidenciaActivo = foliosBase.filter(f => f.numero_incidencia && String(f.numero_incidencia).trim() !== '').length;
  const kpiConFolioActivo = foliosBase.filter(f => tieneFolioValido(f.folio_mantenimiento)).length;
  const kpiSinFolioActivo = foliosBase.filter(f => !tieneFolioValido(f.folio_mantenimiento)).length;
  const kpiPendientesActivo = kpiSinFolioActivo; // compatibilidad
  const kpiModificaciones = foliosBase.reduce((acc, f) => acc + (f.auditoria ? f.auditoria.length : 0), 0);

  const getActiveData = () => {
    if (activeTab === 'inicio') return datos.inicio || [];
    if (activeTab === 'cambios') {
      return [...(datos.cambios || [])].sort((a, b) => {
        const timeA = new Date(a.hora || 0).getTime();
        const timeB = new Date(b.hora || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || 0) - (a.id || 0);
      });
    }
    if (activeTab === 'fin') return datos.fin || [];
    if (activeTab === 'checklists') return datos.checklists || [];
    if (activeTab === 'folios') {
      let lista = foliosBase;
      if (filtroTipoFolio === 'con_incidencia') {
        lista = lista.filter(f => f.numero_incidencia && String(f.numero_incidencia).trim() !== '');
      } else if (filtroTipoFolio === 'con_folio') {
        lista = lista.filter(f => tieneFolioValido(f.folio_mantenimiento));
      } else if (filtroTipoFolio === 'sin_folio' || filtroTipoFolio === 'pendientes') {
        lista = lista.filter(f => !tieneFolioValido(f.folio_mantenimiento));
      }

      // ORDENAMIENTO REQUERIDO:
      // 1. Si es por día (verSoloFechaFolios === true): "de la hora más vieja a la más reciente" -> ASCENDENTE
      // 2. Si es Historial Completo (verSoloFechaFolios === false): "del más nuevo al más viejo, los viejos abajo y los nuevos folios arriba" -> DESCENDENTE
      return [...lista].sort((a, b) => {
        const timeA = new Date(a.fecha_folio_mantenimiento || a.fecha_registro || 0).getTime();
        const timeB = new Date(b.fecha_folio_mantenimiento || b.fecha_registro || 0).getTime();

        if (verSoloFechaFolios) {
          if (timeA !== timeB) return timeA - timeB;
          return String(a.economico || '').localeCompare(String(b.economico || ''), undefined, { numeric: true });
        } else {
          if (timeB !== timeA) return timeB - timeA;
          return String(a.economico || '').localeCompare(String(b.economico || ''), undefined, { numeric: true });
        }
      });
    }
    return [];
  };

  const activeData = getActiveData();

  // Helper para mostrar falla o diagnóstico sin repetir innecesariamente la palabra "MANTENIMIENTO"
  const getFallaDetalle = (d) => {
    const falla = (d.falla || '').trim();
    const motivo = (d.motivo_estatus || '').trim();

    if (falla && falla.toUpperCase() !== 'MANTENIMIENTO' && falla.toUpperCase() !== 'PERCANCE') {
      return { texto: falla, esGenerico: false };
    }
    if (motivo && motivo.toUpperCase() !== 'MANTENIMIENTO' && motivo.toUpperCase() !== 'PERCANCE') {
      return { texto: motivo, esGenerico: false };
    }
    return { texto: 'Revisión general en taller', esGenerico: true };
  };

  // Filtrado local por buscador
  const datosFiltrados = activeData.filter(d => {
    if (!filtroBusqueda) return true;
    const busqueda = filtroBusqueda.toLowerCase();
    
    if (activeTab === 'cambios') {
      const ecoStr = String(d.economico || '').toLowerCase();
      const detallesStr = String(d.detalles || '').toLowerCase();
      const usrStr = String(d.usuario_nombre || '').toLowerCase();
      const accionStr = String(d.tipo_accion || '').toLowerCase();
      return ecoStr.includes(busqueda) || detallesStr.includes(busqueda) || usrStr.includes(busqueda) || accionStr.includes(busqueda);
    } else if (activeTab === 'checklists') {
      const tipoStr = d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()).toLowerCase() : '';
      const ecoStr = String(d.economico || '').toLowerCase();
      const cinchoStr = String(d.numero_cincho || '').toLowerCase();
      return tipoStr.includes(busqueda) || ecoStr.includes(busqueda) || cinchoStr.includes(busqueda);
    } else if (activeTab === 'folios') {
      const ecoStr = String(d.economico || '').toLowerCase();
      const folioStr = String(d.folio_mantenimiento || '').toLowerCase();
      const incStr = String(d.numero_incidencia || '').toLowerCase();
      return ecoStr.includes(busqueda) || folioStr.includes(busqueda) || incStr.includes(busqueda);
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
      worksheetData = datosFiltrados.map(d => {
        const folioItem = (foliosHistoricos || []).find(f => String(f.economico).padStart(3, '0') === String(d.economico).padStart(3, '0'));
        const dEnriched = {
          ...d,
          numero_incidencia: d.numero_incidencia || folioItem?.numero_incidencia || null,
          folio_mantenimiento: d.folio_mantenimiento || folioItem?.folio_mantenimiento || null,
          falla_reportada: d.falla_reportada || folioItem?.falla || folioItem?.motivo_estatus || null,
          diagnostico: d.diagnostico || folioItem?.diagnostico || null,
        };
        const info = interpretarCambioMantenimiento(dEnriched);
        return {
          'HORA': d.hora ? new Date(d.hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
          'ECO': d.economico || '',
          'TIPO DE UNIDAD': d.tipo_unidad ? String(d.tipo_unidad).toUpperCase() : '',
          'MODIFICACIÓN': info.modificacion,
          'VALOR ANTERIOR': info.valorAnterior,
          'VALOR NUEVO': info.valorNuevo,
          'DETALLES': info.detalles,
          'USUARIO': d.usuario_nombre || 'SISTEMA'
        };
      });
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
    } else if (activeTab === 'folios') {
      worksheetData = datosFiltrados.map(d => ({
        'TIPO': d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '',
        'ECO': d.economico || '',
        'N° INCIDENCIA': d.numero_incidencia || 'SIN INCIDENCIA',
        'N° DE FOLIO': d.folio_mantenimiento || 'SIN FOLIO',
        'FECHA INCIDENCIA': d.fecha_registro ? new Date(d.fecha_registro).toLocaleString('es-MX') : 'N/A',
        'FECHA FOLIO': d.fecha_folio_mantenimiento ? new Date(d.fecha_folio_mantenimiento).toLocaleString('es-MX') : 'N/A',
        'ESTATUS ACTUAL': (d.estatus || '').toUpperCase(),
        'FALLA / MOTIVO': (d.falla && d.falla.toUpperCase() !== 'MANTENIMIENTO') ? d.falla : (d.motivo_estatus && d.motivo_estatus.toUpperCase() !== 'MANTENIMIENTO' ? d.motivo_estatus : 'Revisión general en taller'),
        'DIAGNÓSTICO': d.diagnostico || '',
        'MODIFICACIONES REGISTRADAS': d.auditoria ? d.auditoria.length : 0
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
    XLSX.writeFile(workbook, `Historial_Mantenimiento_${activeTab.toUpperCase()}_${selectedFecha || 'General'}.xlsx`);
  };

  const handleExportToExcel = () => {
    if (datosFiltrados.length === 0 || isDownloadingExcel) return;
    setIsDownloadingExcel(true);
    try {
      exportToExcel();
    } catch (e) {
      console.error('Error al exportar Excel:', e);
    } finally {
      setTimeout(() => {
        setIsDownloadingExcel(false);
      }, 1200);
    }
  };

  const handleActualizarInstantaneo = () => {
    if (isRefreshingInstant) return;
    setIsRefreshingInstant(true);
    queryClient.invalidateQueries({ queryKey: ['historial-mantenimiento'] });
    queryClient.invalidateQueries({ queryKey: ['historial-folios'] });
    queryClient.invalidateQueries({ queryKey: ['auditoria-folios-global'] });
    refetchDatos?.();
    refetchFolios?.();
    setTimeout(() => {
      setIsRefreshingInstant(false);
    }, 850);
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

  const formatearFechaSimple = (fechaStr) => {
    if (!fechaStr) return '—';
    try {
      const f = new Date(fechaStr);
      if (isNaN(f.getTime())) return fechaStr;
      return f.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return fechaStr;
    }
  };

  const formatearFechaHora = (fechaStr) => {
    if (!fechaStr) return '—';
    try {
      const str = String(fechaStr).trim();
      const safeStr = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
      const f = new Date(safeStr);
      if (isNaN(f.getTime())) return fechaStr;

      const fechaParte = f.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });

      // Si la fecha original solo tiene formato YYYY-MM-DD o termina en 00:00:00 y no tiene hora real registrada
      const esCero = (f.getHours() === 0 && f.getMinutes() === 0) && (str.length <= 10 || str.endsWith('00:00:00') || str.endsWith('00:00'));
      if (esCero) {
        return fechaParte;
      }

      return fechaParte + ' • ' + f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return fechaStr;
    }
  };

  // Formatear etiqueta de tiempo corta y entendible (ej: "Estuvo < 1h", "Estuvo 3d", "Lleva 4d")
  const formatearTiempoCorto = (tiempoObj) => {
    if (!tiempoObj) return null;
    let txt = String(tiempoObj.texto || '').trim();
    txt = txt
      .replace(/menos de 1 hr/i, '< 1h')
      .replace(/menos de 1 hora/i, '< 1h')
      .replace(/(\d+)\s*días?/i, '$1d')
      .replace(/(\d+)\s*hrs?/i, '$1h')
      .replace(/(\d+)\s*horas?/i, '$1h');
    
    const eti = tiempoObj.etiqueta || (tiempoObj.es_operacion ? 'Estuvo' : 'Lleva');
    return `${eti} ${txt}`;
  };

  // Copiar al portapapeles con toast de confirmación
  const copiarAlPortapapeles = (texto, tipo = 'Folio') => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${tipo} copiado: ${texto}`,
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true
    });
  };

  // Calcular días de estancia en incidencia o folio
  const calcularDiasEstancia = (item) => {
    if (!item) return null;
    const fInicioStr = item.fecha_folio_mantenimiento || item.fecha_registro;
    if (!fInicioStr) return null;

    const dInicio = new Date(fInicioStr);
    if (isNaN(dInicio.getTime())) return null;

    const estatusNorm = String(item.estatus || '').trim().toLowerCase();
    const esOperacion = estatusNorm === 'operacion';

    let dFin = new Date();
    let etiqueta = 'Lleva';

    if (esOperacion) {
      etiqueta = 'Estuvo';
      if (item.auditoria && Array.isArray(item.auditoria)) {
        const cambioOp = item.auditoria.find(a => 
          String(a.estatus_nuevo || '').toLowerCase() === 'operacion' ||
          (a.detalles && a.detalles.toLowerCase().includes('operacion'))
        );
        if (cambioOp && cambioOp.hora) {
          const dt = new Date(cambioOp.hora);
          if (!isNaN(dt.getTime())) {
            dFin = dt;
          }
        }
      }
    }

    const diffMs = Math.max(0, dFin.getTime() - dInicio.getTime());
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));

    let texto = '';
    if (diffDias === 0) {
      texto = diffHoras <= 1 ? 'Menos de 1 hr' : `${diffHoras} hrs`;
    } else if (diffDias === 1) {
      texto = '1 día';
    } else {
      texto = `${diffDias} días`;
    }

    return {
      dias: diffDias,
      horas: diffHoras,
      texto,
      etiqueta,
      esOperacion
    };
  };

  // Abrir modal de edición de Folio / Fecha / Incidencia / Falla
  const abrirModalEdicion = (item) => {
    setFolioEditando(item);
    setFormIncidencia(item.numero_incidencia || '');

    // Extraer fecha limpia YYYY-MM-DD de la Incidencia (fecha_registro)
    let fIncVal = '';
    if (item.fecha_registro) {
      try {
        const str = String(item.fecha_registro).trim();
        if (str.length >= 10) {
          fIncVal = str.slice(0, 10);
        } else {
          const dt = new Date(str);
          if (!isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            fIncVal = `${y}-${m}-${d}`;
          }
        }
      } catch (e) {
        fIncVal = '';
      }
    }
    setFormFechaIncidencia(fIncVal);

    setFormFolio(item.folio_mantenimiento || '');
    let fVal = '';
    if (item.fecha_folio_mantenimiento) {
      try {
        const str = String(item.fecha_folio_mantenimiento).trim();
        if (str.length >= 10) {
          fVal = str.slice(0, 10);
        } else {
          const dt = new Date(str);
          if (!isNaN(dt.getTime())) {
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            fVal = `${year}-${month}-${day}`;
          }
        }
      } catch (err) {
        fVal = '';
      }
    }
    setFormFechaFolio(fVal);
    setFormMotivoCambio('');
    setModalEdicionOpen(true);
  };

  // Guardar cambios en el Folio / Fecha / Incidencia con bitácora de modificaciones
  const handleGuardarEdicionFolio = async (e) => {
    if (e) e.preventDefault();

    if (!formMotivoCambio.trim() || formMotivoCambio.trim().length < 5) {
      Swal.fire({
        title: 'Motivo Obligatorio',
        text: 'Debe ingresar una justificación obligatoria de al menos 5 caracteres para poder registrar este cambio en la bitácora.',
        icon: 'warning',
        confirmButtonColor: '#691B31'
      });
      return;
    }

    setIsGuardandoEdicion(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/historial-operativo/actualizar-folio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: folioEditando.id,
          numero_incidencia: formIncidencia.trim() ? formIncidencia.trim().toUpperCase() : null,
          fecha_registro: formFechaIncidencia ? `${formFechaIncidencia} 12:00:00` : null,
          folio_mantenimiento: formFolio.trim() ? formFolio.trim().toUpperCase() : null,
          fecha_folio_mantenimiento: formFechaFolio ? `${formFechaFolio} 12:00:00` : null,
          motivo_auditoria: formMotivoCambio.trim().toUpperCase()
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Error al actualizar el registro');
      }

      Swal.fire({
        title: '¡Registro Actualizado!',
        text: resData.message || 'El registro fue actualizado exitosamente y asentado en la bitácora.',
        icon: 'success',
        confirmButtonColor: '#691B31'
      });

      setModalEdicionOpen(false);
      setFolioEditando(null);

      // Invalidar queries relevantes para recarga inmediata
      queryClient.invalidateQueries({ queryKey: ['historial-folios'] });
      queryClient.invalidateQueries({ queryKey: ['historial-mantenimiento'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria-folios-global'] });
      queryClient.invalidateQueries({ queryKey: ['pendientes-mantenimiento'] });
    } catch (err) {
      Swal.fire({
        title: 'Error de Actualización',
        text: err.message || 'No fue posible guardar los cambios.',
        icon: 'error',
        confirmButtonColor: '#691B31'
      });
    } finally {
      setIsGuardandoEdicion(false);
    }
  };

  // Abrir modal de historial de cambios para una unidad
  const abrirModalHistorial = (item) => {
    setRegistroHistorialSeleccionado(item);
    setModalHistorialOpen(true);
  };

  // Abrir modal de expediente histórico completo de una unidad (Consulta Profunda)
  const abrirExpedienteCompleto = (expData) => {
    setExpedienteSeleccionado(expData);
    setTabExpediente('taller');
    setModalExpedienteOpen(true);
  };

  const consultarExpedientePorEco = async (ecoNum) => {
    if (!ecoNum) return;
    setIsConsultandoEco(true);
    try {
      const response = await fetch(`${API_BASE}/api/historial-operativo/expediente-unidad/${ecoNum}`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al consultar');
      const data = await response.json();
      if (data.found) {
        abrirExpedienteCompleto(data);
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Unidad sin registros',
          text: data.message || `No se encontró información histórica para el económico ${ecoNum}`,
          confirmButtonColor: '#691B31'
        });
      }
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Error de consulta',
        text: 'No se pudo cargar el expediente de la unidad.',
        confirmButtonColor: '#691B31'
      });
    } finally {
      setIsConsultandoEco(false);
    }
  };

  // Renderizador visual y estructurado de los detalles de modificación de bitácora
  const renderDetallesModificacionGlobal = (rawDetalles, aud) => {
    const parsed = parseDetallesModificacion(rawDetalles);

    if (parsed.tipo === 'estructurado') {
      return (
        <div className="detalle-audit-card">
          {parsed.contextTitle && (
            <div className="detalle-context-pill">
              {parsed.contextTitle}
            </div>
          )}

          {parsed.diffs && parsed.diffs.length > 0 && (
            <div className="detalle-diffs-grid">
              {parsed.diffs.map((diff, idx) => (
                <div key={idx} className="detalle-diff-row">
                  <div className="diff-field-header">
                    <span className="diff-field-icon">
                      {diff.campo.toLowerCase().includes('folio') ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      ) : diff.campo.toLowerCase().includes('fecha') ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      )}
                    </span>
                    <span className="diff-field-name">{diff.campo}:</span>
                  </div>

                  <div className="diff-values-flow">
                    <span className={`diff-tag diff-tag-old ${diff.anterior.toUpperCase().startsWith('SIN ') ? 'is-empty' : ''}`} title="Valor anterior">
                      {diff.anterior}
                    </span>
                    <span className="diff-arrow-separator">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </span>
                    <span className={`diff-tag diff-tag-new ${diff.nuevo.toUpperCase().startsWith('SIN ') ? 'is-empty' : ''}`} title="Valor nuevo actualizado">
                      {diff.nuevo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {parsed.motivo && (
            <div className="detalle-motivo-box">
              <div className="motivo-badge-title">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Motivo / Justificación:</span>
              </div>
              <p className="motivo-quote-text">"{parsed.motivo}"</p>
            </div>
          )}

          {parsed.extra && (
            <div className="detalle-extra-text">{parsed.extra}</div>
          )}
        </div>
      );
    }

    if (parsed.tipo === 'asignacion_incidencia') {
      return (
        <div className="detalle-audit-card">
          <div className="detalle-diff-row">
            <div className="diff-field-header">
              <span className="diff-field-name">Incidencia Asignada:</span>
            </div>
            <div className="diff-values-flow">
              <span className="diff-tag diff-tag-new">{parsed.incidencia}</span>
            </div>
          </div>
          {parsed.falla && (
            <div className="detalle-motivo-box" style={{ marginTop: '0.35rem' }}>
              <div className="motivo-badge-title">Falla Reportada:</div>
              <p className="motivo-quote-text">"{parsed.falla}"</p>
            </div>
          )}
        </div>
      );
    }

    if (parsed.tipo === 'asignacion_folio') {
      return (
        <div className="detalle-audit-card">
          <div className="detalle-diff-row">
            <div className="diff-field-header">
              <span className="diff-field-name">Folio Registrado:</span>
            </div>
            <div className="diff-values-flow">
              <span className="diff-tag diff-tag-new">{parsed.folio}</span>
            </div>
          </div>
        </div>
      );
    }

    // Default / Simple text
    return (
      <div className="detalle-audit-card">
        {aud?.estatus_anterior && aud?.estatus_nuevo ? (
          <div className="detalle-diff-row" style={{ marginBottom: '0.3rem' }}>
            <div className="diff-field-header">
              <span className="diff-field-name">Estatus:</span>
            </div>
            <div className="diff-values-flow">
              <span className="diff-tag diff-tag-old">{aud.estatus_anterior}</span>
              <span className="diff-arrow-separator">→</span>
              <span className="diff-tag diff-tag-new">{aud.estatus_nuevo}</span>
            </div>
          </div>
        ) : null}
        <span className="detalle-simple-text">{parsed.texto || rawDetalles}</span>
      </div>
    );
  };

  return (
    <div className="historial-page">
      <Header title="Historial Mantenimiento" hideBackButton={false} />

      <main className="historial-content">
        {/* Pestañas de Selección Superior - Estilo Pestañas Institucionales al Tope */}
        <div className="historial-top-tabs-wrapper">
          <div className="historial-top-tabs">
            <button
              type="button"
              className={`historial-top-tab-btn ${activeTab === 'folios' ? 'active' : ''}`}
              onClick={() => setActiveTab('folios')}
            >
              Revisión e Historial de Folios Previos
            </button>
            <button
              type="button"
              className={`historial-top-tab-btn ${activeTab === 'inicio' ? 'active' : ''}`}
              onClick={() => setActiveTab('inicio')}
            >
              Estado Inicial (Inicio)
            </button>
            <button
              type="button"
              className={`historial-top-tab-btn ${activeTab === 'cambios' ? 'active' : ''}`}
              onClick={() => setActiveTab('cambios')}
            >
              Cambios en el Transcurso (Mantenimiento)
            </button>
            <button
              type="button"
              className={`historial-top-tab-btn ${activeTab === 'fin' ? 'active' : ''}`}
              onClick={() => setActiveTab('fin')}
            >
              Estado Final (Fin)
            </button>
          </div>
        </div>

        <div className={`historial-header ${isDropdownOpen ? 'dropdown-open-active' : ''}`}>
          <div className="historial-header-title-box">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              Registro Diario de Mantenimiento
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.86rem', fontWeight: 500 }}>
              Supervisión de operaciones de taller, hojas de chequeo y registro histórico de folios
            </p>
          </div>

          <div className="historial-toolbar-controls">
            {/* Si estamos en Revisión e Historial de Folios, selector de alcance justo a lado de la fecha */}
            {activeTab === 'folios' && (
              <div className="header-scope-selector-wrapper">
                <div className="hero-segmented-selector header-scope-selector">
                  <button
                    type="button"
                    className={`seg-btn ${!verSoloFechaFolios ? 'active' : ''}`}
                    onClick={() => {
                      setVerSoloFechaFolios(false);
                      setFiltroTipoFolio('todos');
                    }}
                    title="Ver historial acumulado de todos los días y meses"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                    </svg>
                    <span>Historial Completo</span>
                    <span className="seg-count">{kpiTotalGlobal}</span>
                  </button>

                  <button
                    type="button"
                    className={`seg-btn ${verSoloFechaFolios ? 'active' : ''}`}
                    onClick={() => {
                      setVerSoloFechaFolios(true);
                      setFiltroTipoFolio('todos');
                    }}
                    title={`Ver folios de la fecha seleccionada (${selectedFecha ? formatearFechaDiaMesAnio(selectedFecha) : 'Día'})`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>Por Día</span>
                    <span className={`seg-count ${kpiTotalDia === 0 ? 'count-zero' : ''}`}>{kpiTotalDia}</span>
                  </button>
                </div>
              </div>
            )}

            <div className={`historial-date-control ${activeTab === 'folios' && !verSoloFechaFolios ? 'date-control-subtle' : ''}`}>
              <span className="fecha-control-label">Fecha:</span>
              <div className="custom-dropdown-container" ref={dropdownRef}>
                <button 
                  type="button" 
                  className={`custom-dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
                  onClick={() => !cargando && setIsDropdownOpen(!isDropdownOpen)}
                  disabled={cargando}
                  style={{ minWidth: '150px' }}
                  title="Seleccionar fecha de operación (Día / Mes / Año)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.45rem', color: '#691B31', flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span style={{ fontWeight: 800, letterSpacing: '0.02em', color: '#1e293b' }}>
                    {selectedFecha ? formatearFechaDiaMesAnio(selectedFecha) : 'SELECCIONAR'}
                  </span>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 'auto', width: '16px', height: '16px', color: '#64748b' }}>
                    <path d="M7 10l5 5 5-5H7z" />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="custom-dropdown-menu" style={{ zIndex: 1100, minWidth: '165px' }}>
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {fechas.map(f => (
                        <button
                          key={f}
                          type="button"
                          className={`custom-dropdown-item ${selectedFecha === f ? 'selected' : ''}`}
                          onClick={() => handleFechaChange(f)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem' }}
                        >
                          <span style={{ fontWeight: selectedFecha === f ? 800 : 600, color: selectedFecha === f ? '#691B31' : '#334155' }}>
                            {formatearFechaDiaMesAnio(f)}
                          </span>
                          {selectedFecha === f && (
                            <span style={{ color: '#691B31', fontSize: '0.8rem', fontWeight: 800 }}>✓</span>
                          )}
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

            <div className="historial-action-buttons-group">
              {/* Botón Descargar Excel con Animación Táctil y Check de Éxito */}
              <button 
                type="button"
                className={`export-excel-btn ${isDownloadingExcel ? 'btn-download-success' : ''}`} 
                onClick={handleExportToExcel}
                disabled={cargando || datosFiltrados.length === 0 || isDownloadingExcel}
                title="Descargar Historial en Excel"
              >
                {isDownloadingExcel ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="pop-check-icon">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>¡Descargado!</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Descargar Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SECCIÓN: Revisión e Historial de Folios Previos - Filtros Rápidos */}
        {activeTab === 'folios' && (
          <div className="folios-premium-container" style={{ marginBottom: '0.85rem' }}>
            <div className="folios-controls-panel">
              <div className="folios-filter-chips">
                <span className="filter-chips-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                  Filtrar:
                </span>
                <button
                  type="button"
                  className={`chip-btn ${filtroTipoFolio === 'todos' ? 'active' : ''}`}
                  onClick={() => setFiltroTipoFolio('todos')}
                >
                  Todos <span className="chip-count">{kpiTotalActivo}</span>
                </button>
                <button
                  type="button"
                  className={`chip-btn ${filtroTipoFolio === 'con_incidencia' ? 'active' : ''}`}
                  onClick={() => setFiltroTipoFolio('con_incidencia')}
                >
                  <span className="chip-dot" style={{ backgroundColor: '#A02142' }}></span>
                  Con Incidencia <span className="chip-count">{kpiConIncidenciaActivo}</span>
                </button>
                <button
                  type="button"
                  className={`chip-btn ${filtroTipoFolio === 'con_folio' ? 'active' : ''}`}
                  onClick={() => setFiltroTipoFolio('con_folio')}
                >
                  <span className="chip-dot dot-amber"></span>
                  Con Folio <span className="chip-count">{kpiConFolioActivo}</span>
                </button>
                <button
                  type="button"
                  className={`chip-btn ${filtroTipoFolio === 'sin_folio' || filtroTipoFolio === 'pendientes' ? 'active' : ''}`}
                  onClick={() => setFiltroTipoFolio('sin_folio')}
                  title="Unidades registradas sin folio de mantenimiento asignado"
                >
                  <span className="chip-dot" style={{ backgroundColor: '#e11d48' }}></span>
                  Sin Folio <span className="chip-count">{kpiSinFolioActivo}</span>
                </button>
              </div>

              {/* Botones al final a la derecha: Actualizar al lado de Parque Vehicular */}
              <div className="folios-actions-end">
                <button 
                  type="button"
                  className={`btn-actualizar-instantaneo ${isRefreshingInstant ? 'btn-active-pressed' : ''}`} 
                  onClick={handleActualizarInstantaneo}
                  disabled={cargando || isRefreshingInstant}
                  title="Recargar y sincronizar datos al instante"
                >
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={cargando || isRefreshingInstant ? 'spinning-refresh' : ''}
                  >
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  <span>{cargando || isRefreshingInstant ? 'Actualizando...' : 'Actualizar'}</span>
                </button>

                <button 
                  type="button"
                  className="btn-ir-parque-vehicular" 
                  onClick={() => navigate('/mantenimiento')}
                  title="Ir a Mantenimiento Parque Vehicular"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
                  </svg>
                  <span>Parque Vehicular</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción para las otras pestañas */}
        {activeTab !== 'folios' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              type="button"
              className={`btn-actualizar-instantaneo ${isRefreshingInstant ? 'btn-active-pressed' : ''}`} 
              onClick={handleActualizarInstantaneo}
              disabled={cargando || isRefreshingInstant}
              title="Recargar y sincronizar datos al instante"
            >
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={cargando || isRefreshingInstant ? 'spinning-refresh' : ''}
              >
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>{cargando || isRefreshingInstant ? 'Actualizando...' : 'Actualizar'}</span>
            </button>

            <button 
              type="button"
              className="btn-ir-parque-vehicular" 
              onClick={() => navigate('/mantenimiento')}
              title="Ir a Mantenimiento Parque Vehicular"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
              </svg>
              <span>Parque Vehicular</span>
            </button>
          </div>
        )}

        {/* Buscador Contextual Unificado */}
        <HistorialSearchBar
          value={filtroBusqueda}
          onChange={setFiltroBusqueda}
          placeholder={
            activeTab === 'cambios'
              ? 'Buscar por económico, tipo de unidad, modificación o detalles...'
              : activeTab === 'checklists'
              ? 'Buscar por económico, tipo de unidad o número de cincho...'
              : activeTab === 'folios'
              ? 'Buscar por económico, número de incidencia o número de folio...'
              : 'Buscar por económico, tipo, motivo de estatus o falla reportada...'
          }
          totalCount={activeData.length}
          filteredCount={datosFiltrados.length}
        />

        {/* Guía Anti Capa 8: Aclaración explícita de campos permitidos */}
        {activeTab === 'folios' && (
          <div className="search-anti-capa8-hint" style={{ marginTop: '-6px', padding: '2px 6px', background: 'transparent', border: 'none' }}>
            <span className="search-hint-text" style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Puedes buscar por: <strong>Económico</strong> · <strong>Incidencia</strong> · <strong>Folio</strong>
            </span>
          </div>
        )}

        {/* Banner de Consulta Histórica Profunda al buscar un Económico */}
        {activeTab === 'folios' && ecoBuscado && expedienteProfundo?.found && (
          <div className="deep-search-alert-banner">
            <div className="deep-search-alert-left">
              <span className="deep-search-pill-eco">ECO {expedienteProfundo.unidad.numero_eco}</span>
              <span className="deep-search-pill-tipo">{expedienteProfundo.unidad.tipo_transporte}</span>
              <span className={`deep-search-pill-status estatus-${String(expedienteProfundo.estadisticas.estatus_actual || 'operacion').toLowerCase()}`}>
                <span className="pulse-dot"></span>
                {String(expedienteProfundo.estadisticas.estatus_actual || 'Operación').toUpperCase()}
              </span>
              <span className="deep-search-alert-text">
                {expedienteProfundo.estadisticas.estatus_actual === 'mantenimiento' ? (
                  <>Unidad actualmente en <strong>Taller</strong> {expedienteProfundo.estadisticas.folio_actual ? `(Folio activo: ${expedienteProfundo.estadisticas.folio_actual})` : '(Sin folio asignado hoy)'}</>
                ) : (
                  <>Unidad actualmente en <strong>{expedienteProfundo.estadisticas.estatus_actual.toUpperCase()}</strong> {expedienteProfundo.estado_actual?.ruta ? `• Ruta ${expedienteProfundo.estado_actual.ruta}` : ''}</>
                )}
                {expedienteProfundo.estadisticas.total_ingresos_taller > 0 ? (
                  <> • <strong>{expedienteProfundo.estadisticas.total_ingresos_taller}</strong> ingresos históricos a taller</>
                ) : (
                  <> • <strong>{expedienteProfundo.estadisticas.total_movimientos_bitacora}</strong> movimientos en bitácora</>
                )}
              </span>
            </div>
            <button
              type="button"
              className="btn-deep-search-pill"
              onClick={() => abrirExpedienteCompleto(expedienteProfundo)}
              title="Abrir expediente histórico completo de esta unidad"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Ver Expediente Histórico</span>
            </button>
          </div>
        )}

        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ marginBottom: '1.25rem' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Cargando información...</h3>
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
                {datosFiltrados.map((d, i) => {
                  const folioItem = (foliosHistoricos || []).find(f => String(f.economico).padStart(3, '0') === String(d.economico).padStart(3, '0'));
                  const dEnriched = {
                    ...d,
                    numero_incidencia: d.numero_incidencia || folioItem?.numero_incidencia || null,
                    folio_mantenimiento: d.folio_mantenimiento || folioItem?.folio_mantenimiento || null,
                    falla_reportada: d.falla_reportada || folioItem?.falla || folioItem?.motivo_estatus || null,
                    diagnostico: d.diagnostico || folioItem?.diagnostico || null,
                  };
                  const info = interpretarCambioMantenimiento(dEnriched);
                  return (
                    <tr key={d.id || i}>
                      <td style={{ fontWeight: '700', color: '#64748b' }}>{formatearHora(d.hora)}</td>
                      <td style={{ fontWeight: '800', color: '#0f172a' }}>{d.economico}</td>
                      <td style={{ fontWeight: '600' }}>{d.tipo_unidad ? String(d.tipo_unidad).toUpperCase() : '-'}</td>
                      <td>
                        <span className="estatus-badge" style={info.badgeStyle}>
                          {info.modificacion}
                        </span>
                      </td>
                      <td>
                        {info.valorAnterior === 'OPERACION' ? (
                          <span style={{ fontWeight: '700', color: '#dc2626' }}>OPERACION</span>
                        ) : (
                          <span style={{ fontWeight: '700', color: '#6F7271' }}>{info.valorAnterior}</span>
                        )}
                      </td>
                      <td>
                        {info.tipoPillNuevo === 'incidencia' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '800', color: '#A02142', background: '#fdf2f4', padding: '2px 8px', borderRadius: '5px', border: '1px solid #fecdd3' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#A02142' }}></span>
                            {info.valorNuevo}
                          </span>
                        ) : info.tipoPillNuevo === 'folio' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '800', color: '#BC955B', background: '#fdfbf7', padding: '2px 8px', borderRadius: '5px', border: '1.5px solid #DDC9A3' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#BC955B' }}></span>
                            {info.valorNuevo}
                          </span>
                        ) : info.tipoPillNuevo === 'permanece' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#691B31', background: '#fdf2f4', padding: '3px 8px', borderRadius: '5px', border: '1px solid #fecdd3', fontSize: '0.78rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#691B31' }}></span>
                            {info.valorNuevo}
                          </span>
                        ) : info.tipoPillNuevo === 'mantenimiento' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '5px', border: '1px solid #fcd34d', fontSize: '0.78rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#b45309' }}></span>
                            MANTENIMIENTO
                          </span>
                        ) : (
                          <span style={{ fontWeight: '700', color: info.valorNuevo === 'OPERACION' ? '#16a34a' : '#0f172a' }}>
                            {info.valorNuevo}
                          </span>
                        )}
                      </td>
                      <td style={{ wordBreak: 'break-word', whiteSpace: 'normal', color: '#334155', fontSize: '0.86rem' }}>
                        {info.detalles}
                      </td>
                      <td style={{ fontWeight: '600' }}>{d.usuario_nombre || 'SISTEMA'}</td>
                    </tr>
                  );
                })}
                {datosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay modificaciones registradas de Mantenimiento en este día.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'folios' ? (
          /* TAB: Revisión e Historial de Folios Previos */
          <div className="table-responsive table-folios-luxury">
            <table className="historial-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', minWidth: '75px' }}>TIPO</th>
                  <th style={{ width: '50px', minWidth: '45px', textAlign: 'center' }}>ECO</th>
                  <th style={{ width: '110px', minWidth: '105px' }}>N° INCIDENCIA</th>
                  <th style={{ width: '110px', minWidth: '105px' }}>N° FOLIO</th>
                  <th style={{ width: '275px', minWidth: '265px' }}>CRONOLOGÍA (INC / FOLIO)</th>
                  <th style={{ minWidth: '150px' }}>FALLA & DIAGNÓSTICO</th>
                  <th style={{ width: '120px', minWidth: '115px', textAlign: 'center' }}>ESTATUS</th>
                  <th style={{ textAlign: 'center', width: '165px', minWidth: '160px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((d) => {
                  const fallaInfo = getFallaDetalle(d);
                  return (
                    <tr key={d.id} className="tr-folio-item">
                      {/* 1. Tipo (Texto limpio tipo Estado Inicial) */}
                      <td style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {d.tipo ? (String(d.tipo).toUpperCase() === 'URBANUS' ? 'URBANUSS' : String(d.tipo).toUpperCase()) : '-'}
                      </td>

                      {/* 2. ECO (Texto limpio con clic para ver expediente completo) */}
                      <td style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                         <span style={{ fontWeight: 800 }}>{d.economico}</span>
                      </td>

                      {/* 3. N° Incidencia (LUEGO INCIDENCIAS) */}
                      <td>
                        {d.numero_incidencia ? (
                          <div 
                            className="luxury-incidencia-pill"
                            onClick={() => copiarAlPortapapeles(d.numero_incidencia, 'Incidencia')}
                            title="Haga clic para copiar la incidencia al portapapeles"
                          >
                            <span>{d.numero_incidencia}</span>
                            <span className="incidencia-copy-icon" title="Copiar">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </span>
                          </div>
                        ) : (
                          <span className="sin-incidencia-tag">— Sin Incidencia —</span>
                        )}
                      </td>

                      {/* 4. Folio Mantenimiento (LUEGO LOS FOLIOS) */}
                      <td>
                        {d.folio_mantenimiento ? (
                          <div 
                            className="luxury-folio-pill" 
                            onClick={() => copiarAlPortapapeles(d.folio_mantenimiento, 'Folio')}
                            title="Haga clic para copiar el folio al portapapeles"
                          >
                            <span>{d.folio_mantenimiento}</span>
                            <span className="folio-copy-icon" title="Copiar">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </span>
                          </div>
                        ) : (
                          <div className="luxury-folio-sin-asignar-wrapper">
                            <button
                              type="button"
                              className="btn-quick-asignar"
                              onClick={() => abrirModalEdicion(d)}
                              title="Asignar folio físico emitido por taller"
                            >
                              + Asignar
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 5. Cronología (Incidencia / Folio con tiempos independientes) */}
                      <td>
                        <div className="fechas-dual-column">
                          <div className="fecha-dual-row" title="Fecha y hora de la incidencia registrada">
                            <span className="fecha-tag-pill">Inc:</span>
                            <span className="fecha-dual-text bold">{formatearFechaHora(d.fecha_registro)}</span>
                            {d.tiempo_incidencia && (
                              <span 
                                className={`tiempo-tag-pill ${d.tiempo_incidencia.es_operacion ? 'resuelto' : (d.tiempo_incidencia.dias >= 3 ? 'critico' : 'activo')}`}
                                title={`Tiempo en incidencia: ${d.tiempo_incidencia.texto}`}
                              >
                                {formatearTiempoCorto(d.tiempo_incidencia)}
                              </span>
                            )}
                          </div>

                          <div className="fecha-dual-row" title="Fecha oficial del folio emitido en taller">
                            <span className="fecha-tag-pill muted">Folio:</span>
                            <span className="fecha-dual-text">{d.fecha_folio_mantenimiento ? formatearFechaHora(d.fecha_folio_mantenimiento) : 'Pendiente'}</span>
                            {d.folio_mantenimiento && d.tiempo_folio ? (
                              <span 
                                className={`tiempo-tag-pill ${d.tiempo_folio.es_operacion ? 'resuelto' : (d.tiempo_folio.dias >= 3 ? 'critico' : 'activo')}`}
                                title={`Tiempo con folio emitido: ${d.tiempo_folio.texto}`}
                              >
                                {formatearTiempoCorto(d.tiempo_folio)}
                              </span>
                            ) : (
                              <span className="tiempo-tag-pill sin-folio">Sin folio</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 6. Falla y Diagnóstico */}
                      <td>
                        <div className="falla-luxury-box">
                          <span className={`falla-text-main ${fallaInfo.esGenerico ? 'falla-text-muted' : ''}`}>
                            {fallaInfo.texto}
                          </span>
                          {d.diagnostico && (
                            <div className="diagnostico-subtext-pill" title={d.diagnostico}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                              </svg>
                              <span>Diag: {d.diagnostico}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. Estatus */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`estatus-badge estatus-${String(d.estatus || 'mantenimiento').toLowerCase()}`}>
                          <span className="pulse-dot"></span>
                          {String(d.estatus || 'Mantenimiento').toUpperCase()}
                        </span>
                      </td>

                      {/* 8. Acciones (Ajustadas para caber perfectamente sin corte) */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="luxury-actions-cell">
                          <button
                            type="button"
                            className="btn-luxury-action btn-luxury-edit"
                            onClick={() => abrirModalEdicion(d)}
                            title="Actualizar incidencia, folio o fecha con justificación obligatoria"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn-luxury-action btn-luxury-history"
                            onClick={() => abrirModalHistorial(d)}
                            title="Consultar historial de cambios para esta unidad"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Historial
                            {d.auditoria && d.auditoria.length > 0 && (
                              <span className="mini-history-count">{d.auditoria.length}</span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {datosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: '3.5rem 2rem', color: '#94a3b8' }}>
                      {ecoBuscado && expedienteProfundo?.found ? (
                        <div className="deep-search-empty-box">
                          <div className="deep-search-empty-badge-header">
                            <span className="deep-search-eco-big">ECO {expedienteProfundo.unidad.numero_eco}</span>
                            <span className="deep-search-tipo-big">{expedienteProfundo.unidad.tipo_transporte}</span>
                            <span className={`estatus-badge estatus-${String(expedienteProfundo.estadisticas.estatus_actual || 'operacion').toLowerCase()}`}>
                              <span className="pulse-dot"></span>
                              {String(expedienteProfundo.estadisticas.estatus_actual || 'Operación').toUpperCase()}
                            </span>
                          </div>

                          <h4 style={{ margin: '0.85rem 0 0.35rem 0', fontWeight: 800, color: '#1e293b', fontSize: '1.2rem' }}>
                            {expedienteProfundo.estadisticas.estatus_actual === 'mantenimiento'
                              ? `El ECO ${expedienteProfundo.unidad.numero_eco} está en Taller pero sin folio asignado hoy`
                              : `El ECO ${expedienteProfundo.unidad.numero_eco} no tiene folios ni fallas activas hoy`}
                          </h4>

                          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#64748b', maxWidth: '560px', lineHeight: 1.55 }}>
                            {expedienteProfundo.estadisticas.estatus_actual !== 'mantenimiento' ? (
                              <>
                                Esta unidad se encuentra actualmente en estatus <strong>{expedienteProfundo.estadisticas.estatus_actual.toUpperCase()}</strong>
                                {expedienteProfundo.estado_actual?.ruta ? ` cubriendo la Ruta ${expedienteProfundo.estado_actual.ruta}` : ''}
                                {expedienteProfundo.estado_actual?.nombre_conductor ? ` con el operador ${expedienteProfundo.estado_actual.nombre_conductor}` : ''}.
                                <br />
                              </>
                            ) : null}
                            {expedienteProfundo.estadisticas.total_ingresos_taller > 0 || expedienteProfundo.estadisticas.total_movimientos_bitacora > 0 ? (
                              <>
                                Cuenta con un expediente registrado de <strong>{expedienteProfundo.estadisticas.total_ingresos_taller} ingresos históricos a taller</strong> y <strong>{expedienteProfundo.estadisticas.total_movimientos_bitacora} movimientos en bitácora</strong>.
                              </>
                            ) : (
                              'No cuenta con ingresos pasados por fallas mecánicas registrados en el sistema.'
                            )}
                          </p>

                          <button
                            type="button"
                            className="btn-ver-expediente-primary"
                            onClick={() => abrirExpedienteCompleto(expedienteProfundo)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>Consultar Expediente Histórico Completo del ECO {expedienteProfundo.unidad.numero_eco}</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <div className="empty-state-icon-circle">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8"></circle>
                              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                          </div>
                          <h4 style={{ margin: '0.75rem 0 0 0', fontWeight: 800, color: '#334155', fontSize: '1.1rem' }}>
                            No se encontraron registros de folios
                          </h4>
                          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: '#64748b', maxWidth: '480px', lineHeight: 1.45 }}>
                            {filtroBusqueda.trim() ? (
                              <>
                                No hay resultados para "<strong>{filtroBusqueda}</strong>". Recuerda que la búsqueda solo opera por <strong>Económico</strong>, <strong>N° de Incidencia</strong> o <strong>N° de Folio</strong>.
                              </>
                            ) : verSoloFechaFolios ? (
                              <>
                                No se registraron folios ni incidencias el día <strong>{selectedFecha ? formatearFechaDiaMesAnio(selectedFecha) : 'seleccionado'}</strong>.
                              </>
                            ) : (
                              'No hay económicos que coincidan con los filtros seleccionados.'
                            )}
                          </p>

                          {/* Botón directo para pasar a Historial Completo con un solo clic */}
                          {verSoloFechaFolios && kpiTotalGlobal > 0 && !filtroBusqueda.trim() && (
                            <button
                              type="button"
                              className="btn-ir-historial-completo-empty"
                              onClick={() => {
                                setVerSoloFechaFolios(false);
                                setFiltroTipoFolio('todos');
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                              </svg>
                              <span>Ver Historial Completo ({kpiTotalGlobal} folios disponibles)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
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
                      <span className={`estatus-badge estatus-${String(d.estatus || 'mantenimiento').toLowerCase()}`}>
                        {String(d.estatus || '').toUpperCase()}
                      </span>
                    </td>
                    <td>{d.motivo_estatus || '-'}</td>
                    <td>{d.falla || '-'}</td>
                  </tr>
                ))}
                {datosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay registros de económicos en mantenimiento para este estado de la fecha seleccionada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL: Edición y Actualización de Incidencia / Folio / Fecha */}
      {modalEdicionOpen && folioEditando && (
        <div className="modal-backdrop-luxury" onClick={() => !isGuardandoEdicion && setModalEdicionOpen(false)}>
          <div className="modal-card-luxury" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-luxury">
              <div className="header-accent-bar"></div>
              <div className="header-title-box">
                <span className="modal-pill-tag">Registro Obligatorio</span>
                <h3 className="modal-main-title">Actualizar Folio y Datos de Registro</h3>
                <p className="modal-subtitle">
                  ECO <strong>{folioEditando.economico}</strong> • {folioEditando.tipo || 'Unidad'} • Estatus actual: <strong style={{ color: '#b45309' }}>{String(folioEditando.estatus).toUpperCase()}</strong>
                </p>
              </div>
              <button 
                type="button" 
                className="btn-modal-close"
                onClick={() => !isGuardandoEdicion && setModalEdicionOpen(false)}
                disabled={isGuardandoEdicion}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarEdicionFolio} className="modal-form-luxury">
              <div className="modal-body-luxury">
                {/* Tiempos Independientes de Incidencia y Folio */}
                <div className="modal-estancia-dual-container">
                  {folioEditando.tiempo_incidencia && (
                    <div className={`modal-estancia-card ${folioEditando.tiempo_incidencia.es_operacion ? 'resuelto' : (folioEditando.tiempo_incidencia.dias >= 3 ? 'critico' : 'activo')}`}>
                      <div className="estancia-card-header">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Tiempo en Incidencia</span>
                      </div>
                      <div className="estancia-card-main">
                        <strong>{folioEditando.tiempo_incidencia.etiqueta}: {folioEditando.tiempo_incidencia.texto}</strong>
                      </div>
                      <span className="estancia-card-sub">
                        {folioEditando.tiempo_incidencia.es_operacion ? 'Registrada el ' : 'Desde el '}
                        {formatearFechaSimple(folioEditando.fecha_registro)}
                      </span>
                    </div>
                  )}

                  <div className={`modal-estancia-card ${folioEditando.folio_mantenimiento && folioEditando.tiempo_folio ? (folioEditando.tiempo_folio.es_operacion ? 'resuelto' : (folioEditando.tiempo_folio.dias >= 3 ? 'critico' : 'activo')) : 'sin-folio'}`}>
                    <div className="estancia-card-header">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>Tiempo con Folio Físico</span>
                    </div>
                    <div className="estancia-card-main">
                      {folioEditando.folio_mantenimiento && folioEditando.tiempo_folio ? (
                        <strong>{folioEditando.tiempo_folio.etiqueta}: {folioEditando.tiempo_folio.texto}</strong>
                      ) : (
                        <strong style={{ color: '#64748b' }}>Pendiente de Asignar</strong>
                      )}
                    </div>
                    <span className="estancia-card-sub">
                      {folioEditando.folio_mantenimiento && folioEditando.fecha_folio_mantenimiento 
                        ? `${folioEditando.tiempo_folio?.es_operacion ? 'Emitido el ' : 'Desde el '}${formatearFechaSimple(folioEditando.fecha_folio_mantenimiento)}`
                        : 'Sin folio emitido'}
                    </span>
                  </div>
                </div>

                {/* 1. Datos de Incidencia */}
                <div className="form-row-luxury">
                  <div className="form-group-luxury">
                    <label>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      N° Incidencia:
                    </label>
                    <input
                      type="text"
                      value={formIncidencia}
                      onChange={(e) => setFormIncidencia(e.target.value.toUpperCase())}
                      placeholder="Ej. OCT-1222 o 55"
                      className="input-luxury monospace-input"
                      disabled={isGuardandoEdicion}
                    />
                    <span className="input-hint">Valor actual: <strong>{folioEditando.numero_incidencia || 'Sin incidencia'}</strong></span>
                  </div>

                  <div className="form-group-luxury">
                    <label>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      Fecha de la Incidencia:
                    </label>
                    <div className="apple-picker-luxury-container">
                      <AppleDatePicker
                        value={formFechaIncidencia}
                        onChange={(val) => setFormFechaIncidencia(val)}
                        disableFuture={false}
                        disablePast={false}
                        showIcon={true}
                        placeholder="Seleccionar fecha de la incidencia"
                      />
                    </div>
                    <span className="input-hint">Fecha actual: {formatearFechaSimple(folioEditando.fecha_registro)}</span>
                  </div>
                </div>

                {/* 2. Folio y Fecha LUEGO */}
                <div className="form-row-luxury">
                  <div className="form-group-luxury">
                    <label>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                      </svg>
                      Folio de Mantenimiento:
                    </label>
                    <input
                      type="text"
                      value={formFolio}
                      onChange={(e) => setFormFolio(e.target.value.toUpperCase())}
                      placeholder="Ej. OCT-4545 o MANT-01"
                      className="input-luxury monospace-input"
                      disabled={isGuardandoEdicion}
                    />
                    <span className="input-hint">Valor actual: <strong>{folioEditando.folio_mantenimiento || 'Sin folio'}</strong></span>
                  </div>

                  <div className="form-group-luxury">
                    <label>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      Fecha del Folio:
                    </label>
                    <div className="apple-picker-luxury-container">
                      <AppleDatePicker
                        value={formFechaFolio}
                        onChange={(val) => setFormFechaFolio(val)}
                        disableFuture={false}
                        disablePast={false}
                        showIcon={true}
                        placeholder="Seleccionar fecha del folio"
                      />
                    </div>
                    <span className="input-hint">Fecha actual: {formatearFechaSimple(folioEditando.fecha_folio_mantenimiento)}</span>
                  </div>
                </div>


                <div className="form-group-luxury highlight-required">
                  <label>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#691B31' }}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    Motivo de la Modificación * (OBLIGATORIO)
                  </label>
                  <textarea
                    rows="3"
                    value={formMotivoCambio}
                    onChange={(e) => setFormMotivoCambio(e.target.value.toUpperCase())}
                    placeholder="ESCRIBA LA JUSTIFICACIÓN OBLIGATORIA DEL CAMBIO PARA LA BITÁCORA HISTÓRICA (EJ. CORRECCIÓN EN FOLIO FÍSICO EMITIDO POR TALLER)..."
                    className="textarea-luxury"
                    style={{ textTransform: 'uppercase' }}
                    required
                    disabled={isGuardandoEdicion}
                  />
                </div>

                <div className="luxury-callout-warning">
                  <div className="callout-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <div className="callout-text">
                    <strong>Registro Permanente:</strong> Esta actualización se asentará de forma inmediata en la bitácora de modificaciones vinculando tu usuario, fecha y valores anteriores.
                  </div>
                </div>
              </div>

              <div className="modal-footer-luxury">
                <button
                  type="button"
                  className="btn-luxury-cancel"
                  onClick={() => setModalEdicionOpen(false)}
                  disabled={isGuardandoEdicion}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-luxury-submit"
                  disabled={isGuardandoEdicion || !formMotivoCambio.trim()}
                >
                  {isGuardandoEdicion ? (
                    <>
                      <span className="spinner-sm"></span> Guardando modificación...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      Guardar Modificación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bitácora de Modificaciones por Unidad */}
      {modalHistorialOpen && registroHistorialSeleccionado && (
        <div className="modal-backdrop-luxury" onClick={() => setModalHistorialOpen(false)}>
          <div className="modal-card-luxury" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-luxury">
              <div className="header-accent-bar" style={{ background: 'linear-gradient(90deg, #691B31, #BC955B)' }}></div>
              <div className="header-title-box">
                <span className="modal-pill-tag" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>Historial de Cambios</span>
                <h3 className="modal-main-title">
                  Bitácora de Modificaciones — ECO {registroHistorialSeleccionado.economico}
                </h3>
                <p className="modal-subtitle">
                  Incidencia: <strong>{registroHistorialSeleccionado.numero_incidencia || 'Sin incidencia'}</strong> • Folio: <strong>{registroHistorialSeleccionado.folio_mantenimiento || 'Sin folio'}</strong> • Tipo: {registroHistorialSeleccionado.tipo}
                </p>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setModalHistorialOpen(false)}>✕</button>
            </div>

            <div className="modal-body-luxury" style={{ maxHeight: '440px', overflowY: 'auto' }}>
              {registroHistorialSeleccionado.auditoria && registroHistorialSeleccionado.auditoria.length > 0 ? (
                <div className="luxury-timeline">
                  {registroHistorialSeleccionado.auditoria.map((aud, idx) => (
                    <div key={aud.id || idx} className="luxury-timeline-node">
                      <div className="timeline-marker">
                        <div className="timeline-dot"></div>
                        {idx < registroHistorialSeleccionado.auditoria.length - 1 && <div className="timeline-stem"></div>}
                      </div>
                      <div className="timeline-card">
                        <div className="timeline-header-line">
                          <span className="estatus-badge" style={getAccionBadgeStyle(aud.tipo_accion)}>
                            {formatAccion(aud.tipo_accion)}
                          </span>
                          <span className="timeline-timestamp">{formatearFechaHora(aud.hora)}</span>
                        </div>
                        <div className="timeline-details-text">
                          {renderDetallesModificacionGlobal(aud.detalles, aud)}
                        </div>
                        <div className="timeline-footer-meta">
                          <span className="meta-user">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            {aud.usuario_nombre || 'Sistema'}
                          </span>
                          {aud.estatus_anterior && (
                            <span className="meta-diff">
                              <span className="diff-tag old">{aud.estatus_anterior}</span>
                              <span className="diff-arrow">→</span>
                              <span className="diff-tag new">{aud.estatus_nuevo}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-history-view">
                  <div className="empty-history-icon">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <h4>Sin Modificaciones Registradas</h4>
                  <p>Este folio no registra ediciones manuales ni modificaciones en la bitácora.</p>
                </div>
              )}
            </div>

            <div className="modal-footer-luxury">
              <button type="button" className="btn-luxury-cancel" onClick={() => setModalHistorialOpen(false)}>
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Bitácora Global de Modificaciones de Folios */}
      {modalGlobalHistorialOpen && (
        <div className="modal-backdrop-luxury" onClick={() => setModalGlobalHistorialOpen(false)}>
          <div className="modal-card-luxury" style={{ maxWidth: '960px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-luxury">
              <div className="header-accent-bar" style={{ background: 'linear-gradient(90deg, #691B31, #BC955B)' }}></div>
              <div className="header-title-box">
                <span className="modal-pill-tag" style={{ background: '#fdf2f4', color: '#691B31', borderColor: '#fecdd3' }}>Bitácora Centralizada</span>
                <h3 className="modal-main-title">
                  Bitácora Global de Modificaciones de Folios
                </h3>
                <p className="modal-subtitle">
                  Registro cronológico integral de todas las asignaciones y correcciones realizadas en el sistema
                </p>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setModalGlobalHistorialOpen(false)}>✕</button>
            </div>

            <div className="modal-body-luxury" style={{ padding: '1rem 1.5rem', maxHeight: '520px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={filtroHistorialGlobal}
                  onChange={(e) => setFiltroHistorialGlobal(e.target.value)}
                  placeholder="Filtrar modificaciones por económico, usuario o detalle..."
                  className="input-luxury"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {isLoadingHistorialGlobal ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <span className="spinner"></span>
                  <p style={{ marginTop: '0.6rem', color: '#64748b', fontWeight: 600 }}>Cargando bitácora de modificaciones...</p>
                </div>
              ) : historialModificacionesGlobal.length > 0 ? (
                <div className="table-responsive">
                  <table className="historial-table" style={{ fontSize: '0.84rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '160px' }}>FECHA / HORA</th>
                        <th style={{ width: '80px' }}>ECO</th>
                        <th style={{ width: '120px' }}>TIPO</th>
                        <th style={{ width: '170px' }}>USUARIO RESPONSABLE</th>
                        <th style={{ width: '160px' }}>ACCIÓN</th>
                        <th>DETALLES DE LA MODIFICACIÓN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialModificacionesGlobal
                        .filter(a => {
                          if (!filtroHistorialGlobal) return true;
                          const q = filtroHistorialGlobal.toLowerCase();
                          return String(a.economico || '').toLowerCase().includes(q) ||
                                 String(a.usuario_nombre || '').toLowerCase().includes(q) ||
                                 String(a.detalles || '').toLowerCase().includes(q);
                        })
                        .map((aud) => (
                          <tr key={aud.id} className="tr-folio-item">
                            <td style={{ fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                              {formatearFechaHora(aud.hora)}
                            </td>
                            <td>
                              <span className="luxury-eco-number" style={{ fontSize: '0.95rem' }}>{aud.economico}</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{aud.tipo_unidad || '-'}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>
                                {aud.usuario_nombre || 'SISTEMA'}
                              </span>
                            </td>
                            <td>
                              <span className="estatus-badge" style={getAccionBadgeStyle(aud.tipo_accion)}>
                                {formatAccion(aud.tipo_accion)}
                              </span>
                            </td>
                            <td style={{ wordBreak: 'break-word', whiteSpace: 'normal', color: '#334155' }}>
                              {renderDetallesModificacionGlobal(aud.detalles, aud)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-history-view">
                  <p style={{ margin: 0, fontWeight: 700, color: '#64748b' }}>No existen modificaciones registradas actualmente.</p>
                </div>
              )}
            </div>

            <div className="modal-footer-luxury">
              <button type="button" className="btn-luxury-cancel" onClick={() => setModalGlobalHistorialOpen(false)}>
                Cerrar Bitácora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Expediente Histórico de Unidad (Consulta Profunda) */}
      {modalExpedienteOpen && expedienteSeleccionado && (
        <div className="modal-backdrop-luxury" onClick={() => setModalExpedienteOpen(false)}>
          <div className="modal-card-luxury modal-expediente-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-luxury">
              <div className="header-accent-bar" style={{ background: 'linear-gradient(90deg, #691B31, #BC955B)' }}></div>
              <div className="header-title-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span className="modal-pill-tag" style={{ background: '#fdf2f4', color: '#691B31', borderColor: '#fecdd3' }}>
                    Expediente Histórico
                  </span>
                  <span className="modal-pill-tag" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>
                    {expedienteSeleccionado.unidad.tipo_transporte}
                  </span>
                  <span className={`estatus-badge estatus-${String(expedienteSeleccionado.estadisticas.estatus_actual || 'operacion').toLowerCase()}`}>
                    <span className="pulse-dot"></span>
                    {String(expedienteSeleccionado.estadisticas.estatus_actual || 'Operación').toUpperCase()}
                  </span>
                </div>
                <h3 className="modal-main-title">
                  Hoja de Vida y Expediente — ECO {expedienteSeleccionado.unidad.numero_eco}
                </h3>
                <p className="modal-subtitle">
                  {expedienteSeleccionado.estado_actual?.ruta ? `Ruta Actual: ${expedienteSeleccionado.estado_actual.ruta} • ` : ''}
                  {expedienteSeleccionado.estado_actual?.nombre_conductor ? `Operador: ${expedienteSeleccionado.estado_actual.nombre_conductor} • ` : ''}
                  {expedienteSeleccionado.unidad.kilometraje ? `Kilometraje: ${expedienteSeleccionado.unidad.kilometraje} km` : 'Sin odómetro registrado'}
                </p>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setModalExpedienteOpen(false)}>✕</button>
            </div>

            {/* Métricas KPI Rápidas de la Unidad */}
            <div className="expediente-kpi-bar">
              <div className="expediente-kpi-item">
                <span className="exp-kpi-num">{expedienteSeleccionado.estadisticas.total_ingresos_taller}</span>
                <span className="exp-kpi-lbl">Ingresos a Taller</span>
              </div>
              <div className="expediente-kpi-item">
                <span className="exp-kpi-num">{expedienteSeleccionado.estadisticas.total_movimientos_bitacora}</span>
                <span className="exp-kpi-lbl">Movimientos Bitácora</span>
              </div>
              <div className="expediente-kpi-item">
                <span className="exp-kpi-num">{expedienteSeleccionado.estadisticas.total_movimientos_folio}</span>
                <span className="exp-kpi-lbl">Eventos de Folio</span>
              </div>
              <div className="expediente-kpi-item">
                <span className="exp-kpi-num" style={{ fontSize: '0.88rem', color: '#691B31' }}>
                  {expedienteSeleccionado.estadisticas.folio_actual || 'Sin Folio Activo'}
                </span>
                <span className="exp-kpi-lbl">Folio Hoy</span>
              </div>
            </div>

            {/* Pestañas internas del Expediente */}
            <div className="expediente-tabs-header">
              <button
                type="button"
                className={`expediente-tab-btn ${tabExpediente === 'taller' ? 'active' : ''}`}
                onClick={() => setTabExpediente('taller')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span>Ingresos y Reportes de Taller ({expedienteSeleccionado.historial_taller?.length || 0})</span>
              </button>
              <button
                type="button"
                className={`expediente-tab-btn ${tabExpediente === 'bitacora' ? 'active' : ''}`}
                onClick={() => setTabExpediente('bitacora')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Bitácora Oficial de Cambios ({expedienteSeleccionado.bitacora?.length || 0})</span>
              </button>
            </div>

            {/* Contenido según pestaña */}
            <div className="modal-body-luxury expediente-modal-body">
              {tabExpediente === 'taller' ? (
                expedienteSeleccionado.historial_taller && expedienteSeleccionado.historial_taller.length > 0 ? (
                  <div className="expediente-taller-list">
                    {expedienteSeleccionado.historial_taller.map((t, idx) => (
                      <div key={t.id || idx} className="expediente-taller-card">
                        <div className="exp-card-header">
                          <div className="exp-card-date">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>{formatearFechaDiaMesAnio(t.fecha_historial)}</span>
                            {t.momento && <span className="exp-momento-tag">{t.momento}</span>}
                          </div>
                          <span className={`estatus-badge estatus-${String(t.estatus || 'mantenimiento').toLowerCase()}`}>
                            {String(t.estatus || 'MANTENIMIENTO').toUpperCase()}
                          </span>
                        </div>
                        <div className="exp-card-body">
                          <div className="exp-falla-row">
                            <span className="exp-label">Falla / Motivo:</span>
                            <span className="exp-val exp-val-falla">{t.falla_reportada || t.falla || t.motivo_estatus || 'Revisión en taller'}</span>
                          </div>
                          {t.diagnostico && (
                            <div className="exp-falla-row">
                              <span className="exp-label">Diagnóstico:</span>
                              <span className="exp-val exp-val-diag">{t.diagnostico}</span>
                            </div>
                          )}
                          <div className="exp-meta-row">
                            {t.ruta && <span className="exp-meta-pill">Ruta: {t.ruta}</span>}
                            {t.nombre_conductor && <span className="exp-meta-pill">Conductor: {t.nombre_conductor}</span>}
                            {t.fecha_registro && <span className="exp-meta-pill">Hora: {formatearFechaHora(t.fecha_registro)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-history-view">
                    <div className="empty-history-icon">
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h4>Sin Reportes de Taller Registrados</h4>
                    <p>Esta unidad no registra ingresos históricos por fallas en los cierres de jornada.</p>
                  </div>
                )
              ) : (
                /* Pestaña: Bitácora Oficial */
                expedienteSeleccionado.bitacora && expedienteSeleccionado.bitacora.length > 0 ? (
                  <div className="luxury-timeline">
                    {expedienteSeleccionado.bitacora.map((aud, idx) => (
                      <div key={aud.id || idx} className="luxury-timeline-node">
                        <div className="timeline-marker">
                          <div className="timeline-dot"></div>
                          {idx < expedienteSeleccionado.bitacora.length - 1 && <div className="timeline-stem"></div>}
                        </div>
                        <div className="timeline-card">
                          <div className="timeline-header-line">
                            <span className="estatus-badge" style={getAccionBadgeStyle(aud.tipo_accion)}>
                              {formatAccion(aud.tipo_accion)}
                            </span>
                            <span className="timeline-timestamp">{formatearFechaHora(aud.hora)}</span>
                          </div>
                          <div className="timeline-details-text">
                            {renderDetallesModificacionGlobal(aud.detalles, aud)}
                          </div>
                          <div className="timeline-footer-meta">
                            <span className="meta-user">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                              </svg>
                              {aud.usuario_nombre || 'Sistema'}
                            </span>
                            {aud.estatus_anterior && (
                              <span className="meta-diff">
                                <span className="diff-tag old">{aud.estatus_anterior}</span>
                                <span className="diff-arrow">→</span>
                                <span className="diff-tag new">{aud.estatus_nuevo}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-history-view">
                    <div className="empty-history-icon">
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h4>Sin Movimientos en Bitácora</h4>
                    <p>No se encontraron registros de auditoría para este económico.</p>
                  </div>
                )
              )}
            </div>

            <div className="modal-footer-luxury">
              <button type="button" className="btn-luxury-cancel" onClick={() => setModalExpedienteOpen(false)}>
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS PREMIUM PARA REVISIÓN E HISTORIAL DE FOLIOS */}
      <style>{`
        /* ==========================================================================
           BÚSQUEDA HISTÓRICA PROFUNDA & EXPEDIENTE DE UNIDAD
           ========================================================================== */
        .deep-search-alert-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-left: 5px solid #691B31;
          border-radius: 12px;
          padding: 0.75rem 1.15rem;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          flex-wrap: wrap;
        }
        .deep-search-alert-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .deep-search-pill-eco {
          font-weight: 800;
          font-size: 0.88rem;
          color: #691B31;
          background: #fdf2f4;
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid #fecdd3;
        }
        .deep-search-pill-tipo {
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          background: #f1f5f9;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .deep-search-pill-status {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        .deep-search-alert-text {
          font-size: 0.84rem;
          color: #334155;
        }
        .btn-deep-search-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #521324;
          background: linear-gradient(135deg, #691B31 0%, #872341 100%);
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(105, 27, 49, 0.25);
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        .btn-deep-search-pill:hover {
          background: linear-gradient(135deg, #521324 0%, #691B31 100%);
          transform: translateY(-1px);
        }

        /* Tarjeta de Búsqueda Profunda en Empty State */
        .deep-search-empty-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 16px;
          padding: 2.25rem 2rem;
          max-width: 640px;
          margin: 0 auto;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
        }
        .deep-search-empty-badge-header {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 0.6rem;
        }
        .deep-search-eco-big {
          font-weight: 900;
          font-size: 1.35rem;
          color: #691B31;
          background: #fdf2f4;
          padding: 4px 14px;
          border-radius: 8px;
          border: 1.5px solid #fecdd3;
        }
        .deep-search-tipo-big {
          font-size: 0.85rem;
          font-weight: 700;
          color: #475569;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .btn-ver-expediente-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 20px;
          border-radius: 9px;
          border: 1px solid #521324;
          background: linear-gradient(135deg, #691B31 0%, #872341 100%);
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(105, 27, 49, 0.3);
          transition: all 0.18s ease;
        }
        .btn-ver-expediente-primary:hover {
          background: linear-gradient(135deg, #521324 0%, #691B31 100%);
          transform: translateY(-1px);
        }

        /* ECO Clickable en Tabla */
        .eco-clickable-badge {
          display: inline-block;
          cursor: pointer;
          padding: 3px 8px;
          border-radius: 6px;
          background: transparent;
          color: #0f172a;
          font-weight: 800;
          transition: all 0.15s ease;
        }
        .eco-clickable-badge:hover {
          background: #fdf2f4;
          color: #691B31;
          box-shadow: 0 0 0 1.5px #fecdd3;
          transform: scale(1.04);
        }

        /* Modal de Expediente */
        .modal-expediente-card {
          max-width: 820px !important;
          width: 95%;
        }
        .expediente-kpi-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
          padding: 0.85rem 1.5rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .expediente-kpi-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          padding: 8px 10px;
          text-align: center;
        }
        .exp-kpi-num {
          font-size: 1.15rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
        }
        .exp-kpi-lbl {
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .expediente-tabs-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.75rem 1.5rem 0 1.5rem;
          background: #ffffff;
          border-bottom: 2px solid #e2e8f0;
        }
        .expediente-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          background: transparent;
          font-size: 0.84rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.15s ease;
        }
        .expediente-tab-btn:hover {
          color: #0f172a;
        }
        .expediente-tab-btn.active {
          color: #691B31;
          font-weight: 800;
          border-bottom-color: #691B31;
        }
        .expediente-modal-body {
          max-height: 480px !important;
          overflow-y: auto;
          padding: 1.25rem 1.5rem !important;
        }
        .expediente-taller-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .expediente-taller-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #691B31;
          border-radius: 10px;
          padding: 0.9rem 1.15rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .exp-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .exp-card-date {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          font-size: 0.84rem;
          color: #0f172a;
        }
        .exp-card-date svg {
          color: #691B31;
        }
        .exp-momento-tag {
          font-size: 0.68rem;
          font-weight: 800;
          background: #f1f5f9;
          color: #475569;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .exp-falla-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 0.82rem;
          line-height: 1.4;
        }
        .exp-label {
          font-weight: 700;
          color: #64748b;
          flex-shrink: 0;
        }
        .exp-val {
          color: #1e293b;
        }
        .exp-val-falla {
          font-weight: 700;
          color: #881337;
        }
        .exp-val-diag {
          font-style: italic;
          color: #334155;
        }
        .exp-meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 2px;
        }
        .exp-meta-pill {
          font-size: 0.72rem;
          font-weight: 600;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 2px 7px;
          border-radius: 5px;
        }
        /* ==========================================================================
           PESTAÑAS DE NAVEGACIÓN SUPERIOR - ESTILO INSTITUCIONAL
           ========================================================================== */
        .historial-top-tabs-wrapper {
          width: 100%;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 1.25rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .historial-top-tabs-wrapper::-webkit-scrollbar {
          display: none;
        }
        .historial-top-tabs {
          display: flex;
          align-items: flex-end;
          gap: 0.35rem;
          width: max-content;
          min-width: 100%;
          padding: 0 0.25rem;
        }
        .historial-top-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: none;
          background: transparent;
          font-size: 0.9rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          white-space: nowrap;
          position: relative;
          transition: color 0.15s ease;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
        }
        .historial-top-tab-btn:hover {
          color: #0f172a;
        }
        .historial-top-tab-btn.active {
          color: #691B31;
          font-weight: 800;
          border-bottom: 3px solid #691B31;
        }

        /* Contenedor Principal de Folios */
        .folios-premium-container {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Hero Header / Banner Ejecutivo de Folios */
        .folios-hero-header {
          background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
          box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        .folios-hero-header::after {
          content: '';
          position: absolute;
          top: -30px;
          right: -30px;
          width: 140px;
          height: 140px;
          background: radial-gradient(circle, rgba(188, 149, 91, 0.08) 0%, rgba(105, 27, 49, 0.03) 60%, transparent 100%);
          border-radius: 50%;
          pointer-events: none;
        }
        .hero-left {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          max-width: 580px;
        }
        .hero-badge-wrap {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .hero-shield-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #691B31;
          background: #fdf2f4;
          border: 1px solid #fecdd3;
          padding: 3px 9px;
          border-radius: 20px;
        }
        .hero-live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #15803d;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 3px 9px;
          border-radius: 20px;
        }
        .hero-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #22c55e;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
          animation: pulseGreen 2s infinite;
        }
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .hero-title {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .hero-desc {
          margin: 0;
          font-size: 0.86rem;
          color: #64748b;
          line-height: 1.45;
        }
        .hero-right {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }

        /* Selector Segmentado Estilo iOS/macOS */
        .hero-segmented-selector {
          display: inline-flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 9px;
          gap: 3px;
          border: 1.5px solid #cbd5e1;
        }
        .seg-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 6px;
          border: none;
          background: transparent;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .seg-btn svg {
          color: #64748b;
          transition: color 0.15s ease;
        }
        .seg-btn:hover:not(.active) {
          background: #e2e8f0;
          color: #0f172a;
        }
        .seg-btn:hover:not(.active) svg {
          color: #0f172a;
        }
        .seg-btn.active {
          background: #691B31;
          color: #ffffff;
          box-shadow: 0 2px 5px rgba(105, 27, 49, 0.28);
          font-weight: 700;
        }
        .seg-btn.active svg {
          color: #ffffff;
        }
        .seg-btn .seg-count {
          background: #e2e8f0;
          color: #334155;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: 10px;
          transition: all 0.15s ease;
        }
        .seg-btn.active .seg-count {
          background: #ffffff;
          color: #691B31;
          font-weight: 800;
        }
        .seg-btn .seg-count.count-zero {
          background: #e2e8f0;
          color: #64748b;
        }
        .seg-btn.active .seg-count.count-zero {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .header-scope-selector-wrapper {
          display: flex;
          align-items: center;
        }
        .header-scope-selector {
          height: 38px;
          display: inline-flex;
          align-items: center;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          gap: 3px;
          border: 1.5px solid #cbd5e1;
          box-sizing: border-box;
        }
        .header-scope-selector .seg-btn {
          height: 30px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 11px;
          border-radius: 6px;
          border: none;
          background: transparent;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .header-scope-selector .seg-btn svg {
          color: #64748b;
        }
        .header-scope-selector .seg-btn:hover:not(.active) {
          background: #e2e8f0;
          color: #0f172a;
        }
        .header-scope-selector .seg-btn:hover:not(.active) svg {
          color: #0f172a;
        }
        .header-scope-selector .seg-btn.active {
          background: #691B31;
          color: #ffffff;
          box-shadow: 0 2px 5px rgba(105, 27, 49, 0.28);
          font-weight: 700;
        }
        .header-scope-selector .seg-btn.active svg {
          color: #ffffff;
        }
        .header-scope-selector .seg-btn .seg-count {
          background: #e2e8f0;
          color: #334155;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: 10px;
          transition: all 0.15s ease;
        }
        .header-scope-selector .seg-btn.active .seg-count {
          background: #ffffff;
          color: #691B31;
          font-weight: 800;
        }
        .header-scope-selector .seg-btn .seg-count.count-zero {
          background: #e2e8f0;
          color: #64748b;
        }
        .header-scope-selector .seg-btn.active .seg-count.count-zero {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .date-control-subtle {
          opacity: 0.88;
        }
        .folios-actions-end {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          flex-wrap: wrap;
        }

        /* Banner de orientación Anti-Confusión */
        .guidance-banner-alert {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 1px solid #fde68a;
          border-left: 4px solid #f59e0b;
          border-radius: 10px;
          padding: 0.75rem 1.1rem;
          margin-bottom: 0.85rem;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(245, 158, 11, 0.08);
          animation: fadeInBanner 0.25s ease-out;
        }
        @keyframes fadeInBanner {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .guidance-banner-content {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          color: #78350f;
        }
        .guidance-banner-icon {
          color: #d97706;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .guidance-banner-text {
          font-size: 0.84rem;
          line-height: 1.4;
          color: #78350f;
        }
        .guidance-title {
          font-weight: 800;
          margin-right: 0.35rem;
        }
        .guidance-desc {
          color: #92400e;
        }
        .guidance-banner-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 0.85rem;
          background: #691B31;
          color: #ffffff;
          border: 1px solid #521324;
          border-radius: 7px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(105, 27, 49, 0.2);
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }
        .guidance-banner-action-btn:hover {
          background: #521324;
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(105, 27, 49, 0.3);
        }
        .guidance-banner-action-btn:active {
          transform: scale(0.96);
        }

        /* Botón 1-click en Empty State para ir a Historial Completo */
        .btn-ir-historial-completo-empty {
          margin-top: 1.1rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 38px;
          padding: 0 1.25rem;
          background: linear-gradient(135deg, #691B31 0%, #480020 100%);
          color: #ffffff;
          border: 1px solid #480020;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(105, 27, 49, 0.25);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-ir-historial-completo-empty:hover {
          background: linear-gradient(135deg, #7e213b 0%, #580028 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(105, 27, 49, 0.35);
        }
        .btn-ir-historial-completo-empty:active {
          transform: scale(0.96) translateY(1px);
        }

        /* Botón Bitácora Global Luxury */
        .btn-bitacora-global-luxury {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1rem;
          background: #691B31;
          border: 1px solid #521324;
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(105, 27, 49, 0.25);
          transition: all 0.2s;
        }
        .btn-bitacora-global-luxury:hover {
          background: #521324;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(105, 27, 49, 0.35);
        }
        .luxury-badge-count {
          background: rgba(255, 255, 255, 0.22);
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.15rem 0.45rem;
          border-radius: 12px;
          margin-left: 0.2rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        /* Grid de Tarjetas KPI Avanzadas */
        .folios-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 1rem;
        }
        .folios-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 0;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .folios-kpi-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }
        .folios-kpi-card.active {
          border-color: #691B31;
          box-shadow: 0 0 0 2px rgba(105, 27, 49, 0.15), 0 8px 16px -4px rgba(105, 27, 49, 0.1);
        }
        .kpi-top-bar {
          height: 4px;
          width: 100%;
        }
        .bar-blue {
          background: linear-gradient(90deg, #2563eb, #3b82f6);
        }
        .bar-amber {
          background: linear-gradient(90deg, #BC955B, #DDC9A3);
        }
        .bar-rose {
          background: linear-gradient(90deg, #A02142, #e11d48);
        }
        .bar-purple {
          background: linear-gradient(90deg, #691B31, #A02142);
        }
        .kpi-main-body {
          padding: 1.15rem 1.25rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .kpi-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }
        .kpi-icon-blue {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }
        .kpi-icon-amber {
          background: linear-gradient(135deg, #fdfaf3 0%, #f7f1e5 100%);
          color: #8c6a38;
          border: 1px solid #DDC9A3;
        }
        .kpi-icon-rose {
          background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
          color: #A02142;
          border: 1px solid #fecdd3;
        }
        .kpi-icon-purple {
          background: linear-gradient(135deg, #fdf2f4 0%, #fce7eb 100%);
          color: #691B31;
          border: 1px solid #fecdd3;
        }
        .kpi-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex-grow: 1;
        }
        .kpi-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.4rem;
        }
        .kpi-label {
          font-size: 0.76rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
        }
        .kpi-value-row {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
          margin: 0.15rem 0;
        }
        .kpi-value {
          font-size: 1.75rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .kpi-value-unit {
          font-size: 0.78rem;
          font-weight: 600;
          color: #64748b;
        }
        .kpi-badge {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
        }
        .kpi-badge-blue {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .kpi-badge-amber {
          background: #fdfaf3;
          color: #8c6a38;
          border: 1px solid #DDC9A3;
        }
        .kpi-badge-rose {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .kpi-badge-green {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }
        .kpi-badge-purple {
          background: #fdf2f4;
          color: #691B31;
          border: 1px solid #fecdd3;
        }
        .kpi-subtext {
          font-size: 0.73rem;
          color: #64748b;
          margin-top: 0.15rem;
        }
        .kpi-progress-bar {
          width: 100%;
          height: 5px;
          background-color: #f7f1e5;
          border-radius: 10px;
          overflow: hidden;
          margin-top: 0.35rem;
        }
        .kpi-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #BC955B, #DDC9A3);
          border-radius: 10px;
          transition: width 0.4s ease;
        }

        /* Barra de Filtros Rápidos & Chips */
        .folios-controls-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 0.8rem 1.15rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .folios-filter-chips {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .filter-chips-label {
          font-size: 0.8rem;
          font-weight: 800;
          color: #475569;
          display: flex;
          align-items: center;
          margin-right: 0.2rem;
        }
        .chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 0.4rem 0.85rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chip-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
          transform: translateY(-1px);
        }
        .chip-btn.active {
          background: #691B31;
          color: #ffffff;
          border-color: #691B31;
          box-shadow: 0 2px 6px rgba(105, 27, 49, 0.25);
        }
        .chip-count {
          background: rgba(0, 0, 0, 0.06);
          color: inherit;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.05rem 0.45rem;
          border-radius: 10px;
        }
        .chip-btn.active .chip-count {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
        .chip-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .dot-amber {
          background-color: #BC955B;
        }
        .dot-rose {
          background-color: #A02142;
        }
        .folios-quick-status-legend {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          font-size: 0.76rem;
          font-weight: 600;
          color: #64748b;
        }
        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-mantenimiento {
          background-color: #BC955B;
        }

        /* Tabla de Folios - Estilo Responsivo */
        .table-folios-luxury {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          overflow-x: auto !important;
          overflow-y: visible !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
          -webkit-overflow-scrolling: touch;
          position: relative;
        }
        .table-folios-luxury table {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
          min-width: 1020px;
        }
        .table-folios-luxury th {
          background-color: #691B31 !important;
          color: #ffffff;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 10px 10px;
          border-bottom: 2px solid #521324;
          text-align: left;
          vertical-align: middle;
          white-space: nowrap;
        }
        .table-folios-luxury th:first-child {
          border-top-left-radius: 13px;
        }
        .table-folios-luxury th:last-child {
          border-top-right-radius: 13px;
          text-align: center;
        }
        .tr-folio-item {
          transition: background-color 0.15s ease-in-out;
        }
        .tr-folio-item:hover {
          background-color: #fbf9f6 !important;
        }
        .tr-folio-item td {
          padding: 8px 10px;
          vertical-align: middle;
          border-bottom: 1px solid #f1f5f9;
          background-color: inherit;
        }
        .tr-folio-item td:last-child {
          padding: 8px 10px;
          text-align: center;
        }

        /* Folio Ticket Pill & Copy con Dorado Institucional Pantone 465 C (Sin icono izquierdo, ajustado) */
        .luxury-folio-pill {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          background: linear-gradient(135deg, #fdfaf3 0%, #f7f1e5 100%);
          border: 1.5px solid #BC955B;
          color: #691B31;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.03em;
          padding: 0.3rem 0.6rem;
          border-radius: 7px;
          box-shadow: 0 1px 3px rgba(188, 149, 91, 0.12);
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        .luxury-folio-pill:hover {
          border-color: #691B31;
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(188, 149, 91, 0.25);
        }
        .folio-copy-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: rgba(188, 149, 91, 0.18);
          color: #BC955B;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .luxury-folio-pill:hover .folio-copy-icon {
          background: #BC955B;
          color: #ffffff;
        }

        /* Folio Sin Asignar */
        .luxury-folio-sin-asignar-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .luxury-folio-pendiente {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: #fdf2f4;
          border: 1.5px dashed #fecdd3;
          color: #A02142;
          font-weight: 800;
          font-size: 0.74rem;
          padding: 0.3rem 0.65rem;
          border-radius: 8px;
        }
        .pulse-warning-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #A02142;
          animation: pulseAnimation 1.6s infinite;
        }
        .btn-quick-asignar {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.8rem;
          background: linear-gradient(135deg, #691B31 0%, #872341 100%);
          color: #ffffff;
          border: 1px solid #521324;
          border-radius: 7px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(105, 27, 49, 0.2);
          transition: all 0.18s ease-in-out;
        }
        .btn-quick-asignar:hover {
          background: linear-gradient(135deg, #521324 0%, #691B31 100%);
          transform: translateY(-1px);
          box-shadow: 0 3px 6px rgba(105, 27, 49, 0.3);
        }

        /* Diseño Entendible y Estructurado de Detalles de Modificación */
        .detalle-audit-card {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.55rem 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          text-align: left;
        }
        .detalle-context-pill {
          display: inline-block;
          align-self: flex-start;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          color: #691B31;
          background: #fdf2f4;
          padding: 0.12rem 0.45rem;
          border-radius: 4px;
          border: 1px solid #fecdd3;
        }
        .detalle-diffs-grid {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .detalle-diff-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .diff-field-header {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.74rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }
        .diff-field-icon {
          display: inline-flex;
          align-items: center;
          color: #691B31;
        }
        .diff-values-flow {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .diff-tag {
          display: inline-block;
          font-size: 0.76rem;
          font-weight: 700;
          padding: 0.12rem 0.5rem;
          border-radius: 6px;
          letter-spacing: 0.2px;
        }
        .diff-tag-old {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
          text-decoration: line-through;
        }
        .diff-tag-old.is-empty {
          text-decoration: none;
          color: #64748b;
          background: #f1f5f9;
          border-color: #cbd5e1;
          font-style: italic;
        }
        .diff-arrow-separator {
          display: inline-flex;
          align-items: center;
          color: #691B31;
        }
        .diff-tag-new {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
          font-weight: 800;
          box-shadow: 0 1px 2px rgba(22, 101, 52, 0.08);
        }
        .diff-tag-new.is-empty {
          color: #64748b;
          background: #f1f5f9;
          border-color: #cbd5e1;
          font-style: italic;
        }
        .detalle-motivo-box {
          background: #fffbf5;
          border-left: 3px solid #691B31;
          border-top: 1px solid #fed7aa;
          border-right: 1px solid #fed7aa;
          border-bottom: 1px solid #fed7aa;
          border-radius: 0 6px 6px 0;
          padding: 0.35rem 0.6rem;
          margin-top: 0.15rem;
        }
        .motivo-badge-title {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.67rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #691B31;
          letter-spacing: 0.3px;
        }
        .motivo-quote-text {
          margin: 0.15rem 0 0 0;
          font-size: 0.76rem;
          color: #1f2937;
          font-weight: 600;
          font-style: italic;
          line-height: 1.3;
        }
        .detalle-extra-text {
          font-size: 0.74rem;
          color: #64748b;
          font-style: italic;
        }
        .detalle-simple-text {
          font-size: 0.78rem;
          color: #334155;
          font-weight: 600;
          line-height: 1.35;
        }

        /* Incidencia Pill con Guinda Vibrante Pantone 7420 C (Con botón para copiar ajustado igual) */
        .luxury-incidencia-pill {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          background: linear-gradient(135deg, #fdf2f4 0%, #fff1f2 100%);
          border: 1.5px solid #fecdd3;
          color: #A02142;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.03em;
          padding: 0.3rem 0.6rem;
          border-radius: 7px;
          box-shadow: 0 1px 3px rgba(160, 33, 66, 0.08);
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        .luxury-incidencia-pill:hover {
          border-color: #A02142;
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(160, 33, 66, 0.22);
        }
        .incidencia-copy-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: rgba(160, 33, 66, 0.14);
          color: #A02142;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .luxury-incidencia-pill:hover .incidencia-copy-icon {
          background: #A02142;
          color: #ffffff;
        }
        .sin-incidencia-tag {
          color: #94a3b8;
          font-size: 0.78rem;
          font-style: italic;
          font-weight: 500;
        }

        /* Económico Badge con Guinda Pantone 7421 C */
        .luxury-eco-badge {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
          background: #691B31;
          color: #ffffff;
          padding: 4px 9px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(105, 27, 49, 0.2);
        }
        .eco-prefix {
          font-size: 0.65rem;
          font-weight: 800;
          color: #DDC9A3;
          letter-spacing: 0.05em;
        }
        .eco-number {
          font-size: 0.95rem;
          font-weight: 900;
          letter-spacing: -0.01em;
        }

        /* Tipo de Unidad Badges */
        .luxury-tipo-badge {
          display: inline-block;
          font-size: 0.74rem;
          font-weight: 800;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .luxury-tipo-badge.tipo-urbanus,
        .luxury-tipo-badge.tipo-urbanuss {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .luxury-tipo-badge.tipo-vagoneta {
          background-color: #fdfaf3;
          color: #8c6a38;
          border: 1px solid #DDC9A3;
        }
        .luxury-tipo-badge.tipo-zafiro {
          background-color: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .luxury-tipo-badge.tipo-orion {
          background-color: #faf5ff;
          color: #6b21a8;
          border: 1px solid #e9d5ff;
        }

        /* Fechas Dual Column */
        .fechas-dual-column {
          display: flex;
          flex-direction: column;
          gap: 0.22rem;
          min-width: 260px;
        }
        .fecha-dual-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          white-space: nowrap;
        }
        .fecha-tag-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.67rem;
          font-weight: 800;
          color: #691B31;
          background: #fdfaf3;
          border: 1px solid #DDC9A3;
          padding: 0.08rem 0.32rem;
          border-radius: 4px;
          flex-shrink: 0;
          min-width: 38px;
        }
        .fecha-tag-pill.muted {
          color: #64748b;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
        }
        .fecha-dual-text {
          font-size: 0.77rem;
          color: #334155;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .fecha-dual-text.bold {
          font-weight: 700;
          color: #0f172a;
        }
        .fecha-dual-text.muted {
          font-size: 0.75rem;
          color: #64748b;
        }

        /* Falla & Diagnóstico */
        .falla-luxury-box {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          max-width: 270px;
        }
        .falla-text-main {
          font-size: 0.84rem;
          font-weight: 600;
          color: #1e293b;
          word-break: break-word;
          line-height: 1.35;
        }
        .falla-text-muted {
          color: #64748b !important;
          font-weight: 500 !important;
          font-style: italic;
        }
        .diagnostico-subtext-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: #475569;
          background: #f1f5f9;
          padding: 2px 7px;
          border-radius: 5px;
          border: 1px solid #e2e8f0;
          font-style: normal;
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Pulse Dot para Estatus */
        .pulse-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: currentColor;
          margin-right: 0.4rem;
          animation: pulseAnimation 2s infinite;
        }
        @keyframes pulseAnimation {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }

        /* Acciones */
        .luxury-actions-cell {
          display: flex;
          gap: 0.45rem;
          justify-content: center;
          align-items: center;
          white-space: nowrap;
        }
        .btn-luxury-action {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border: none;
          padding: 0.4rem 0.7rem;
          border-radius: 7px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.16s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-luxury-edit {
          background-color: #691B31;
          color: #ffffff;
          box-shadow: 0 1px 3px rgba(105, 27, 49, 0.2);
        }
        .btn-luxury-edit:hover {
          background-color: #521324;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(105, 27, 49, 0.28);
        }
        .btn-luxury-history {
          background-color: #ffffff;
          border: 1px solid #BC955B;
          color: #691B31;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .btn-luxury-history:hover {
          background-color: #fdfaf3;
          border-color: #691B31;
          color: #691B31;
          transform: translateY(-1px);
        }
        .mini-history-count {
          background-color: #BC955B;
          color: #ffffff;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.05rem 0.4rem;
          border-radius: 9999px;
        }

        /* Empty State */
        .empty-state-icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #f1f5f9;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        /* Modal Luxury Styling */
        .modal-backdrop-luxury {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .modal-card-luxury {
          background: #ffffff;
          border-radius: 18px;
          width: 100%;
          max-width: 580px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          position: relative;
          animation: modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalPop {
          0% { opacity: 0; transform: scale(0.95) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-header-luxury {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.5rem 1.75rem 1.25rem;
          background: #fafaf9;
          border-bottom: 1px solid #e7e5e4;
        }
        .header-accent-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #691B31 0%, #BC955B 50%, #A02142 100%);
        }
        .header-title-box {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .modal-pill-tag {
          align-self: flex-start;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #fdf2f4;
          color: #691B31;
          border: 1px solid #fecdd3;
          padding: 0.15rem 0.5rem;
          border-radius: 6px;
        }
        .modal-main-title {
          margin: 0;
          color: #0f172a;
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .modal-subtitle {
          margin: 0;
          color: #64748b;
          font-size: 0.86rem;
        }
        .btn-modal-close {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          font-size: 1rem;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-modal-close:hover {
          background: #e2e8f0;
          color: #0f172a;
          transform: rotate(90deg);
        }
        .modal-body-luxury {
          padding: 1.5rem 1.75rem;
        }
        .form-row-luxury {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-group-luxury {
          margin-bottom: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .form-group-luxury label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .input-luxury {
          padding: 0.68rem 0.9rem;
          border: 1.5px solid #cbd5e1;
          border-radius: 9px;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
        }
        .input-luxury:focus {
          border-color: #691B31;
          box-shadow: 0 0 0 3px rgba(105, 27, 49, 0.12);
        }
        .apple-picker-luxury-container {
          width: 100%;
        }
        .apple-picker-luxury-container button {
          border: 1.5px solid #cbd5e1 !important;
          border-radius: 9px !important;
          padding: 0.65rem 0.9rem !important;
          min-height: 42px !important;
          box-shadow: none !important;
          transition: all 0.2s !important;
          background: #ffffff !important;
        }
        .apple-picker-luxury-container button:hover {
          border-color: #94a3b8 !important;
          background: #f8fafc !important;
        }
        .apple-picker-luxury-container button:focus,
        .apple-picker-luxury-container button:active {
          border-color: #691B31 !important;
          box-shadow: 0 0 0 3px rgba(105, 27, 49, 0.12) !important;
        }
        .monospace-input {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .input-hint {
          font-size: 0.72rem;
          color: #64748b;
        }
        .form-group-luxury.highlight-required label {
          color: #991b1b;
        }
        .textarea-luxury {
          padding: 0.7rem 0.9rem;
          border: 1.5px solid #cbd5e1;
          border-radius: 9px;
          font-size: 0.86rem;
          color: #0f172a;
          outline: none;
          resize: vertical;
          min-height: 80px;
          transition: all 0.2s;
        }
        .textarea-luxury:focus {
          border-color: #691B31;
          box-shadow: 0 0 0 3px rgba(105, 27, 49, 0.12);
        }
        .luxury-callout-warning {
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          background: #fff7ed;
          border: 1px solid #ffedd5;
          border-radius: 9px;
          padding: 0.8rem 0.95rem;
          margin-top: 0.5rem;
        }

        /* Badge de Tiempo Independiente para Incidencia y Folio en Tabla */
        .tiempo-tag-pill {
          display: inline-flex;
          align-items: center;
          font-size: 0.67rem;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          white-space: nowrap;
          flex-shrink: 0;
          margin-left: auto;
        }
        .tiempo-tag-pill.resuelto {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .tiempo-tag-pill.activo {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }
        .tiempo-tag-pill.critico {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .tiempo-tag-pill.sin-folio {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
          font-style: italic;
        }

        /* Tarjetas Duales de Estancia en Modal (Incidencia y Folio Separados) */
        .modal-estancia-dual-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 1.15rem;
        }
        @media (max-width: 550px) {
          .modal-estancia-dual-container {
            grid-template-columns: 1fr;
          }
        }
        .modal-estancia-card {
          padding: 8px 12px;
          border-radius: 9px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .modal-estancia-card.resuelto {
          background: #f0fdf4;
          border: 1.5px solid #bbf7d0;
        }
        .modal-estancia-card.activo {
          background: #fffbeb;
          border: 1.5px solid #fde68a;
        }
        .modal-estancia-card.critico {
          background: #fef2f2;
          border: 1.5px solid #fecaca;
        }
        .modal-estancia-card.sin-folio {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
        }
        .estancia-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
        }
        .estancia-card-main {
          font-size: 0.95rem;
          color: #0f172a;
          line-height: 1.25;
        }
        .estancia-card-sub {
          font-size: 0.72rem;
          color: #64748b;
        }

        /* Banner de Estancia en Modal */
        .modal-estancia-banner {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 14px;
          border-radius: 8px;
          margin-bottom: 1.15rem;
          font-size: 0.83rem;
          font-weight: 600;
          line-height: 1.4;
        }
        .modal-estancia-banner svg {
          flex-shrink: 0;
        }
        .modal-estancia-banner.resuelto {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .modal-estancia-banner.activo {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }
        .modal-estancia-banner.critico {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }



        .callout-icon {
          color: #ea580c;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .callout-text {
          font-size: 0.78rem;
          color: #9a3412;
          line-height: 1.45;
        }
        .modal-footer-luxury {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.15rem 1.75rem;
          background: #fafaf9;
          border-top: 1px solid #e7e5e4;
        }
        .btn-luxury-cancel {
          padding: 0.65rem 1.35rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          font-size: 0.86rem;
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-luxury-cancel:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .btn-luxury-submit {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.65rem 1.5rem;
          background: #691B31;
          color: #ffffff;
          border: none;
          font-weight: 700;
          font-size: 0.86rem;
          border-radius: 9px;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(105, 27, 49, 0.2);
          transition: all 0.15s;
        }
        .btn-luxury-submit:hover:not(:disabled) {
          background: #521324;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(105, 27, 49, 0.3);
        }
        .btn-luxury-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* Timeline Luxury */
        .luxury-timeline {
          display: flex;
          flex-direction: column;
        }
        .luxury-timeline-node {
          display: flex;
          gap: 1rem;
          position: relative;
        }
        .timeline-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 20px;
          flex-shrink: 0;
        }
        .timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #691B31;
          border: 3px solid #fdf2f4;
          box-shadow: 0 0 0 1px #691B31;
          margin-top: 6px;
        }
        .timeline-stem {
          width: 2px;
          flex-grow: 1;
          background: #e2e8f0;
          margin: 4px 0;
        }
        .timeline-card {
          flex-grow: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 0.85rem 1rem;
          margin-bottom: 1rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }
        .timeline-header-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }
        .timeline-timestamp {
          font-size: 0.74rem;
          font-weight: 700;
          color: #64748b;
        }
        .timeline-details-text {
          font-size: 0.84rem;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.45;
          margin-bottom: 0.5rem;
        }
        .timeline-footer-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.76rem;
          color: #64748b;
          border-top: 1px solid #edf2f7;
          padding-top: 0.4rem;
          margin-top: 0.2rem;
        }
        .meta-user {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 700;
          color: #334155;
        }
        .meta-diff {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .diff-tag {
          font-family: monospace;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.08rem 0.35rem;
          border-radius: 4px;
        }
        .diff-tag.old {
          background: #fee2e2;
          color: #991b1b;
        }
        .diff-tag.new {
          background: #dcfce7;
          color: #15803d;
        }
        .diff-arrow {
          font-weight: 800;
          color: #94a3b8;
        }

        .empty-history-view {
          text-align: center;
          padding: 3rem 1.5rem;
          color: #94a3b8;
        }
        .empty-history-icon {
          display: flex;
          justify-content: center;
          color: #cbd5e1;
          margin-bottom: 0.6rem;
        }
        .empty-history-view h4 {
          margin: 0;
          font-weight: 700;
          color: #475569;
          font-size: 1rem;
        }
        .empty-history-view p {
          margin: 0.35rem 0 0 0;
          font-size: 0.82rem;
        }

        /* Barra de Encabezado Superior Compacta y Ordenada */
        .historial-header {
          position: relative;
          z-index: 50;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.25rem;
          background: #ffffff;
          padding: 1.15rem 1.6rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.03);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .historial-header.dropdown-open-active {
          z-index: 120;
        }
        .historial-header-title-box {
          flex: 1 1 320px;
          min-width: 260px;
        }
        .historial-toolbar-controls {
          position: relative;
          z-index: 70;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: nowrap;
          flex-shrink: 0;
        }
        .historial-date-control {
          position: relative;
          z-index: 80;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .fecha-control-label {
          font-size: 0.84rem;
          font-weight: 700;
          color: #475569;
          white-space: nowrap;
        }
        .historial-action-buttons-group {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          flex-wrap: nowrap;
        }
        .custom-dropdown-container {
          position: relative;
          min-width: 145px;
          z-index: 90;
        }
        .custom-dropdown-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.4rem;
          height: 38px;
          padding: 0 0.75rem;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .custom-dropdown-trigger:hover {
          border-color: #691B31;
          box-shadow: 0 1px 3px rgba(105, 27, 49, 0.08);
        }
        .custom-dropdown-trigger.open {
          border-color: #691B31;
          box-shadow: 0 0 0 3px rgba(105, 27, 49, 0.12);
        }
        .custom-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 165px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          z-index: 1100;
          overflow: hidden;
        }
        .custom-dropdown-item {
          width: 100%;
          text-align: left;
          padding: 0.55rem 0.85rem;
          font-size: 0.84rem;
          color: #334155;
          background: transparent;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .custom-dropdown-item:last-child {
          border-bottom: none;
        }
        .custom-dropdown-item:hover {
          background: #fdf2f4;
          color: #691B31;
        }
        .custom-dropdown-item.selected {
          background: #fdf2f4;
          color: #691B31;
          font-weight: 800;
        }
        .btn-ir-parque-vehicular {
          height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 0.95rem;
          background: #691B31;
          color: #ffffff;
          border: 1px solid #521324;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          box-sizing: border-box;
          transition: background-color 0.15s ease, border-color 0.15s ease;
          user-select: none;
        }
        .btn-ir-parque-vehicular svg {
          color: #ffffff;
        }
        .btn-ir-parque-vehicular:hover {
          background: #561426;
          border-color: #420d1c;
        }
        .btn-ir-parque-vehicular:active {
          background: #3e0917;
        }
        .btn-actualizar-instantaneo {
          height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 0.85rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          box-sizing: border-box;
          transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .btn-actualizar-instantaneo svg {
          color: #64748b;
        }
        .btn-actualizar-instantaneo:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .btn-actualizar-instantaneo:hover:not(:disabled) svg {
          color: #0f172a;
        }
        .btn-actualizar-instantaneo:active:not(:disabled),
        .btn-actualizar-instantaneo.btn-active-pressed {
          background: #f1f5f9 !important;
          border-color: #94a3b8 !important;
          color: #0f172a !important;
        }
        .btn-actualizar-instantaneo:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .export-excel-btn {
          height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 0.95rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          border: 1px solid #047857;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-sizing: border-box;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.25);
          transition: transform 0.12s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.15s ease, background 0.15s ease;
          user-select: none;
        }
        .export-excel-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35);
        }
        /* Animación táctil de pulsación al dar clic */
        .export-excel-btn:active:not(:disabled) {
          transform: scale(0.92) translateY(2px) !important;
          background: #047857 !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(0, 0, 0, 0.25) !important;
        }
        .export-excel-btn.btn-download-success {
          background: #059669 !important;
          border-color: #047857 !important;
          animation: buttonSuccessPulse 0.45s ease-out;
        }
        .export-excel-btn:disabled {
          background: #9ca3af !important;
          border-color: #9ca3af !important;
          cursor: not-allowed;
          box-shadow: none;
          transform: none !important;
        }
        .pop-check-icon {
          animation: popCheck 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popCheck {
          0% { transform: scale(0.4); opacity: 0; }
          70% { transform: scale(1.25); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes buttonSuccessPulse {
          0% { transform: scale(0.94); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .spinning-refresh {
          animation: spinRefresh 0.85s linear infinite;
        }
        @keyframes spinRefresh {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Comentario / Guía de Criterio de Búsqueda justo debajo del buscador */
        .search-anti-capa8-hint {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 3.5px solid #691B31;
          padding: 0.55rem 0.95rem;
          border-radius: 8px;
          margin-top: -0.85rem;
          margin-bottom: 1.25rem;
          font-size: 0.82rem;
          color: #475569;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          flex-wrap: wrap;
        }
        .search-hint-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #fdf2f4;
          color: #691B31;
          font-weight: 700;
          padding: 0.22rem 0.6rem;
          border-radius: 6px;
          font-size: 0.77rem;
          white-space: nowrap;
          border: 1px solid #fecdd3;
        }
        .search-hint-text {
          line-height: 1.4;
          color: #334155;
        }
        .search-hint-text strong {
          color: #0f172a;
          font-weight: 700;
        }
        .search-hint-text em {
          color: #64748b;
          font-style: normal;
          margin-left: 0.25rem;
        }

        @media (max-width: 960px) {
          .historial-toolbar-controls {
            flex-wrap: wrap;
            width: 100%;
          }
          .guidance-banner-alert {
            flex-direction: column;
            align-items: flex-start;
          }
          .guidance-banner-action-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
