import Swal from 'sweetalert2';
import API_BASE from '../config/api';
import { generarPDFReporteGeneral } from './generarPDFReporteGeneral';
import { generarPDFReporteUnidades } from './generarPDFReporteUnidades';
import { generarPDFProgramacionOperativa } from './generarPDFProgramacionOperativa';

const MODELOS_CONFIG = [
  { id: 'URBANUS' },
  { id: 'ZAFIRO' },
  { id: 'VAGONETA' },
  { id: 'ORION' },
];

const MAPA_RUTAS = {
  'T-01': 'T01', 'T-02': 'T02', 'T-04': 'T04', 'T-05': 'T05',
  'RA 2A': '2A', 'RA 2B': '2B', '20B': '20B', 'RA 2D': '2D', 
  'RA 3': '03', 'RA 4': '04', 'RA 6': '06', 'RA 8': '08', 
  'RA 11': '11', 'RA 14': '14', 'RA 15A': '15A', 'RA 15B': '15B',
};

export const procesarDatosReportesGenerales = (apiData, inicioData = null) => {
  const list = Array.isArray(apiData) ? apiData : [];
  const listInicio = Array.isArray(inicioData) ? inicioData : null;

  const normStr = (str) =>
    (str || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

  const tipos = MODELOS_CONFIG.map(({ id }) => {
    const unidades = list.filter((u) => {
      const match = normStr(u.TIPO_DE_UNIDAD || u.tipo).includes(normStr(id));
      const est = normStr(u.ESTATUS || u.estatus);
      return match && est.includes('OPERACI');
    });

    // Regla de inicio operativo (snapshot de cambio de día a las 00:00) o conteo de operación
    let programadasCalculadas = unidades.length;
    if (listInicio && listInicio.length > 0) {
      const progInicio = listInicio.filter((u) => {
        const match = normStr(u.TIPO_DE_UNIDAD || u.tipo).includes(normStr(id));
        const est = normStr(u.ESTATUS || u.estatus);
        return match && est.includes('OPERACI');
      }).length;
      if (progInicio > 0) {
        programadasCalculadas = progInicio;
      }
    }

    const enServicio = unidades.filter((u) => {
      const est = normStr(u.ESTATUS || u.estatus);
      const isEncerrada = Boolean(u.YA_ENCERRADA || u.ya_encerrada || u.yaEncerrada);
      const horaSalida = (u.HORA_REAL_SALIDA_PATIO || u.hora_real_salida_patio || u.HORA_SALIDA || u.hora_salida || '').toString().trim();
      const isDesincorporada = isEncerrada || est.includes('RESERVA') || est.includes('MANTENIMIENTO') || est.includes('PERCANCE');
      const isOperacion = est.includes('OPERACI') 
        && !isDesincorporada
        && horaSalida !== '';
      return isOperacion;
    }).length;

    return { tipo: id, programadas: programadasCalculadas, en_servicio: enServicio, imagen: 'default.png' };
  });

  const totales = tipos.reduce((acc, t) => ({
    programadas: acc.programadas + t.programadas,
    en_servicio: acc.en_servicio + t.en_servicio,
  }), { programadas: 0, en_servicio: 0 });

  // Función normalizadora de rutas basada en Monitoreo Operativo
  const normalizarRutaReporte = (rawRuta, tipoUnidad) => {
    const tipoNorm = normStr(tipoUnidad);
    const isTroncal = tipoNorm.includes('URBANU');
    const rutaStr = (rawRuta || '').toString().trim();

    if (!rutaStr || normStr(rutaStr).includes('SIN ASIGNAR')) {
      return isTroncal ? 'T-SIN ASIGNAR' : 'RA-SIN ASIGNAR';
    }

    let clean = rutaStr.toUpperCase().trim();

    // Troncal explícita: T01, T-01, T 01, T1
    const tMatch = clean.match(/^T\s*[-_]?\s*0*(\d+)/i);
    if (tMatch) {
      return 'T-' + tMatch[1].padStart(2, '0');
    }

    // Troncal por tipo de unidad si sólo viene el número
    if (isTroncal) {
      const numMatch = clean.match(/^0*(\d+)/);
      if (numMatch) {
        return 'T-' + numMatch[1].padStart(2, '0');
      }
      return 'T-SIN ASIGNAR';
    }

    // Alimentadoras
    clean = clean.replace(/^(RA|ALIMENTADORA|RUTA)\s*[-_]?\s*/i, '').trim();
    if (clean === '4A') clean = '4';
    if (clean === '20B') clean = '2B';

    const m = clean.match(/^0*(\d+[A-Z]*)/i);
    const rutaKey = m ? 'RA ' + m[1].toUpperCase() : 'RA ' + clean;

    const RUTAS_OFICIALES = [
      'RA 2A', 'RA 2B', 'RA 2D', 'RA 3', 'RA 4', 
      'RA 6', 'RA 8', 'RA 11', 'RA 14', 'RA 15A', 'RA 15B'
    ];

    if (RUTAS_OFICIALES.includes(rutaKey)) {
      return rutaKey;
    }
    return 'RA-SIN ASIGNAR';
  };

  const RUTAS_TRONCAL_DEFAULT = ['T-01', 'T-02', 'T-04', 'T-05'];
  const RUTAS_ALIMENTADORA_DEFAULT = [
    'RA 2A', 'RA 2B', 'RA 2D', 'RA 3', 'RA 4', 
    'RA 6', 'RA 8', 'RA 11', 'RA 14', 'RA 15A', 'RA 15B',
    'RA-SIN ASIGNAR'
  ];

  const contadoresRutas = {};
  [...RUTAS_TRONCAL_DEFAULT, ...RUTAS_ALIMENTADORA_DEFAULT].forEach((r) => {
    contadoresRutas[r] = { en_operacion: 0, en_mantenimiento: 0 };
  });

  let troncalMantenimientoTotal = 0;
  let alimMantenimientoTotal = 0;

  list.forEach((reg) => {
    const estatus = normStr(reg.ESTATUS || reg.estatus);
    const tipo = normStr(reg.TIPO_DE_UNIDAD || reg.tipo);
    const isTroncal = tipo.includes('URBANU');

    if (estatus === 'NO_PROGRAMADA' || estatus === 'NO PROGRAMADA') return;

    const isOper = estatus.includes('OPERACI');
    const isManto = estatus.includes('MANTENIMIENTO');

    if (isManto) {
      if (isTroncal) troncalMantenimientoTotal++;
      else alimMantenimientoTotal++;
    }

    if (isOper) {
      const rutaRaw = reg.RUTA ?? reg.ruta ?? reg.NOMBRE_RUTA ?? reg.no_ruta ?? '';
      const rutaKey = normalizarRutaReporte(rutaRaw, tipo);

      if (contadoresRutas[rutaKey]) {
        contadoresRutas[rutaKey].en_operacion++;
      } else {
        const fallback = isTroncal ? 'T-01' : 'RA-SIN ASIGNAR';
        if (contadoresRutas[fallback]) {
          contadoresRutas[fallback].en_operacion++;
        }
      }
    }
  });

  const dataRutas = [
    ...RUTAS_TRONCAL_DEFAULT.map((r, i) => ({
      ruta: r,
      tipo: 'troncal',
      en_operacion: contadoresRutas[r]?.en_operacion || 0,
      en_mantenimiento: i === 0 ? troncalMantenimientoTotal : 0,
    })),
    ...RUTAS_ALIMENTADORA_DEFAULT.map((r, i) => ({
      ruta: r,
      tipo: 'alimentadora',
      en_operacion: contadoresRutas[r]?.en_operacion || 0,
      en_mantenimiento: i === 0 ? alimMantenimientoTotal : 0,
    })),
  ];

  const totalsRutas = {
    troncalMantenimiento: troncalMantenimientoTotal,
    alimentadoraMantenimiento: alimMantenimientoTotal,
  };

  return { dataUnidades: { tipos, totales }, dataRutas, totalsRutas };
};

export const descargarReportesGeneralesConAlerta = async (setLoading, queryClient = null) => {
  setLoading(true);
  try {
    let data = queryClient?.getQueryData ? queryClient.getQueryData(['despacho-hoy']) : null;
    let inicioData = queryClient?.getQueryData ? queryClient.getQueryData(['despacho-inicio-hoy']) : null;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!data || !Array.isArray(data) || data.length === 0) {
      const res = await fetch(`${API_BASE}/api/despacho/hoy`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Error al consultar datos');
      data = await res.json();
      if (queryClient?.setQueryData) {
        queryClient.setQueryData(['despacho-hoy'], data);
      }
    }

    if (!inicioData || !Array.isArray(inicioData) || inicioData.length === 0) {
      try {
        const resInicio = await fetch(`${API_BASE}/api/despacho/inicio-hoy`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (resInicio.ok) {
          inicioData = await resInicio.json();
          if (queryClient?.setQueryData) {
            queryClient.setQueryData(['despacho-inicio-hoy'], inicioData);
          }
        }
      } catch (e) {
        inicioData = null;
      }
    }

    const { dataUnidades, dataRutas, totalsRutas } = procesarDatosReportesGenerales(data, inicioData);
    await generarPDFReporteGeneral(dataRutas, totalsRutas);
    await generarPDFReporteUnidades(dataUnidades);
    Swal.fire({
      icon: 'success',
      title: '¡Reportes Generados!',
      text: 'Se han descargado los dos reportes correctamente.',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err.message || 'Error al generar los reportes.',
      confirmButtonColor: '#601a2a',
    });
  } finally {
    setLoading(false);
  }
};

export const calcularTotalesOperativos = (apiData) => {
  const models = ['URBANUS', 'ZAFIRO', 'VAGONETA', 'ORION'];
  const list = Array.isArray(apiData) ? apiData : [];

  return models.reduce((acc, modelId) => {
    const units = list.filter((d) => {
      const match = (d.TIPO_DE_UNIDAD || d.tipo || '').toUpperCase().includes(modelId);
      const est = (d.ESTATUS || d.estatus || '').toLowerCase().trim();
      return match && est !== 'no_programada' && est !== 'no programada';
    });

    const getEstatus = (d) => (d.ESTATUS || d.estatus || '').toUpperCase().trim();

    const operacion = units.filter((d) => {
      const horaSalida = (d.HORA_REAL_SALIDA_PATIO || d.hora_real_salida_patio || d.HORA_SALIDA || d.hora_salida || '').toString().trim();
      const isEncerrada = Boolean(d.YA_ENCERRADA || d.ya_encerrada);
      return horaSalida !== '' && !isEncerrada;
    }).length;

    const reserva = units.filter((d) => getEstatus(d) === 'RESERVA').length;
    const mantenimiento = units.filter((d) => getEstatus(d) === 'MANTENIMIENTO').length;
    const programadas = units.filter((d) => getEstatus(d).includes('OPERACI')).length;

    return {
      programadas: acc.programadas + programadas,
      operacion: acc.operacion + operacion,
      reserva: acc.reserva + reserva,
      mantenimiento: acc.mantenimiento + mantenimiento,
    };
  }, { programadas: 0, operacion: 0, reserva: 0, mantenimiento: 0 });
};

export const descargarProgramacionOperativaDespachoConAlerta = async (setLoading, queryClient = null) => {
  setLoading(true);
  try {
    let data = queryClient?.getQueryData ? queryClient.getQueryData(['despacho-hoy']) : null;
    if (!data || !Array.isArray(data) || data.length === 0) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/despacho/hoy`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Error al consultar datos');
      data = await res.json();
      if (queryClient?.setQueryData) {
        queryClient.setQueryData(['despacho-hoy'], data);
      }
    }

    const totales = calcularTotalesOperativos(data);

    await generarPDFProgramacionOperativa(data, 'download', totales, {
      omitirRelevosYPatioNorte: true,
      nombreArchivo: 'Programacion_Operativa_Despacho.pdf',
    });

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
  } catch (err) {
    console.error('Error al generar programación operativa:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err.message || 'Error al generar la Programación Operativa.',
      confirmButtonColor: '#601a2a',
    });
  } finally {
    setLoading(false);
  }
};
