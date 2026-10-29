import Swal from 'sweetalert2';
import API_BASE from '../config/api';
import { generarPDFReporteGeneral } from './generarPDFReporteGeneral';
import { generarPDFReporteUnidades } from './generarPDFReporteUnidades';
import { generarPDFProgramacionOperativa } from './generarPDFProgramacionOperativa';
import { compareRutas } from './rutaUtils';

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

export const procesarDatosReportesGenerales = (apiData, inicioData = null, catalogoRutas = null) => {
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
      programadasCalculadas = progInicio;
    } else {
      const progFallback = list.filter((u) => {
        const match = normStr(u.TIPO_DE_UNIDAD || u.tipo).includes(normStr(id));
        const est = normStr(u.ESTATUS || u.estatus);
        const hasService = Boolean(u.RUTA || u.ruta || u.MANTENIMIENTO_RUTA || u.mantenimiento_ruta);
        return match && (est.includes('OPERACI') || hasService);
      }).length;
      if (progFallback > 0) {
        programadasCalculadas = progFallback;
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

  // Función normalizadora de rutas para Reporte General de Operaciones
  const normalizarRutaReporte = (rawRuta, tipoUnidad) => {
    const tipoNorm = normStr(tipoUnidad);
    const isTroncal = tipoNorm.includes('URBANU');
    const rutaStr = (rawRuta || '').toString().trim();

    if (!rutaStr || normStr(rutaStr).includes('SIN ASIGNAR')) {
      return isTroncal ? 'T-SIN ASIGNAR' : 'RA-SIN ASIGNAR';
    }

    let clean = rutaStr.toUpperCase().trim();

    // Troncal explícita: T01, T-01, T 01, T1
    const tMatch = clean.match(/^T\s*[-_]?\s*0*(\d+)([A-Z]*)/i);
    if (tMatch) {
      return 'T-' + tMatch[1].padStart(2, '0') + (tMatch[2] ? tMatch[2].toUpperCase() : '');
    }

    // Troncal por tipo de unidad si sólo viene el número
    if (isTroncal) {
      const numMatch = clean.match(/^0*(\d+)([A-Z]*)/);
      if (numMatch) {
        return 'T-' + numMatch[1].padStart(2, '0') + (numMatch[2] ? numMatch[2].toUpperCase() : '');
      }
      return 'T-SIN ASIGNAR';
    }

    // Alimentadoras: Limpiar prefijos comunes como RA, ALIMENTADORA, RUTA
    clean = clean.replace(/^(?:RA|ALIMENTADORA|RUTA)\s*[-_]?\s*/i, '').trim();

    // Extraer número y letra (ej. 1A, 2A, 4A, 4B, 18, 20C, 21A)
    const m = clean.match(/^0*(\d+\s*[A-Z]*)/i);
    if (m) {
      const formatted = m[1].replace(/\s+/g, '').toUpperCase();
      return 'RA ' + formatted;
    }

    // Si tiene otro identificador alfanumérico
    if (clean) {
      return 'RA ' + clean;
    }

    return null;
  };

  const catalogoList = Array.isArray(catalogoRutas)
    ? catalogoRutas
    : (Array.isArray(catalogoRutas?.data) ? catalogoRutas.data : []);

  // Extraer Troncales del Catálogo dinámico
  const troncalesDelCatalogo = catalogoList
    .filter((r) => (r.tipo || '').toLowerCase() === 'troncal')
    .map((r) => normalizarRutaReporte(r.ruta, 'URBANUS'))
    .filter((r) => r && !r.toUpperCase().includes('SIN ASIGNAR'));

  const RUTAS_TRONCAL_DEFAULT = troncalesDelCatalogo.length > 0 
    ? [...new Set(troncalesDelCatalogo)]
    : ['T-01', 'T-02', 'T-04', 'T-05'];

  // Extraer Alimentadoras del Catálogo dinámico
  const alimentadorasDelCatalogo = catalogoList
    .filter((r) => (r.tipo || '').toLowerCase() === 'alimentadora')
    .map((r) => normalizarRutaReporte(r.ruta, 'ZAFIRO'))
    .filter((r) => r && !r.toUpperCase().includes('SIN ASIGNAR'));

  const RUTAS_ALIMENTADORA_DEFAULT = alimentadorasDelCatalogo.length > 0
    ? [...new Set(alimentadorasDelCatalogo)]
    : [
      'RA 2A', 'RA 2B', 'RA 2D', 'RA 3', 'RA 4', 'RA 4B',
      'RA 6', 'RA 8', 'RA 11', 'RA 14', 'RA 15A', 'RA 15B'
    ];

  // Set de rutas válidas en el catálogo (para excluir del reporte rutas eliminadas)
  const rutasValidasSet = new Set();
  if (catalogoList.length > 0) {
    catalogoList.forEach((r) => {
      const normCodigo = normStr(r.ruta);
      const cleanNum = normCodigo.replace(/^(?:RA|T|ALIMENTADORA|TRONCAL|RUTA)\s*[-_]?\s*/i, '').trim();
      const normReporte = normalizarRutaReporte(r.ruta, r.tipo === 'troncal' ? 'URBANUS' : 'ZAFIRO');

      if (normCodigo) rutasValidasSet.add(normCodigo);
      if (cleanNum) rutasValidasSet.add(cleanNum);
      if (normReporte) rutasValidasSet.add(normReporte);
    });
  }

  const contadoresRutas = {};
  // Inicializar siempre todas las Troncales oficiales del catálogo
  RUTAS_TRONCAL_DEFAULT.forEach((r) => {
    contadoresRutas[r] = {
      ruta: r,
      tipo: 'troncal',
      en_operacion: 0,
      en_mantenimiento: 0
    };
  });

  // Inicializar siempre todas las Alimentadoras oficiales del catálogo (incluso si tienen 0 unidades)
  RUTAS_ALIMENTADORA_DEFAULT.forEach((r) => {
    contadoresRutas[r] = {
      ruta: r,
      tipo: 'alimentadora',
      en_operacion: 0,
      en_mantenimiento: 0
    };
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

      // Si no tiene ruta asignada o es SIN ASIGNAR, no se contabiliza en el reporte
      if (!rutaKey || rutaKey.toUpperCase().includes('SIN ASIGNAR')) return;

      // Si tenemos catálogo de rutas, verificar que no haya sido eliminada
      if (catalogoList.length > 0) {
        const rawNorm = normStr(rutaRaw);
        const cleanNum = rawNorm.replace(/^(?:RA|T|ALIMENTADORA|TRONCAL|RUTA)\s*[-_]?\s*/i, '').trim();
        const esValida = rutasValidasSet.has(rutaKey) || rutasValidasSet.has(rawNorm) || rutasValidasSet.has(cleanNum);
        if (!esValida) {
          return;
        }
      }

      if (!contadoresRutas[rutaKey]) {
        const isTroncalRuta = rutaKey.startsWith('T-');
        contadoresRutas[rutaKey] = {
          ruta: rutaKey,
          tipo: isTroncalRuta ? 'troncal' : 'alimentadora',
          en_operacion: 0,
          en_mantenimiento: 0
        };
      }
      contadoresRutas[rutaKey].en_operacion++;
    }
  });

  // Troncales ordenadas: todos los servicios oficiales del catálogo (sin T-SIN ASIGNAR)
  const troncalesList = Object.values(contadoresRutas)
    .filter((r) => r.tipo === 'troncal' && !r.ruta.toUpperCase().includes('SIN ASIGNAR'))
    .sort((a, b) => compareRutas(a.ruta, b.ruta));

  // Alimentadoras ordenadas: todas las rutas del catálogo oficial (sin RA-SIN ASIGNAR)
  const alimentadorasList = Object.values(contadoresRutas)
    .filter((r) => r.tipo === 'alimentadora' && !r.ruta.toUpperCase().includes('SIN ASIGNAR'))
    .sort((a, b) => compareRutas(a.ruta, b.ruta));

  const dataRutas = [
    ...troncalesList.map((r, i) => ({
      ...r,
      en_mantenimiento: i === 0 ? troncalMantenimientoTotal : 0,
    })),
    ...alimentadorasList.map((r, i) => ({
      ...r,
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
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };

    let data = null;
    let inicioData = null;
    let catalogoRutas = null;

    try {
      const [resHoy, resInicio, resRutas] = await Promise.all([
        fetch(`${API_BASE}/api/despacho/hoy`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/despacho/inicio-hoy`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/api/rutas`, { headers: authHeaders }).catch(() => null),
      ]);

      if (resHoy && resHoy.ok) {
        data = await resHoy.json();
        if (queryClient?.setQueryData) {
          queryClient.setQueryData(['despacho-hoy'], data);
        }
      }

      if (resInicio && resInicio.ok) {
        inicioData = await resInicio.json();
        if (queryClient?.setQueryData) {
          queryClient.setQueryData(['despacho-inicio-hoy'], inicioData);
        }
      }

      if (resRutas && resRutas.ok) {
        const rutasJson = await resRutas.json();
        catalogoRutas = rutasJson?.data || rutasJson || [];
        if (queryClient?.setQueryData) {
          queryClient.setQueryData(['catalogo-rutas-admin'], rutasJson);
        }
      }
    } catch (fetchErr) {
      console.warn('Error al consultar datos frescos para reportes:', fetchErr);
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      data = queryClient?.getQueryData ? queryClient.getQueryData(['despacho-hoy']) : [];
    }
    if (!catalogoRutas) {
      catalogoRutas = queryClient?.getQueryData ? queryClient.getQueryData(['catalogo-rutas-admin']) : [];
    }

    const { dataUnidades, dataRutas, totalsRutas } = procesarDatosReportesGenerales(data, inicioData, catalogoRutas);
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
