import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import { descargarReportesGeneralesConAlerta } from '../../utils/reporteGeneralUtils';
import { generarPDFEstadisticasCentro } from '../../utils/generarPDFEstadisticasCentro';
import { generarPDFReporteOperacionalPorHora } from '../../utils/generarPDFReporteOperacionalPorHora';
import { generarPDFProgramacionOperativa } from '../../utils/generarPDFProgramacionOperativa';
import './CentroControl.css';
import API_BASE from '../../config/api';
// Mismos IDs / etiquetas que en ResumenDespacho.jsx para mantener consistencia
const modelsConfig = [
  { id: 'URBANUS', label: 'URBANUSS', image: '/images/urbanussfrenterealista.webp', color: 'maroon' },
  { id: 'ZAFIRO', label: 'ZAFIRO', image: '/images/zafirofrenterealista.webp', color: 'gold' },
  { id: 'VAGONETA', label: 'VAGONETA', image: '/images/vagoneta frente.webp', color: 'green' },
  { id: 'ORION', label: 'ORIÓN', image: '/images/orionfrente.webp', color: 'blue' },
];

// Nombre del rol tal como está guardado en la tabla `roles`
const ROL_TITAN = 'TITAN';

const ROUTE_DESCRIPTIONS = {
  'T01': { tipo: 'troncal', label: 'T-01', desc: 'T-01 Exprés (Téllez - Plaza Juárez)' },
  'T02': { tipo: 'troncal', label: 'T-02', desc: 'T-02 Exprés (Téllez - Prepa 1)' },
  'T04': { tipo: 'troncal', label: 'T-04', desc: 'T-04 Exprés (Téllez - Matilde - Centro)' },
  'T05': { tipo: 'troncal', label: 'T-05', desc: 'T-05 Parador (Téllez - Centro)' },
  '1': { tipo: 'alimentadora', label: '1', desc: '1 Alimentadora' },
  '1A': { tipo: 'alimentadora', label: '1A', desc: '1A Matilde Ida' },
  '1B': { tipo: 'alimentadora', label: '1B', desc: '1B Matilde Regreso' },
  '2': { tipo: 'alimentadora', label: '2', desc: '2 Alimentadora' },
  '2A': { tipo: 'alimentadora', label: '2A', desc: '2A San Alfonso - Matilde' },
  '2B': { tipo: 'alimentadora', label: '2B', desc: '2B Fracc. Villa Fontana - Jagüey T.' },
  '2D': { tipo: 'alimentadora', label: '2D', desc: '2D Priv. Portobello - Téllez' },
  '2E': { tipo: 'alimentadora', label: '2E', desc: '2E Cetram Téllez - Amores de Don Juan' },
  '3': { tipo: 'alimentadora', label: '3', desc: '3 Real de Toledo - Efrén Rebolledo' },
  '4': { tipo: 'alimentadora', label: '4', desc: '4 Fracc. Lomas de Plata - T. Edad' },
  '4A': { tipo: 'alimentadora', label: '4', desc: '4 Fracc. Lomas de Plata - T. Edad' },
  '5': { tipo: 'alimentadora', label: '5', desc: '5 Parque Urbano - E. Mexicano' },
  '6': { tipo: 'alimentadora', label: '6', desc: '6 Hogares Unión - E. Mexicano' },
  '7': { tipo: 'alimentadora', label: '7', desc: '7 Rancho La Colonia - E. F. Ángeles' },
  '8': { tipo: 'alimentadora', label: '8', desc: '8 Los Tuzos - E. Juan C. Doria' },
  '9': { tipo: 'alimentadora', label: '9', desc: '9 Pitahayas - E. C. Justicia' },
  '10': { tipo: 'alimentadora', label: '10', desc: '10 Paseo de Camelinas - E. C. Justicia' },
  '11': { tipo: 'alimentadora', label: '11', desc: '11 El Huixmí - E. C. Justicia' },
  '12': { tipo: 'alimentadora', label: '12', desc: '12 La Colonia - E. Juan C. Doria' },
  '13': { tipo: 'alimentadora', label: '13', desc: '13 El Venado - E. Hospitales' },
  '14': { tipo: 'alimentadora', label: '14', desc: '14 San Pedro Nopalcalco - E. Bicentenario' },
  '15A': { tipo: 'alimentadora', label: '15A', desc: '15A La Loma - Central de Autobuses' },
  '15B': { tipo: 'alimentadora', label: '15B', desc: '15B Abetos - E. C. de Autobuses' },
  '15C': { tipo: 'alimentadora', label: '15C', desc: '15C Fracc. Colosio - E. C. de Autobuses' },
  '16': { tipo: 'alimentadora', label: '16', desc: '16 San Carlos - E. Zona Plateada' },
  '17': { tipo: 'alimentadora', label: '17', desc: '17 Tezontle - Av. Universidad' },
  '19': { tipo: 'alimentadora', label: '19', desc: '19 Parque de Poblamiento 1 y 2' },
  '20B': { tipo: 'alimentadora', label: '20B', desc: '20B Ruta Incluyente Poniente - Oriente' },
  'T-SIN ASIGNAR': { tipo: 'troncal', label: 'T-SIN ASIGNAR', desc: 'Troncal Sin Asignar' },
  'SIN ASIGNAR': { tipo: 'alimentadora', label: 'SIN ASIGNAR', desc: 'Alimentadora Sin Asignar' }
};

