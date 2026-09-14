import { generarPDFReporteGeneral } from './generarPDFReporteGeneral';
import { generarPDFReporteUnidades } from './generarPDFReporteUnidades';

const modelsConfig = [
  { id: 'URBANUS', label: 'URBANUSS' },
  { id: 'ZAFIRO', label: 'ZAFIRO' },
  { id: 'VAGONETA', label: 'VAGONETA' },
  { id: 'ORION', label: 'ORIÓN' },
];

export const procesarDatosReportesGenerales = (apiData) => {
  const list = Array.isArray(apiData) ? apiData : [];

  const modelData = modelsConfig.map((mc) => {
    const units = list.filter((d) => {
      const matchesModel = d.TIPO_DE_UNIDAD?.toUpperCase().includes(mc.id);
      const est = (d.ESTATUS || '').toLowerCase().trim();
      const isNoProgramada = est === 'no_programada' || est === 'no programada';
      return matchesModel && !isNoProgramada;
    });

    const getEstatus = (d) => (d.ESTATUS || '').toUpperCase().trim();
    const unidadesOperacion = units.filter((d) => {
      const est = getEstatus(d);
      return est.includes('OPERACI') || (!est.includes('MANTENIMIENTO') && !est.includes('RESERVA') && !est.includes('PERCANCE'));
    });

    return {
      id: mc.id,
      programadas: units.length,
      operacion: unidadesOperacion.length,
    };
  });

  const totales = modelData.reduce(
    (acc, m) => ({
      programadas: acc.programadas + m.programadas,
      operacion: acc.operacion + m.operacion,
    }),
    { programadas: 0, operacion: 0 }
  );

  const dataUnidades = {
    tipos: modelData.map((m) => ({
      tipo: m.id,
      programadas: m.programadas,
      en_servicio: m.operacion,
      imagen: 'default.png'
    })),
    totales: {
      programadas: totales.programadas,
      en_servicio: totales.operacion
    }
  };

  const mapeoRutas = {
    'T-01': 'T01', 'T-02': 'T02', 'T-04': 'T04', 'T-05': 'T05',
    'RA 2A': '2A', 'RA 2B': '2B', '20B': '20B', 'RA 2D': '2D', 
    'RA 3': '03', 'RA 4': '04', 'RA 6': '06', 'RA 8': '08', 
    'RA 11': '11', 'RA 14': '14', 'RA 15A': '15A', 'RA 15B': '15B',
  };

  const rutasContadores = {};
  Object.keys(mapeoRutas).forEach(r => {
    rutasContadores[r] = { en_operacion: 0, en_mantenimiento: 0 };
  });
  rutasContadores['T-SIN ASIGNAR'] = { en_operacion: 0, en_mantenimiento: 0 };
  rutasContadores['RA-SIN ASIGNAR'] = { en_operacion: 0, en_mantenimiento: 0 };

  list.forEach(reg => {
    const estatus = (reg.ESTATUS || '').toUpperCase().trim();
    const tipo = (reg.TIPO_DE_UNIDAD || '').toUpperCase().trim();
    const isOper = estatus.includes('OPERACI') && (!!(reg.HORA_REAL_SALIDA_PATIO || reg.HORA_SALIDA) || !!reg.MOTIVO_ESTATUS || !!reg.CAMBIO_DESDE);
    const isManto = estatus.includes('MANTENIMIENTO');

    const rutaExcel = (reg.MANTENIMIENTO_RUTA || reg.RUTA || '').toUpperCase().trim();
    let matched = false;

    for (const [nombreReporte, prefijoExcel] of Object.entries(mapeoRutas)) {
      if (rutaExcel.includes(prefijoExcel) || rutaExcel.includes(nombreReporte)) {
        if (isOper) rutasContadores[nombreReporte].en_operacion++;
        else if (isManto) rutasContadores[nombreReporte].en_mantenimiento++;
        matched = true;
        break;
      }
    }

    if (!matched && (isOper || isManto)) {
      if (tipo === 'URBANUS') {
        if (isOper) rutasContadores['T-SIN ASIGNAR'].en_operacion++;
        else if (isManto) rutasContadores['T-SIN ASIGNAR'].en_mantenimiento++;
      } else {
        if (isOper) rutasContadores['RA-SIN ASIGNAR'].en_operacion++;
        else if (isManto) rutasContadores['RA-SIN ASIGNAR'].en_mantenimiento++;
      }
    }
  });

  if (rutasContadores['20B'] && rutasContadores['RA 2B']) {
    rutasContadores['RA 2B'].en_operacion += rutasContadores['20B'].en_operacion;
    rutasContadores['RA 2B'].en_mantenimiento += rutasContadores['20B'].en_mantenimiento;
    delete rutasContadores['20B'];
  }

  const dataRutas = Object.keys(rutasContadores).map(ruta => ({
    ruta,
    en_operacion: rutasContadores[ruta].en_operacion,
    en_mantenimiento: rutasContadores[ruta].en_mantenimiento,
    total: rutasContadores[ruta].en_operacion + rutasContadores[ruta].en_mantenimiento
  }));

  return { dataUnidades, dataRutas };
};

export const ejecutarDescargaReportesGenerales = async (apiData) => {
  const { dataUnidades, dataRutas } = procesarDatosReportesGenerales(apiData);
  await generarPDFReporteGeneral(dataRutas);
  await generarPDFReporteUnidades(dataUnidades);
};
