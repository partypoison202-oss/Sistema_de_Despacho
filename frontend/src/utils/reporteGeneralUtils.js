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

  const tipos = MODELOS_CONFIG.map(({ id }) => {
    const unidades = list.filter((u) => {
      const match = normStr(u.TIPO_DE_UNIDAD || u.tipo).includes(normStr(id));
      const est = normStr(u.ESTATUS || u.estatus);
      return match && est.includes('OPERACI');
    });

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

    // Regla de inicio operativo (snapshot de cambio de día a las 00:00)
    let programadasCalculadas = unidades.length;
    if (listInicio) {
      const progInicio = listInicio.filter((u) => {
        const match = normStr(u.TIPO_DE_UNIDAD || u.tipo).includes(normStr(id));
        const est = normStr(u.ESTATUS || u.estatus);
        return match && est.includes('OPERACI');
      }).length;
      if (progInicio > 0) {
        programadasCalculadas = progInicio;
      }
    }

    // Parche para hoy (fijo 130: 38 Urbanuss, 50 Vagonetas, 36 Zafiros, 6 Oriones)
    const overrideHoy = (localDateStr === '2026-10-07' || localDateStr === '2026-10-08') ? getOverrideHoy(id) : null;
    const programadas = overrideHoy ?? programadasCalculadas;

    return { tipo: id, programadas, en_servicio: enServicio, imagen: 'default.png' };
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
    const estatus = (reg.ESTATUS || reg.estatus || '').toUpperCase().trim();
    const tipo = (reg.TIPO_DE_UNIDAD || reg.tipo || '').toUpperCase().trim();
    const isEncerrada = Boolean(reg.YA_ENCERRADA || reg.ya_encerrada || reg.yaEncerrada);
    const isDesincorporada = isEncerrada || estatus.includes('RESERVA') || estatus.includes('MANTENIMIENTO') || estatus.includes('PERCANCE');
    const horaSalida = (reg.HORA_REAL_SALIDA_PATIO || reg.hora_real_salida_patio || reg.HORA_SALIDA || reg.hora_salida || '').toString().trim();
    const isOper = estatus.includes('OPERACI') 
      && !isDesincorporada
      && horaSalida !== '';
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

    const { dataUnidades, dataRutas } = procesarDatosReportesGenerales(data, inicioData);
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