const normalizeRutaKey = (rawRuta, tipoUnidad) => {
  if (!rawRuta || rawRuta.trim() === '' || rawRuta.toUpperCase().includes('SIN ASIGNAR')) {
    const isTroncal = (tipoUnidad || '').toUpperCase().includes('URBANUS');
    return isTroncal ? 'T-SIN ASIGNAR' : 'SIN ASIGNAR';
  }
  let clean = rawRuta.toUpperCase().trim();
  const tMatch = clean.match(/^T\s*[-_]?\s*0*(\d+)/i);
  if (tMatch) return 'T' + tMatch[1].padStart(2, '0');

  clean = clean.replace(/^(RA|ALIMENTADORA|RUTA)\s*[-_]?\s*/i, '');
  if (clean === '4A') clean = '4';
  const m = clean.match(/^0*(\d+[A-Z]*)/i);
  if (m) return m[1].toUpperCase();
  return clean;
};

export default function CentroControl() {
  const navigate = useNavigate();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingStats, setIsGeneratingStats] = useState(false);
  const [isGeneratingOperacional, setIsGeneratingOperacional] = useState(false);
  const [isGeneratingProgramacion, setIsGeneratingProgramacion] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');
  const [vistaDesglose, setVistaDesglose] = useState('tipo'); // 'tipo' | 'rutas'
  const [filtroRutaCategoria, setFiltroRutaCategoria] = useState('TODAS'); // 'TODAS' | 'TRONCAL' | 'ALIMENTADORA' | 'SIN_ASIGNAR'
  const [filtroRutaTexto, setFiltroRutaTexto] = useState('');
  const [expandedRoute, setExpandedRoute] = useState(null);

  const reporteRutasRef = useRef(null);
  const reporteUnidadesRef = useRef(null);

  // ---- Titanes (activos / notificaciones) ----
  // TODO: reemplazar por datos reales cuando exista el endpoint de Titanes
  const [titanesActivos, setTitanesActivos] = useState(0);
  const [titanesNotificaciones, setTitanesNotificaciones] = useState(0);

  // ---- Carga y desglose de unidades por tipo y estatus ----
  const fetchDespachoHoy = async () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    const res = await fetch(`${API_BASE}/api/despacho/hoy`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Error de conexion');
    return res.json();
  };

  const { data: apiData = [], isLoading: cargando } = useQuery({
    queryKey: ['despacho-hoy'],
    queryFn: fetchDespachoHoy,
    refetchInterval: 10000, // Cada 10s – monitoreo activo de operaciones
  });

  // Programación inicial del día (fija desde el cambio de día operativo)
  const fetchInicioHoy = async () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    const res = await fetch(`${API_BASE}/api/despacho/inicio-hoy`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    return res.json();
  };

  const { data: inicioData = [] } = useQuery({
    queryKey: ['despacho-inicio-hoy'],
    queryFn: fetchInicioHoy,
    staleTime: 60000 * 30, // 30 min (congelado de inicio de día)
    refetchOnWindowFocus: false,
  });

  const normStr = (str) =>
    (str || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

  const modelData = React.useMemo(() => {
    return modelsConfig.map((mc) => {
      const units = (Array.isArray(apiData) ? apiData : []).filter((d) => {
        const matchesModel = normStr(d.TIPO_DE_UNIDAD).includes(normStr(mc.id));
        const est = normStr(d.ESTATUS || d.estatus);
        const isNoProgramada = est === 'NO_PROGRAMADA' || est === 'NO PROGRAMADA';
        return matchesModel && !isNoProgramada;
      });
      const getEstatus = (d) => normStr(d.ESTATUS || d.estatus);

      // Operación = todas las unidades asignadas con estatus de operación en tiempo real
      const unidadesOperacion = units.filter((d) => getEstatus(d).includes('OPERACI'));

      // Circulando = las que YA salieron de despacho (validadas con hora_real_salida_patio y no encerradas)
      const unidadesCirculando = units.filter((d) => {
        const horaSalida = (d.HORA_REAL_SALIDA_PATIO || d.HORA_SALIDA || '').toString().trim();
        const isEncerrada = Boolean(d.YA_ENCERRADA || d.ya_encerrada);
        return getEstatus(d).includes('OPERACI') && horaSalida !== '' && !isEncerrada;
      });
      // Reserva = todas las que tienen estatus 'reserva'
      const unidadesReserva      = units.filter((d) => getEstatus(d) === 'RESERVA');
      // Mantenimiento = todas las que tienen estatus 'mantenimiento'
      const unidadesMantenimiento = units.filter((d) => getEstatus(d) === 'MANTENIMIENTO');
      // Percance = todas las que tienen estatus 'percance'
      const unidadesPercance     = units.filter((d) => getEstatus(d).includes('PERCANCE'));

      const total        = units.length;
      const operacion    = unidadesOperacion.length;
      const circulando   = unidadesCirculando.length;
      const mantenimiento = unidadesMantenimiento.length;
      const reserva      = unidadesReserva.length;
      const percance     = unidadesPercance.length;
      const otros        = 0;
      
      // Total Programadas fijo: Unidades en operación programadas al inicio del día (snapshot de cambio de día)
      const programadasInicio = Array.isArray(inicioData)
        ? inicioData.filter(d => {
            const matchesModel = normStr(d.TIPO_DE_UNIDAD).includes(normStr(mc.id));
            const estatusNorm = normStr(d.ESTATUS || d.estatus);
            const isOperacion = estatusNorm.includes('OPERACI');
            return matchesModel && isOperacion;
          }).length
        : 0;

      // Ajuste para el día de hoy (fijo 130: 38 Urbanuss, 50 Vagonetas, 36 Zafiros, 6 Oriones) sin alterar la BD
      const now = new Date();
      const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const getOverrideHoy = (id) => {
        const u = (id || '').toUpperCase();
        if (u.includes('URBANU')) return 38;
        if (u.includes('VAGONETA')) return 50;
        if (u.includes('ZAFIRO')) return 36;
        if (u.includes('ORION')) return 6;
        return null;
      };

      const overrideHoy = (localDateStr === '2026-10-07' || localDateStr === '2026-10-08') ? getOverrideHoy(mc.id) : null;

      // Si el snapshot aún no tiene datos o es primera carga, usamos las unidades de operación actuales
      const programadas = overrideHoy ?? (programadasInicio > 0 ? programadasInicio : (unidadesOperacion.length || total));

      return {
        ...mc,
        total,
        programadas,
        operacion,
        circulando,
        reserva,
        mantenimiento,
        percance,
        otros,
        unidadesOperacion,
        unidadesCirculando,
        unidadesReserva,
        unidadesMantenimiento,
        unidadesPercance,
        units,
      };
    });
  }, [apiData, inicioData]);

  const totales = modelData.reduce(
    (acc, m) => ({
      total: (acc.total || 0) + (m.total || 0),
      programadas: acc.programadas + m.programadas,
      operacion: acc.operacion + m.operacion,
      circulando: (acc.circulando || 0) + (m.circulando || 0),
      reserva: acc.reserva + m.reserva,
      mantenimiento: acc.mantenimiento + m.mantenimiento,
      percance: (acc.percance || 0) + (m.percance || 0),
    }),
    { total: 0, programadas: 0, operacion: 0, circulando: 0, reserva: 0, mantenimiento: 0, percance: 0 }
  );

  const eficienciaGlobal = totales.programadas > 0 ? Math.min(100, Math.round((totales.circulando / totales.programadas) * 100)) : 0;

  const handleGenerarReporte = () => {
    descargarReportesGeneralesConAlerta(setIsGenerating);
  };

  const handleGenerarReporteEstadisticas = async () => {
    setIsGeneratingStats(true);
    try {
      // Usamos los mismos datos calculados que ya están en el componente:
      // totales, modelData, y eficienciaGlobal
      await generarPDFEstadisticasCentro(totales, modelData, eficienciaGlobal);

      Swal.fire({
        icon: 'success',
        title: '¡Reporte Generado!',
        text: 'El reporte de estadísticas se ha descargado correctamente.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error('Error al generar estadísticas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al generar el reporte de estadísticas.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setIsGeneratingStats(false);
    }
  };

  const handleGenerarReporteOperacionalPorHora = async () => {
    setIsGeneratingOperacional(true);
    try {
      if (!apiData || apiData.length === 0) {
        throw new Error('No hay datos disponibles para generar el reporte.');
      }
      await generarPDFReporteOperacionalPorHora(apiData);
      
      Swal.fire({
        icon: 'success',
        title: '¡Reporte Generado!',
        text: 'El reporte operacional por hora se ha descargado correctamente.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error('Error al generar reporte operacional:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Ocurrió un error al generar el reporte operacional por hora.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setIsGeneratingOperacional(false);
    }
  };

  const handleGenerarProgramacionOperativa = async () => {
    setIsGeneratingProgramacion(true);
    try {
      await generarPDFProgramacionOperativa(apiData, 'download', totales);
      Swal.fire({
        icon: 'success',
        title: '¡Reporte Generado!',
        text: 'La Programación Operativa se ha descargado correctamente.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error('Error al generar programación operativa:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al generar el PDF de la Programación Operativa.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setIsGeneratingProgramacion(false);
    }
  };

  // Helper para % de cada segmento de la barra apilada
  const pct = (value, total) => (total > 0 ? (value / total) * 100 : 0);

  // Helpers para la búsqueda global
  const getNumeroEconomico = (d) =>
    d.NUMERO_ECONOMICO ?? d.NO_ECONOMICO ?? d.NUM_ECONOMICO ?? d.ECONOMICO ?? d.UNIDAD ?? d.NO_UNIDAD ?? 'S/N';
  const getRuta = (d) =>
    d.RUTA ?? d.NOMBRE_RUTA ?? d.NO_RUTA ?? d.RUTA_ASIGNADA ?? 'Sin ruta asignada';
  const getCorrida = (d) => {
    const val = d.CORRIDAS ?? d.CORRIDA ?? d.corrida ?? d.corridas ?? d.MANTENIMIENTO_CORRIDA ?? d.mantenimiento_corrida;
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
    return '—';
  };
  const getConductor = (d) =>
    d.CONDUCTOR ?? d.NOMBRE_CONDUCTOR ?? d.CHOFER ?? d.NOMBRE_CHOFER ?? d.OPERADOR ?? 'Sin persona conductora asignada';
  const getTarjeton = (d) =>
    d.TARJETON ?? d.TARJETON_CONDUCTOR ?? d.NO_TARJETON ?? '—';
  const getEstatus = (d) => (d.ESTATUS || '').toUpperCase().trim();

  // Filtrado de todas las unidades si hay búsqueda
  let allUnitsFiltered = [];
  if (globalSearch.trim() !== '') {
    const term = globalSearch.toLowerCase();
    const allUnits = modelData.flatMap((m) =>
      (m.units || []).map((u) => {
        const estatus = getEstatus(u);
        const horaSalida = (u.HORA_REAL_SALIDA_PATIO || u.HORA_SALIDA || '').trim();
        let colorClass = 'operacion';
        let labelStatus = horaSalida !== '' ? 'Operación (Circulando)' : 'Operación';

        if (estatus.includes('OPERACI')) { 
          if (horaSalida !== '') {
            colorClass = 'operacion'; labelStatus = 'Operación (Circulando)'; 
          } else {
            colorClass = 'operacion'; labelStatus = 'Operación'; 
          }
        }
        else if (estatus.includes('MANTENIMIENTO')) { colorClass = 'mantenimiento'; labelStatus = 'Mantenimiento'; }
        else if (estatus.includes('RESERVA')) { colorClass = 'reserva'; labelStatus = 'Reserva'; }
        else if (estatus.includes('PERCANCE')) { colorClass = 'percance'; labelStatus = 'Percance'; }

        return { ...u, __modelInfo: m, __statusColor: colorClass, __statusLabel: labelStatus };
      })
    );

    allUnitsFiltered = allUnits.filter((u) =>
      getNumeroEconomico(u).toString().toLowerCase().includes(term) ||
      getRuta(u).toLowerCase().includes(term) ||
      getCorrida(u).toLowerCase().includes(term) ||
      getConductor(u).toLowerCase().includes(term) ||
      getTarjeton(u).toString().toLowerCase().includes(term) ||
      u.__statusLabel.toLowerCase().includes(term) ||
      u.__modelInfo.label.toLowerCase().includes(term)
    );
  }

  // ---- Desglose por Rutas (Troncales y Alimentadoras) ----
  const getUnitStatusInfo = (u) => {
    const est = getEstatus(u);
    const horaSalida = (u.HORA_REAL_SALIDA_PATIO || u.HORA_SALIDA || '').toString().trim();
    const isEncerrada = Boolean(u.YA_ENCERRADA || u.ya_encerrada);
    if (est.includes('OPERACI')) {
      if (horaSalida !== '' && !isEncerrada) {
        return { label: 'Circulando', color: 'operacion' };
      }
      return { label: 'En Patio', color: 'reserva' };
    }
    if (est.includes('MANTENIMIENTO')) return { label: 'Mantenimiento', color: 'mantenimiento' };
    if (est.includes('PERCANCE')) return { label: 'Percance', color: 'percance' };
    if (est.includes('RESERVA')) return { label: 'Reserva', color: 'reserva' };
    return { label: est || 'Registrado', color: 'reserva' };
  };

  const routeData = React.useMemo(() => {
    const list = Array.isArray(apiData) ? apiData : [];
    const routesMap = {};

    list.forEach((u) => {
      const est = (u.ESTATUS || '').toLowerCase().trim();
      if (est === 'no_programada' || est === 'no programada') return;

      const rawRuta = (u.RUTA ?? u.NOMBRE_RUTA ?? u.NO_RUTA ?? u.RUTA_ASIGNADA ?? '').toString().trim();
      const tipoUnidad = (u.TIPO_DE_UNIDAD || u.tipo || '').toString().trim();
      const key = normalizeRutaKey(rawRuta, tipoUnidad);

      if (!routesMap[key]) {
        const isTroncal = key.startsWith('T');
        const cleanKey = key.replace(/^(RA|ALIMENTADORA|RUTA)\s*[-_]?\s*/i, '');
        const info = ROUTE_DESCRIPTIONS[key] || {
          tipo: isTroncal ? 'troncal' : 'alimentadora',
          label: isTroncal ? key : cleanKey,
          desc: `Ruta ${cleanKey}`
        };
        routesMap[key] = {
          id: key,
          key,
          tipo: info.tipo,
          label: info.label,
          desc: info.desc,
          units: [],
        };
      }
      routesMap[key].units.push(u);
    });

    const result = Object.values(routesMap).map((r) => {
      const units = r.units;
      const unidadesOperacion = units.filter((d) => getEstatus(d).includes('OPERACI'));
      const unidadesCirculando = units.filter((d) => {
        const horaSalida = (d.HORA_REAL_SALIDA_PATIO || d.HORA_SALIDA || '').toString().trim();
        const isEncerrada = Boolean(d.YA_ENCERRADA || d.ya_encerrada);
        return getEstatus(d).includes('OPERACI') && horaSalida !== '' && !isEncerrada;
      });
      const unidadesReserva = units.filter((d) => getEstatus(d) === 'RESERVA');
      const unidadesMantenimiento = units.filter((d) => getEstatus(d) === 'MANTENIMIENTO');
      const unidadesPercance = units.filter((d) => getEstatus(d).includes('PERCANCE'));

      const total = units.length;
      const operacion = unidadesOperacion.length;
      const circulando = unidadesCirculando.length;
      const reserva = unidadesReserva.length;
      const mantenimiento = unidadesMantenimiento.length;
      const percance = unidadesPercance.length;
      const programadas = unidadesOperacion.length || units.length;
      const eficiencia = programadas > 0 ? Math.min(100, Math.round((circulando / programadas) * 100)) : 0;

      return {
        ...r,
        total,
        programadas,
        operacion,
        circulando,
        reserva,
        mantenimiento,
        percance,
        eficiencia,
        unidadesOperacion,
        unidadesCirculando,
        unidadesReserva,
        unidadesMantenimiento,
        unidadesPercance,
      };
    });

    return result.sort((a, b) => {
      const aSin = a.key.includes('SIN ASIGNAR');
      const bSin = b.key.includes('SIN ASIGNAR');
      if (aSin && !bSin) return 1;
      if (!aSin && bSin) return -1;

      if (a.tipo === 'troncal' && b.tipo !== 'troncal') return -1;
      if (a.tipo !== 'troncal' && b.tipo === 'troncal') return 1;

      return a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [apiData]);

  const troncalesCount = React.useMemo(() => routeData.filter(r => r.tipo === 'troncal' && !r.key.includes('SIN ASIGNAR')).length, [routeData]);
  const alimentadorasCount = React.useMemo(() => routeData.filter(r => r.tipo === 'alimentadora' && !r.key.includes('SIN ASIGNAR')).length, [routeData]);
  const sinAsignarCount = React.useMemo(() => routeData.filter(r => r.key.includes('SIN ASIGNAR')).length, [routeData]);

  const rutasVisibles = React.useMemo(() => {
    return routeData.filter(r => {
      if (filtroRutaCategoria === 'TRONCAL' && (r.tipo !== 'troncal' || r.key.includes('SIN ASIGNAR'))) return false;
      if (filtroRutaCategoria === 'ALIMENTADORA' && (r.tipo !== 'alimentadora' || r.key.includes('SIN ASIGNAR'))) return false;
      if (filtroRutaCategoria === 'SIN_ASIGNAR' && !r.key.includes('SIN ASIGNAR')) return false;

      if (filtroRutaTexto.trim() !== '') {
        const query = filtroRutaTexto.toLowerCase().trim();
        const matchLabel = r.label.toLowerCase().includes(query);
        const matchDesc = r.desc.toLowerCase().includes(query);
        const matchUnits = r.units.some(u => {
          const eco = (u.NUMERO_ECONOMICO ?? u.ECONOMICO ?? '').toString().toLowerCase();
          const cond = (u.CONDUCTOR ?? u.NOMBRE_CONDUCTOR ?? '').toLowerCase();
          const cor = getCorrida(u).toLowerCase();
          return eco.includes(query) || cond.includes(query) || cor.includes(query);
        });
        if (!matchLabel && !matchDesc && !matchUnits) return false;
      }
      return true;
    });
  }, [routeData, filtroRutaCategoria, filtroRutaTexto]);

  // Obtenemos la fecha actual formateada en español
  const fechaActual = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <div className="centro-page">
        <Header title="Centro de Control" eyebrow="Panel administrativo" />

        <main className="centro-main">
          <div className="centro-welcome">
            <p className="page-eyebrow">Visión general de la flota</p>
            <h1 className="page-title">MONITOREO DE LA OPERACIÓN</h1>
            <p className="centro-date">{fechaActual}</p>
            <p className="centro-subtitle">
              Consulta el total de unidades programadas, su estatus operativo
              y genera reportes generales de la mesa de control.
            </p>
          </div>

          <div className="centro-kpis-actions" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {/* Botón Titanes */}
            <button
              type="button"
              className="centro-btn-plano"
              onClick={() => navigate('/reportestitanes')}
              style={{ position: 'relative' }}
            >
              <span
                title="Titanes activos"
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '-10px',
                  minWidth: '22px',
                  height: '22px',
                  padding: '0 5px',
                  borderRadius: '999px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.4)',
                  border: '2px solid #ffffff',
                  lineHeight: 1,
                }}
              >
                {titanesActivos}
              </span>

              {titanesNotificaciones > 0 && (
                <span
                  title="Notificaciones"
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 5px',
                    borderRadius: '999px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
                    border: '2px solid #ffffff',
                    lineHeight: 1,
                  }}
                >
                  {titanesNotificaciones}
                </span>
              )}

              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              Titanes
            </button>

            {/* ===== NUEVO BOTÓN BITÁCORA ===== */}
            <button
              type="button"
              className="centro-btn-plano centro-btn-plano--bitacora"
              onClick={() => navigate('/centro-control/bitacoras')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Bitácora
            </button>


            {/* Botón Plano de Patio */}
            <button
              type="button"
              className="centro-btn-plano"
              onClick={() => navigate('/plano-patio')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
                <path d="M9 3v15" />
                <path d="M15 6v15" />
              </svg>
              Ver Plano de Patio
            </button>
          </div>

          {/* ---------- KPIs globales ---------- */}
          <section className="centro-kpis">
            {/* ... resto de KPIs (sin cambios) ... */}
            <div className="centro-kpi centro-kpi--total">
              <div className="centro-kpi__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <path d="M16 8h4l3 5v3h-7V8z" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <span className="centro-kpi__value">{cargando ? '—' : totales.programadas}</span>
              <span className="centro-kpi__label">Total Programadas</span>
            </div>

            <div className="centro-kpi centro-kpi--operacion">
              <div className="centro-kpi__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <span className="centro-kpi__value">{cargando ? '—' : totales.circulando}</span>
              <span className="centro-kpi__label">En operación</span>
            </div>

            <div className="centro-kpi centro-kpi--reserva">
              <div className="centro-kpi__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="centro-kpi__value">{cargando ? '—' : totales.reserva}</span>
              <span className="centro-kpi__label">En Reserva</span>
            </div>

            <div className="centro-kpi centro-kpi--mantenimiento">
              <div className="centro-kpi__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a4 4 0 1 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 1 1 5.4-5.4z" />
                </svg>
              </div>
              <span className="centro-kpi__value">{cargando ? '—' : totales.mantenimiento}</span>
              <span className="centro-kpi__label">En Mantenimiento</span>
            </div>

            <div className="centro-kpi centro-kpi--percance">
              <div className="centro-kpi__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <span className="centro-kpi__value">{cargando ? '—' : totales.percance}</span>
              <span className="centro-kpi__label">En Percance</span>
            </div>

            <div className="centro-kpi" style={{ borderLeft: '4px solid #d97706', background: 'linear-gradient(to right, rgba(251, 191, 36, 0.08), #ffffff)', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.1)' }}>
              <div className="centro-kpi__icon" style={{ color: '#d97706', background: 'rgba(217, 119, 6, 0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <span className="centro-kpi__value" style={{ color: '#92400e' }}>{cargando ? '—' : `${eficienciaGlobal}%`}</span>
              <span className="centro-kpi__label" style={{ color: '#b45309', fontWeight: 'bold' }}>Eficiencia operativa</span>
            </div>
          </section>

          {/* ---------- Header de Desglose con Selector de Vistas ---------- */}
          <section className="centro-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <h2>{vistaDesglose === 'tipo' ? 'Desglose por tipo de unidad' : 'Desglose por rutas'}</h2>

              {/* Segmented Control / Selector de Pestañas */}
              <div className="centro-view-selector" role="tablist" aria-label="Modo de desglose">
                <button
                  type="button"
                  role="tab"
                  aria-selected={vistaDesglose === 'tipo'}
                  className={`centro-view-tab ${vistaDesglose === 'tipo' ? 'active' : ''}`}
                  onClick={() => setVistaDesglose('tipo')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M7 17h10M7 7h10M7 12h10" />
                  </svg>
                  <span>Por tipo de unidad</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={vistaDesglose === 'rutas'}
                  className={`centro-view-tab ${vistaDesglose === 'rutas' ? 'active' : ''}`}
                  onClick={() => setVistaDesglose('rutas')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="19" r="3" />
                    <path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H5" />
                    <path d="M18 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                  <span>Por rutas</span>
                </button>
              </div>
            </div>

            <div className="centro-search-wrapper" style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '350px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Buscar unidad en toda la flota..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value.replace(/[^a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚ]/g, ''))}
                style={{
                  width: '100%',
                  padding: '8px 16px 8px 38px',
                  borderRadius: '999px',
                  border: '1.5px solid #e5e7eb',
                  outline: 'none',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#ffffff',
                  color: '#111827'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#601a2a';
                  e.target.style.boxShadow = '0 0 0 3px rgba(96, 26, 42, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </section>

          {globalSearch.trim() !== '' ? (
            <section className="centro-global-results" style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 16px rgba(96, 26, 42, 0.08)', overflow: 'hidden', marginBottom: '32px' }}>
              {allUnitsFiltered.length > 0 ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 100px 1fr 90px 100px 1.2fr', gap: '12px', alignItems: 'center', padding: '12px 20px', background: '#f9fafb', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                    <span>Unidad</span>
                    <span>Modelo</span>
                    <span>Estatus</span>
                    <span>Ruta</span>
                    <span>Corrida</span>
                    <span>Tarjetón</span>
                    <span>Conductor</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {allUnitsFiltered.map((u, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 100px 100px 1fr 90px 100px 1.2fr', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#111827' }}>
                        <span style={{ fontWeight: '700', color: '#601a2a' }}>{getNumeroEconomico(u)}</span>
                        <span style={{ fontWeight: '600' }}>{u.__modelInfo.label}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', width: 'fit-content', color: u.__statusColor === 'operacion' ? '#059669' : u.__statusColor === 'reserva' ? '#b45309' : u.__statusColor === 'mantenimiento' ? '#dc2626' : '#4b5563', backgroundColor: u.__statusColor === 'operacion' ? '#ecfdf5' : u.__statusColor === 'reserva' ? '#fffbeb' : u.__statusColor === 'mantenimiento' ? '#fef2f2' : '#f3f4f6' }}>
                          {u.__statusLabel}
                        </span>
                        <span>{getRuta(u)}</span>
                        <span style={{ fontWeight: '600', color: '#1e40af' }}>{getCorrida(u)}</span>
                        <span>{getTarjeton(u)}</span>
                        <span>{getConductor(u)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', padding: '40px 0', margin: 0 }}>
                  No se encontraron unidades con ese término de búsqueda.
                </p>
              )}
            </section>
          ) : vistaDesglose === 'tipo' ? (
            <section className="centro-type-grid">
              {modelsConfig.map((mc) => {
                const m = modelData.find((x) => x.id === mc.id) || {
                  programadas: 0,
                  operacion: 0,
                  reserva: 0,
                  mantenimiento: 0,
                };
                return (
                  <div
                    className={`centro-type-card centro-type-card--${mc.color} ${!cargando ? 'centro-type-card--clickable' : ''}`}
                    style={cargando ? { opacity: 0.8, cursor: 'not-allowed' } : {}}
                    key={mc.id}
                    onClick={() => !cargando && navigate(`/centro-control/detalle/${mc.id}`, { state: { model: m } })}
                    role="button"
                    tabIndex={cargando ? -1 : 0}
                    onKeyDown={(e) => {
                      if (!cargando && (e.key === 'Enter' || e.key === ' ')) {
                        navigate(`/centro-control/detalle/${mc.id}`, { state: { model: m } });
                      }
                    }}
                  >
                    <div className="centro-type-card__header">
                      <img src={mc.image} alt={mc.label} className="centro-type-card__image" />
                      <div className="centro-type-card__heading">
                        <span className="centro-type-card__label">{mc.label}</span>
                        <span className="centro-type-card__total">
                          {cargando ? '—' : `${m.total ?? m.units?.length ?? m.programadas} unidades`}
                        </span>
                      </div>
                    </div>

                    <div className="centro-bar" role="img" aria-label={`Distribución de estatus ${mc.label}`}>
                      <span
                        className="centro-bar__seg centro-bar__seg--operacion"
                        style={{ width: `${pct(m.operacion, m.total || m.programadas)}%` }}
                      />
                      <span
                        className="centro-bar__seg centro-bar__seg--reserva"
                        style={{ width: `${pct(m.reserva, m.total || m.programadas)}%` }}
                      />
                      <span
                        className="centro-bar__seg centro-bar__seg--mantenimiento"
                        style={{ width: `${pct(m.mantenimiento, m.total || m.programadas)}%` }}
                      />
                      <span
                        className="centro-bar__seg centro-bar__seg--percance"
                        style={{ width: `${pct(m.percance, m.total || m.programadas)}%` }}
                      />
                    </div>

                    <div className="centro-status-list">
                      <div className="centro-status-row">
                        <span className="centro-status-dot centro-status-dot--operacion" />
                        <span className="centro-status-label">Operación</span>
                        <span className="centro-status-percent centro-status-percent--operacion">
                          {cargando ? '—' : `${Math.round(pct(m.operacion, m.total || m.programadas))}%`}
                        </span>
                        <span className="centro-status-value">{cargando ? '—' : m.operacion}</span>
                      </div>
                      <div className="centro-status-row">
                        <span className="centro-status-dot centro-status-dot--reserva" />
                        <span className="centro-status-label">Reserva</span>
                        <span className="centro-status-percent centro-status-percent--reserva">
                          {cargando ? '—' : `${Math.round(pct(m.reserva, m.total || m.programadas))}%`}
                        </span>
                        <span className="centro-status-value">{cargando ? '—' : m.reserva}</span>
                      </div>
                      <div className="centro-status-row">
                        <span className="centro-status-dot centro-status-dot--mantenimiento" />
                        <span className="centro-status-label">Mantenimiento</span>
                        <span className="centro-status-percent centro-status-percent--mantenimiento">
                          {cargando ? '—' : `${Math.round(pct(m.mantenimiento, m.total || m.programadas))}%`}
                        </span>
                        <span className="centro-status-value">{cargando ? '—' : m.mantenimiento}</span>
                      </div>
                      <div className="centro-status-row">
                        <span className="centro-status-dot centro-status-dot--percance" />
                        <span className="centro-status-label">Percance</span>
                        <span className="centro-status-percent centro-status-percent--percance">
                          {cargando ? '—' : `${Math.round(pct(m.percance, m.total || m.programadas))}%`}
                        </span>
                        <span className="centro-status-value">{cargando ? '—' : m.percance}</span>
                      </div>
                      <div className="centro-status-row" style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #f3f4f6' }}>
                        <span className="centro-status-dot" style={{ backgroundColor: '#d97706' }} />
                        <span className="centro-status-label" style={{ fontWeight: '600', color: '#92400e' }}>Eficiencia</span>
                        <span className="centro-status-percent" style={{ color: '#b45309', backgroundColor: '#fef3c7', fontWeight: 'bold' }}>
                          {cargando ? '—' : `${Math.min(100, Math.round(pct(m.circulando, m.operacion || m.programadas)))}%`}
                        </span>
                        <span className="centro-status-value"></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : (
            <>
              {/* ---------- Barra de Subfiltros para Rutas ---------- */}
              <div className="centro-route-toolbar">
                <div className="centro-route-pills">
                  <button
                    type="button"
                    className={`centro-route-pill ${filtroRutaCategoria === 'TODAS' ? 'active' : ''}`}
                    onClick={() => setFiltroRutaCategoria('TODAS')}
                  >
                    <span>Todas las rutas</span>
                    <span className="centro-route-pill__count">{routeData.length}</span>
                  </button>

                  <button
                    type="button"
                    className={`centro-route-pill ${filtroRutaCategoria === 'TRONCAL' ? 'active' : ''}`}
                    onClick={() => setFiltroRutaCategoria('TRONCAL')}
                  >
                    <span>Troncales</span>
                    <span className="centro-route-pill__count">{troncalesCount}</span>
                  </button>

                  <button
                    type="button"
                    className={`centro-route-pill ${filtroRutaCategoria === 'ALIMENTADORA' ? 'active' : ''}`}
                    onClick={() => setFiltroRutaCategoria('ALIMENTADORA')}
                  >
                    <span>Alimentadoras</span>
                    <span className="centro-route-pill__count">{alimentadorasCount}</span>
                  </button>

                  {sinAsignarCount > 0 && (
                    <button
                      type="button"
                      className={`centro-route-pill ${filtroRutaCategoria === 'SIN_ASIGNAR' ? 'active' : ''}`}
                      onClick={() => setFiltroRutaCategoria('SIN_ASIGNAR')}
                    >
                      <span>Sin Asignar</span>
                      <span className="centro-route-pill__count">{sinAsignarCount}</span>
                    </button>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Filtrar ruta (ej. T01, 2A)..."
                    value={filtroRutaTexto}
                    onChange={(e) => setFiltroRutaTexto(e.target.value)}
                    className="centro-route-filter-input"
                  />
                  {filtroRutaTexto && (
                    <button
                      type="button"
                      onClick={() => setFiltroRutaTexto('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px', padding: 0 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* ---------- Grid de Tarjetas de Rutas ---------- */}
              {rutasVisibles.length > 0 ? (
                <section className="centro-route-grid">
                  {rutasVisibles.map((r) => {
                    const isExpanded = expandedRoute === r.key;
                    const isTroncal = r.tipo === 'troncal';
                    const isSinAsignar = r.key.includes('SIN ASIGNAR');
                    const cardModifier = isTroncal ? 'troncal' : isSinAsignar ? 'sin-asignar' : 'alimentadora';

                    return (
                      <div
                        key={r.key}
                        className={`centro-route-card centro-route-card--${cardModifier} ${!cargando ? 'centro-route-card--clickable' : ''}`}
                        style={cargando ? { opacity: 0.8, cursor: 'not-allowed' } : {}}
                        onClick={() => !cargando && navigate(`/centro-control/detalle/ruta-${r.key}`, { state: { model: { ...r, isRoute: true } } })}
                        role="button"
                        tabIndex={cargando ? -1 : 0}
                        onKeyDown={(e) => {
                          if (!cargando && (e.key === 'Enter' || e.key === ' ')) {
                            navigate(`/centro-control/detalle/ruta-${r.key}`, { state: { model: { ...r, isRoute: true } } });
                          }
                        }}
                      >
                        <div className="centro-route-card__header">
                          <div className="centro-route-card__badges">
                            <span className={`centro-route-badge centro-route-badge--${cardModifier}`}>
                              {r.label}
                            </span>
                            <span className={`centro-route-type-tag centro-route-type-tag--${cardModifier}`}>
                              {isTroncal ? 'TRONCAL' : isSinAsignar ? 'SIN ASIGNAR' : 'ALIMENTADORA'}
                            </span>
                          </div>
                          <span className="centro-route-card__total">
                            {cargando ? '—' : `${r.total ?? r.units?.length ?? r.programadas} ${(r.total ?? r.units?.length ?? r.programadas) === 1 ? 'unidad' : 'unidades'}`}
                          </span>
                        </div>

                        <p className="centro-route-card__desc" title={r.desc}>
                          {r.desc}
                        </p>

                        {/* Barra apilada */}
                        <div className="centro-bar" role="img" aria-label={`Distribución ruta ${r.label}`}>
                          <span
                            className="centro-bar__seg centro-bar__seg--operacion"
                            style={{ width: `${pct(r.operacion, r.total || r.programadas)}%` }}
                            title={`Operación: ${r.operacion}`}
                          />
                          <span
                            className="centro-bar__seg centro-bar__seg--reserva"
                            style={{ width: `${pct(r.reserva, r.total || r.programadas)}%` }}
                            title={`Reserva: ${r.reserva}`}
                          />
                          <span
                            className="centro-bar__seg centro-bar__seg--mantenimiento"
                            style={{ width: `${pct(r.mantenimiento + r.percance, r.total || r.programadas)}%` }}
                            title={`Mantenimiento: ${r.mantenimiento + r.percance}`}
                          />
                        </div>

                        {/* Lista de estatus */}
                        <div className="centro-status-list">
                          <div className="centro-status-row">
                            <span className="centro-status-dot centro-status-dot--operacion" />
                            <span className="centro-status-label">Operación</span>
                            <span className="centro-status-percent centro-status-percent--operacion">
                              {cargando ? '—' : `${Math.round(pct(r.operacion, r.total || r.programadas))}%`}
                            </span>
                            <span className="centro-status-value">{cargando ? '—' : r.operacion}</span>
                          </div>
                          <div className="centro-status-row">
                            <span className="centro-status-dot centro-status-dot--reserva" />
                            <span className="centro-status-label">Reserva</span>
                            <span className="centro-status-percent centro-status-percent--reserva">
                              {cargando ? '—' : `${Math.round(pct(r.reserva, r.total || r.programadas))}%`}
                            </span>
                            <span className="centro-status-value">{cargando ? '—' : r.reserva}</span>
                          </div>
                          <div className="centro-status-row">
                            <span className="centro-status-dot centro-status-dot--mantenimiento" />
                            <span className="centro-status-label">Mantenimiento</span>
                            <span className="centro-status-percent centro-status-percent--mantenimiento">
                              {cargando ? '—' : `${Math.round(pct(r.mantenimiento + r.percance, r.total || r.programadas))}%`}
                            </span>
                            <span className="centro-status-value">{cargando ? '—' : r.mantenimiento + r.percance}</span>
                          </div>
                          <div className="centro-status-row" style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #f3f4f6' }}>
                            <span className="centro-status-dot" style={{ backgroundColor: '#d97706' }} />
                            <span className="centro-status-label" style={{ fontWeight: '600', color: '#92400e' }}>Eficiencia</span>
                            <span className="centro-status-percent" style={{ color: '#b45309', backgroundColor: '#fef3c7', fontWeight: 'bold' }}>
                              {cargando ? '—' : `${r.eficiencia}%`}
                            </span>
                            <span className="centro-status-value"></span>
                          </div>
                        </div>

                        {/* Pie interactivo para navegar al detalle */}
                        <div className="centro-route-card__footer">
                          <span>Ver detalle de unidades ({r.units.length})</span>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </section>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 20px', background: '#ffffff', borderRadius: '16px', border: '1px dashed #e2e8f0', color: '#64748b', marginBottom: '32px' }}>
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', color: '#94a3b8' }}>
                    <circle cx="6" cy="19" r="3" />
                    <path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H5" />
                    <path d="M18 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>No se encontraron rutas con el filtro seleccionado.</p>
                  <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Prueba seleccionando otra categoría o limpiando la búsqueda.</p>
                </div>
              )}
            </>
          )}

          {/* ---------- Acciones ---------- */}
          <section className="centro-actions">
            {/* 1. Reporte General */}
            <button
              className="centro-btn-report centro-btn-report--gral"
              onClick={handleGenerarReporte}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <><span className="centro-spinner"></span> Generando PDFs...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M8 18v-2"></path>
                    <path d="M12 18v-4"></path>
                    <path d="M16 18v-6"></path>
                  </svg>
                  Reporte General
                </>
              )}
            </button>

            {/* 2. Reporte Estadístico */}
            <button
              className="centro-btn-report centro-btn-report--estadistico"
              onClick={handleGenerarReporteEstadisticas}
              disabled={isGeneratingStats || cargando}
            >
              {isGeneratingStats ? (
                <><span className="centro-spinner"></span> Generando...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18"></path>
                    <path d="M18 17V9"></path>
                    <path d="M13 17V5"></path>
                    <path d="M8 17v-3"></path>
                  </svg>
                  Reporte Estadístico
                </>
              )}
            </button>

            {/* 3. Ver Resumen de Mesa de Control */}
            <button
              className="centro-btn-report centro-btn-report--mesa"
              onClick={() => navigate('/resumen-despacho')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                <path d="M12 11h4"></path>
                <path d="M12 16h4"></path>
                <path d="M8 11h.01"></path>
                <path d="M8 16h.01"></path>
              </svg>
              Ver Resumen de Mesa de Control
            </button>
            
            {/* 4. Reporte Operativo por Hora */}
            <button
              className="centro-btn-report centro-btn-report--hora"
              onClick={handleGenerarReporteOperacionalPorHora}
              disabled={isGeneratingOperacional || cargando}
            >
              {isGeneratingOperacional ? (
                <><span className="centro-spinner"></span> Generando...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  Reporte Operativo por Hora
                </>
              )}
            </button>

            {/* 5. Descargar Programación Operativa */}
            <button
              className="centro-btn-report centro-btn-report--descargar"
              onClick={handleGenerarProgramacionOperativa}
              disabled={isGeneratingProgramacion || cargando || !apiData.length}
            >
              {isGeneratingProgramacion ? (
                <><span className="centro-spinner"></span> Generando...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Descargar Programación Operativa
                </>
              )}
            </button>
          </section>
        </main>
      </div>
    </>
  );
}