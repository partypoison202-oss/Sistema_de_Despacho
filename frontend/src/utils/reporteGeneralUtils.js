import Swal from 'sweetalert2';
import API_BASE from '../config/api';
import { generarPDFReporteGeneral } from './generarPDFReporteGeneral';
import { generarPDFReporteUnidades } from './generarPDFReporteUnidades';

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

export const procesarDatosReportesGenerales = (apiData) => {
  const list = Array.isArray(apiData) ? apiData : [];

  const tipos = MODELOS_CONFIG.map(({ id }) => {
    const unidades = list.filter((u) => {
      const match = u.TIPO_DE_UNIDAD?.toUpperCase().includes(id);
      const est = (u.ESTATUS || '').toLowerCase().trim();
      return match && !est.includes('no_programada') && !est.includes('no programada');
    });

    const enServicio = unidades.filter((u) => {
      const est = (u.ESTATUS || '').toUpperCase().trim();
      return est.includes('OPERACI') || (!est.includes('MANTENIMIENTO') && !est.includes('RESERVA') && !est.includes('PERCANCE'));
    }).length;

    return { tipo: id, programadas: unidades.length, en_servicio: enServicio, imagen: 'default.png' };
  });

  const totales = tipos.reduce((acc, t) => ({
    programadas: acc.programadas + t.programadas,
    en_servicio: acc.en_servicio + t.en_servicio,
  }), { programadas: 0, en_servicio: 0 });

  const rutasContadores = {};
  Object.keys(MAPA_RUTAS).forEach((r) => { rutasContadores[r] = { en_operacion: 0, en_mantenimiento: 0 }; });
  rutasContadores['T-SIN ASIGNAR'] = { en_operacion: 0, en_mantenimiento: 0 };
  rutasContadores['RA-SIN ASIGNAR'] = { en_operacion: 0, en_mantenimiento: 0 };

  list.forEach((reg) => {
    const estatus = (reg.ESTATUS || '').toUpperCase().trim();
    const tipo = (reg.TIPO_DE_UNIDAD || '').toUpperCase().trim();
    const isOper = estatus.includes('OPERACI') && (!!(reg.HORA_REAL_SALIDA_PATIO || reg.HORA_SALIDA) || !!reg.MOTIVO_ESTATUS || !!reg.CAMBIO_DESDE);
    const isManto = estatus.includes('MANTENIMIENTO');
    if (!isOper && !isManto) return;

    const ruta = (reg.MANTENIMIENTO_RUTA || reg.RUTA || '').toUpperCase().trim();
    const matchKey = Object.keys(MAPA_RUTAS).find((nr) => ruta.includes(MAPA_RUTAS[nr]) || ruta.includes(nr));

    if (matchKey) {
      if (isOper) rutasContadores[matchKey].en_operacion++;
      else rutasContadores[matchKey].en_mantenimiento++;
    } else {
      const sinAsignar = (tipo === 'URBANUS' || tipo === 'URBANUSS') ? 'T-SIN ASIGNAR' : 'RA-SIN ASIGNAR';
      if (isOper) rutasContadores[sinAsignar].en_operacion++;
      else rutasContadores[sinAsignar].en_mantenimiento++;
    }
  });

  if (rutasContadores['20B'] && rutasContadores['RA 2B']) {
    rutasContadores['RA 2B'].en_operacion += rutasContadores['20B'].en_operacion;
    rutasContadores['RA 2B'].en_mantenimiento += rutasContadores['20B'].en_mantenimiento;
    delete rutasContadores['20B'];
  }

  const dataRutas = Object.keys(rutasContadores).map((ruta) => ({
    ruta,
    en_operacion: rutasContadores[ruta].en_operacion,
    en_mantenimiento: rutasContadores[ruta].en_mantenimiento,
    total: rutasContadores[ruta].en_operacion + rutasContadores[ruta].en_mantenimiento,
  }));

  return { dataUnidades: { tipos, totales }, dataRutas };
};

export const descargarReportesGeneralesConAlerta = async (setLoading) => {
  setLoading(true);
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/despacho/hoy`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Error al consultar datos');
    const data = await res.json();
    const { dataUnidades, dataRutas } = procesarDatosReportesGenerales(data);
    await generarPDFReporteGeneral(dataRutas);
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
