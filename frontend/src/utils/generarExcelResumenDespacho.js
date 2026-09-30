import XLSX from 'xlsx-js-style';
import Swal from 'sweetalert2';
import API_BASE from '../config/api';

/**
 * Función auxiliar para formatear listas de números económicos estilo Oxford con 'y'
 * Ejemplo: [110, 123, 133] -> "110, 123 y 133"
 */
function formatListConY(items) {
  if (!items || items.length === 0) return 'Ninguno';
  const clean = items.map(x => String(x).trim()).filter(Boolean);
  if (clean.length === 0) return 'Ninguno';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} y ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')} y ${clean[clean.length - 1]}`;
}

/**
 * Estilos predefinidos para las celdas del reporte Excel (Colores institucionales SITMAH)
 */
const STYLES = {
  // Encabezado principal tipo banner institucional (Guinda SITMAH #601A2A)
  headerMain: {
    fill: { fgColor: { rgb: '601A2A' } },
    font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  headerSub: {
    fill: { fgColor: { rgb: '601A2A' } },
    font: { name: 'Calibri', sz: 10, bold: false, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  headerDate: {
    fill: { fgColor: { rgb: '601A2A' } },
    font: { name: 'Calibri', sz: 10, bold: true, italic: true, color: { rgb: 'F5E8D0' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  // Barra de Horarios Inicio / Término
  barHorarios: {
    fill: { fgColor: { rgb: '4A1020' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '300713' } },
      bottom: { style: 'medium', color: { rgb: '300713' } },
      left: { style: 'thin', color: { rgb: '300713' } },
      right: { style: 'thin', color: { rgb: '300713' } }
    }
  },
  // Banners de sección (Unidades en reserva, mantenimiento, etc.)
  sectionBanner: {
    fill: { fgColor: { rgb: '601A2A' } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '4A1020' } },
      bottom: { style: 'medium', color: { rgb: '4A1020' } },
      left: { style: 'thin', color: { rgb: '4A1020' } },
      right: { style: 'thin', color: { rgb: '4A1020' } }
    }
  },
  // Encabezados de columnas de tablas
  tableHeader: {
    fill: { fgColor: { rgb: 'F1F5F9' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  tableHeaderGold: {
    fill: { fgColor: { rgb: 'C5A059' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'A07C36' } },
      bottom: { style: 'thin', color: { rgb: 'A07C36' } },
      left: { style: 'thin', color: { rgb: 'A07C36' } },
      right: { style: 'thin', color: { rgb: 'A07C36' } }
    }
  },
  // Celda de etiqueta izquierda
  rowLabel: {
    fill: { fgColor: { rgb: 'F8FAFC' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '334155' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  // Celda de datos centrada
  dataCenter: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  // Celda de datos izquierda
  dataLeft: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '1E293B' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  // Celda de total / destacado
  totalCell: {
    fill: { fgColor: { rgb: 'FEF3C7' } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '92400E' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'F59E0B' } },
      bottom: { style: 'thin', color: { rgb: 'F59E0B' } },
      left: { style: 'thin', color: { rgb: 'F59E0B' } },
      right: { style: 'thin', color: { rgb: 'F59E0B' } }
    }
  },
  // Celda de Eficiencia destacada
  eficienciaCell: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '166534' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  }
};

/**
 * Función principal para generar y descargar el reporte Excel "Resumen de Despacho"
 */
export async function descargarResumenDespachoExcel(setLoading) {
  if (typeof setLoading === 'function') setLoading(true);

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // 1. Petición en paralelo de datos operativos, conductores y reservas autorizadas
    const [resDespacho, resReservas, resConductores] = await Promise.all([
      fetch(`${API_BASE}/api/despacho/hoy`, { headers: authHeaders }).catch(() => null),
      fetch(`${API_BASE}/api/reservas/autorizadas?fecha=HOY`, { headers: authHeaders }).catch(() => null),
      fetch(`${API_BASE}/api/conductores`, { headers: authHeaders }).catch(() => null),
    ]);

    const apiData = resDespacho && resDespacho.ok ? await resDespacho.json() : [];
    const reservasAutorizadas = resReservas && resReservas.ok ? await resReservas.json() : [];
    const dbConductores = resConductores && resConductores.ok ? await resConductores.json() : [];

    const listaUnidades = Array.isArray(apiData) ? apiData : [];
    const listaReservasTarjeton = Array.isArray(reservasAutorizadas) ? reservasAutorizadas.map(t => String(t).trim()) : [];
    const listaConductores = Array.isArray(dbConductores) ? dbConductores : [];

    // ── PROCESAMIENTO DE MODELOS ───────────────────────────────────────────────
    const MODELOS = [
      { id: 'URBANUSS', label: 'Urbanuss', alt: ['URBANUS'] },
      { id: 'ZAFIRO', label: 'Zafiro', alt: [] },
      { id: 'VAGONETA', label: 'Vagoneta', alt: [] },
      { id: 'ORION', label: 'Orión', alt: ['ORIÓN'] }
    ];

    const modelStats = MODELOS.map(m => {
      const matchPattern = [m.id, ...m.alt];
      const units = listaUnidades.filter(u => {
        const tipo = (u.TIPO_DE_UNIDAD || u.tipo || '').toUpperCase().trim();
        return matchPattern.some(p => tipo.includes(p));
      });

      const prog = units.length;

      const oper = units.filter(d => {
        const status = (d.ESTATUS || d.estatus || '').toUpperCase().trim();
        const isOper = status.includes('OPERACI');
        const isValidadaOMesa = !!(d.HORA_REAL_SALIDA_PATIO || d.hora_real_salida_patio || d.HORA_SALIDA || d.hora_salida) || !!d.MOTIVO_ESTATUS || !!d.CAMBIO_DESDE;
        return isOper && isValidadaOMesa;
      }).length;

      const mantUnits = units.filter(d => {
        const status = (d.ESTATUS || d.estatus || '').toUpperCase().trim();
        return status.includes('MANTENIMIENTO') || status.includes('PERCANCE') || status.includes('TALLER');
      });

      const reservaUnits = units.filter(d => {
        const status = (d.ESTATUS || d.estatus || '').toUpperCase().trim();
        return status.includes('RESERVA');
      });

      const efi = prog > 0 ? Math.round((oper / prog) * 100) : 0;

      // Lista de económicos en reserva formateados
      const ecosReserva = reservaUnits
        .map(u => String(u.ECONOMICO || u.numero_eco || '').trim())
        .filter(Boolean)
        .map(e => e.padStart(3, '0'))
        .sort();

      // Lista de unidades en mantenimiento con falla/motivo
      const fallasMantenimiento = mantUnits.map(u => {
        const eco = String(u.ECONOMICO || u.numero_eco || '').trim().padStart(3, '0');
        const motivo = (u.MOTIVO_ESTATUS || u.FALLA || u.falla || u.MOTIVO || 'M.P.').trim();
        return `${eco} (${motivo})`;
      });

      return {
        ...m,
        programadas: prog,
        operacion: oper,
        eficiencia: efi,
        reservaCount: reservaUnits.length,
        reservaEcosText: formatListConY(ecosReserva),
        mantCount: mantUnits.length,
        mantFallasText: fallasMantenimiento.length > 0 ? fallasMantenimiento.join('\n') : 'Ninguno'
      };
    });

    const totalProgramadas = modelStats.reduce((sum, m) => sum + m.programadas, 0);
    const totalOperacion = modelStats.reduce((sum, m) => sum + m.operacion, 0);
    const totalEficiencia = totalProgramadas > 0 ? Math.round((totalOperacion / totalProgramadas) * 100) : 0;
    const totalEnReserva = modelStats.reduce((sum, m) => sum + m.reservaCount, 0);
    const totalEnMantenimiento = modelStats.reduce((sum, m) => sum + m.mantCount, 0);

    // ── HORARIOS DE DESPACHO (Inicio y Término) ─────────────────────────────────
    const salidasValidas = listaUnidades
      .map(u => (u.HORA_REAL_SALIDA_PATIO || u.hora_real_salida_patio || u.HORA_SALIDA || u.hora_salida || '').toString().trim())
      .filter(t => /^\d{1,2}:\d{2}/.test(t))
      .sort();

    const acoplesValidos = listaUnidades
      .map(u => (u.ACOPLE || u.acople || u.HORA_DE_ACOPLE || '').toString().trim())
      .filter(t => /^\d{1,2}:\d{2}/.test(t))
      .sort();

    const formatHourWithSec = (hStr) => {
      if (!hStr) return '--:--:--';
      const parts = hStr.split(':');
      const hh = parts[0].padStart(2, '0');
      const mm = (parts[1] || '00').padStart(2, '0');
      const ss = (parts[2] || '00').padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    };

    const inicioDespacho = salidasValidas.length > 0 ? formatHourWithSec(salidasValidas[0]) : '04:50:00';
    const allHoras = [...salidasValidas, ...acoplesValidos].sort();
    const terminoDespacho = allHoras.length > 0 ? formatHourWithSec(allHoras[allHoras.length - 1]) : '07:43:00';

    // ── CORRIDAS Y CICLOS FALTANTES ─────────────────────────────────────────────
    const ciclosFaltantes = listaUnidades.filter(u => {
      const ciclo = u.CICLO || u.ciclo;
      return ciclo !== null && ciclo !== undefined && String(ciclo).trim() !== '';
    });

    const faltantesAlimentador = ciclosFaltantes.filter(u => {
      const tipo = (u.TIPO_DE_UNIDAD || u.tipo || '').toUpperCase();
      const ruta = (u.RUTA || u.ruta || '').toUpperCase();
      return !tipo.includes('URBANUS') && !ruta.startsWith('T-');
    }).length;

    const faltantesTroncal = ciclosFaltantes.filter(u => {
      const tipo = (u.TIPO_DE_UNIDAD || u.tipo || '').toUpperCase();
      const ruta = (u.RUTA || u.ruta || '').toUpperCase();
      return tipo.includes('URBANUS') || ruta.startsWith('T-');
    }).length;

    const totalFaltantes = faltantesAlimentador + faltantesTroncal;

    // ── CONDUCTORES EN RESERVA Y CON FALTA ──────────────────────────────────────
    const todayStr = new Date().toISOString().slice(0, 10);

    // Conductores autorizados en reserva
    const conductoresEnReserva = listaConductores.filter(c => {
      const t = String(c.tarjeton || '').trim();
      const isAuth = listaReservasTarjeton.includes(t) || listaReservasTarjeton.includes(t.padStart(4, '0'));
      const isDisp = String(c.estado_servicio || '').toLowerCase() === 'disponible';
      return isAuth || (listaReservasTarjeton.length === 0 && isDisp);
    });

    // Conductores con falta registrada hoy
    const conductoresConFalta = listaConductores.filter(c => {
      let faltas = [];
      const raw = c.faltas_detalle;
      if (Array.isArray(raw)) faltas = raw;
      else if (typeof raw === 'string' && raw.trim()) {
        try { faltas = JSON.parse(raw); } catch { faltas = []; }
      }
      return faltas.some(f => f.fecha === todayStr && !f.justificada && f.estado !== 'justificada');
    });

    // ── CORRIDAS PENDIENTES POR PROGRAMACIÓN ─────────────────────────────────────
    const corridasPendientes = listaUnidades
      .filter(u => {
        const ruta = (u.RUTA || u.ruta || '').trim();
        const corrida = u.CORRIDAS || u.corridas;
        const acople = (u.ACOPLE || u.acople || u.HORA_DE_ACOPLE || '').trim();
        const horaSalida = (u.HORA_REAL_SALIDA_PATIO || u.hora_real_salida_patio || '').trim();
        const estatus = (u.ESTATUS || u.estatus || '').toLowerCase();
        const noDespachada = horaSalida === '' && !estatus.includes('operaci');
        return ruta !== '' && corrida !== undefined && corrida !== null && acople !== '' && noDespachada;
      })
      .map(u => `${u.RUTA || u.ruta} corrida ${u.CORRIDAS || u.corridas} acopla: ${u.ACOPLE || u.acople || u.HORA_DE_ACOPLE}`);

    // Fecha formateada en español
    const fechaFormateada = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCCIÓN DE LA MATRIZ DE CELDAS EXCEL (AOA)
    // ═══════════════════════════════════════════════════════════════════════════
    const aoa = [];
    const merges = [];
    const cellStyles = {};

    let r = 0; // Puntero de fila

    const setCellStyle = (rowIdx, colIdx, style) => {
      const ref = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      cellStyles[ref] = style;
    };

    const applyRowStyle = (rowIdx, startCol, endCol, style) => {
      for (let c = startCol; c <= endCol; c++) {
        setCellStyle(rowIdx, c, style);
      }
    };

    // 1. ENCABEZADO INSTITUCIONAL
    aoa.push(['SISTEMA INTEGRADO DE TRANSPORTE MASIVO DE HIDALGO', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.headerMain);
    r++;

    aoa.push(['Dirección de Operación', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.headerSub);
    r++;

    aoa.push(['Subdirección de Verificación Operacional', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.headerSub);
    r++;

    aoa.push(['Resumen Despacho', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.headerMain);
    r++;

    aoa.push([fechaFormateada, '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.headerDate);
    r++;

    // 2. BARRA DE HORARIOS
    aoa.push([`Inicio despacho: ${inicioDespacho}`, '', '', `Termino despacho: ${terminoDespacho}`, '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.barHorarios);
    r++;

    // 3. TABLA 1: FLOTA Y EFICIENCIA
    aoa.push(['Modelo', 'Urbanuss', 'Zafiro', 'Vagoneta', 'Orión', 'Totales']);
    applyRowStyle(r, 0, 5, STYLES.tableHeader);
    setCellStyle(r, 5, STYLES.tableHeaderGold);
    r++;

    aoa.push(['Eficiencia', `${modelStats[0].eficiencia}%`, `${modelStats[1].eficiencia}%`, `${modelStats[2].eficiencia}%`, `${modelStats[3].eficiencia}%`, `${totalEficiencia}%`]);
    setCellStyle(r, 0, STYLES.rowLabel);
    for (let c = 1; c <= 4; c++) setCellStyle(r, c, STYLES.eficienciaCell);
    setCellStyle(r, 5, STYLES.totalCell);
    r++;

    aoa.push(['En operación', modelStats[0].operacion, modelStats[1].operacion, modelStats[2].operacion, modelStats[3].operacion, totalOperacion]);
    setCellStyle(r, 0, STYLES.rowLabel);
    for (let c = 1; c <= 4; c++) setCellStyle(r, c, STYLES.dataCenter);
    setCellStyle(r, 5, STYLES.totalCell);
    r++;

    aoa.push(['Programación Unidades/Conductores', modelStats[0].programadas, modelStats[1].programadas, modelStats[2].programadas, modelStats[3].programadas, totalProgramadas]);
    setCellStyle(r, 0, STYLES.rowLabel);
    for (let c = 1; c <= 4; c++) setCellStyle(r, c, STYLES.dataCenter);
    setCellStyle(r, 5, STYLES.totalCell);
    r++;

    // FILA EN BLANCO SEPARADORA
    aoa.push(['', '', '', '', '', '']);
    r++;

    // 4. UNIDADES EN RESERVA
    aoa.push(['Unidades en reserva', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.sectionBanner);
    r++;

    aoa.push(['Modelo', 'Urbanuss', 'Zafiro', 'Vagoneta', 'Orión', 'Total en reserva']);
    applyRowStyle(r, 0, 4, STYLES.tableHeader);
    setCellStyle(r, 5, STYLES.tableHeaderGold);
    r++;

    aoa.push(['Económico', modelStats[0].reservaEcosText, modelStats[1].reservaEcosText, modelStats[2].reservaEcosText, modelStats[3].reservaEcosText, '']);
    setCellStyle(r, 0, STYLES.rowLabel);
    for (let c = 1; c <= 4; c++) setCellStyle(r, c, STYLES.dataCenter);
    setCellStyle(r, 5, STYLES.dataCenter);
    r++;

    aoa.push(['Total', modelStats[0].reservaCount, modelStats[1].reservaCount, modelStats[2].reservaCount, modelStats[3].reservaCount, totalEnReserva]);
    setCellStyle(r, 0, STYLES.rowLabel);
    for (let c = 1; c <= 4; c++) setCellStyle(r, c, STYLES.dataCenter);
    setCellStyle(r, 5, STYLES.totalCell);
    r++;

    // FILA EN BLANCO SEPARADORA
    aoa.push(['', '', '', '', '', '']);
    r++;

    // 5. UNIDADES EN MANTENIMIENTO
    aoa.push(['Unidades en mantenimiento', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.sectionBanner);
    r++;

    aoa.push(['Modelo', 'Urbanuss', 'Zafiro', 'Vagoneta', 'Orión', 'Total en mantenimiento']);
    applyRowStyle(r, 0, 4, STYLES.tableHeader);
    setCellStyle(r, 5, STYLES.tableHeaderGold);
    r++;

    aoa.push(['Económico/falla', modelStats[0].mantFallasText, modelStats[1].mantFallasText, modelStats[2].mantFallasText, modelStats[3].mantFallasText, '']);
    setCellStyle(r, 0, STYLES.rowLabel);
    for (let c = 1; c <= 4; c++) setCellStyle(r, c, STYLES.dataCenter);
    setCellStyle(r, 5, STYLES.dataCenter);
    r++;

    aoa.push(['Total', modelStats[0].mantCount, modelStats[1].mantCount, modelStats[2].mantCount, modelStats[3].mantCount, totalEnMantenimiento]);
    setCellStyle(r, 0, STYLES.rowLabel);
    for (let c = 1; c <= 4; c++) setCellStyle(r, c, STYLES.dataCenter);
    setCellStyle(r, 5, STYLES.totalCell);
    r++;

    // FILA EN BLANCO SEPARADORA
    aoa.push(['', '', '', '', '', '']);
    r++;

    // 6. CORRIDAS FALTANTES
    aoa.push(['Corridas faltantes', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.sectionBanner);
    r++;

    aoa.push([`Servicio Alimentador: ${faltantesAlimentador}`, '', `Servicio Troncal: ${faltantesTroncal}`, '', `Total: ${totalFaltantes}`, '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.tableHeader);
    r++;

    // 7. RESUMEN DE CORRIDAS Y CICLOS FALTANTES
    aoa.push(['Resumen de corridas y ciclos faltantes', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.sectionBanner);
    r++;

    aoa.push(['No', 'Eco', 'Ruta', 'Corrida', 'Ciclo', 'Motivo']);
    applyRowStyle(r, 0, 5, STYLES.tableHeader);
    r++;

    if (ciclosFaltantes.length > 0) {
      ciclosFaltantes.forEach((item, idx) => {
        aoa.push([
          idx + 1,
          item.ECONOMICO ? String(item.ECONOMICO).padStart(3, '0') : '',
          item.RUTA || item.ruta || '',
          item.CORRIDAS || item.corridas || '',
          item.CICLO || item.ciclo || '',
          item.MOTIVO || item.motivo || item.MOTIVO_ESTATUS || ''
        ]);
        setCellStyle(r, 0, STYLES.dataCenter);
        setCellStyle(r, 1, STYLES.dataCenter);
        setCellStyle(r, 2, STYLES.dataCenter);
        setCellStyle(r, 3, STYLES.dataCenter);
        setCellStyle(r, 4, STYLES.dataCenter);
        setCellStyle(r, 5, STYLES.dataLeft);
        r++;
      });
    } else {
      aoa.push(['Sin registros de corridas o ciclos faltantes', '', '', '', '', '']);
      merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
      applyRowStyle(r, 0, 5, STYLES.dataCenter);
      r++;
    }

    // FILA EN BLANCO SEPARADORA
    aoa.push(['', '', '', '', '', '']);
    r++;

    // 8. PERSONAS CONDUCTORAS
    aoa.push(['Personas conductoras', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.sectionBanner);
    r++;

    aoa.push(['Reservas programadas', '', '', '', conductoresEnReserva.length, '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 3, STYLES.rowLabel);
    applyRowStyle(r, 4, 5, STYLES.totalCell);
    r++;

    aoa.push(['Reservas por corridas faltantes', '', '', '', 0, '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 3, STYLES.rowLabel);
    applyRowStyle(r, 4, 5, STYLES.totalCell);
    r++;

    aoa.push(['Faltas de conductor', '', '', '', conductoresConFalta.length, '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    merges.push({ s: { r, c: 4 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 3, STYLES.rowLabel);
    applyRowStyle(r, 4, 5, STYLES.totalCell);
    r++;

    // FILA EN BLANCO SEPARADORA
    aoa.push(['', '', '', '', '', '']);
    r++;

    // 9. CONDUCTORES EN RESERVA
    aoa.push(['Conductores en reserva', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.sectionBanner);
    r++;

    aoa.push(['Nombre', '', '', 'Folio', '', 'Tipo']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    merges.push({ s: { r, c: 3 }, e: { r, c: 4 } });
    applyRowStyle(r, 0, 2, STYLES.tableHeader);
    applyRowStyle(r, 3, 4, STYLES.tableHeader);
    setCellStyle(r, 5, STYLES.tableHeader);
    r++;

    if (conductoresEnReserva.length > 0) {
      conductoresEnReserva.forEach(c => {
        const nombreCompleto = `${c.nombres || ''} ${c.apellidos || ''}`.trim() || c.nombre || 'Sin nombre';
        const folio = c.tarjeton ? (String(c.tarjeton).startsWith('TPA') ? c.tarjeton : 'TPA' + String(c.tarjeton).padStart(4, '0')) : '--';
        const tipo = c.tipo_tarjeton || 'C';

        aoa.push([nombreCompleto, '', '', folio, '', tipo]);
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
        merges.push({ s: { r, c: 3 }, e: { r, c: 4 } });
        applyRowStyle(r, 0, 2, STYLES.dataLeft);
        applyRowStyle(r, 3, 4, STYLES.dataCenter);
        setCellStyle(r, 5, STYLES.dataCenter);
        r++;
      });
    } else {
      aoa.push(['Sin conductores en reserva asignados', '', '', '', '', '']);
      merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
      applyRowStyle(r, 0, 5, STYLES.dataCenter);
      r++;
    }

    // FILA EN BLANCO SEPARADORA
    aoa.push(['', '', '', '', '', '']);
    r++;

    // 10. CONDUCTORES CON FALTA
    aoa.push(['Conductores con falta', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.sectionBanner);
    r++;

    aoa.push(['Nombre', '', '', 'Folio', '', 'Tipo']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
    merges.push({ s: { r, c: 3 }, e: { r, c: 4 } });
    applyRowStyle(r, 0, 2, STYLES.tableHeader);
    applyRowStyle(r, 3, 4, STYLES.tableHeader);
    setCellStyle(r, 5, STYLES.tableHeader);
    r++;

    if (conductoresConFalta.length > 0) {
      conductoresConFalta.forEach(c => {
        const nombreCompleto = `${c.nombres || ''} ${c.apellidos || ''}`.trim() || c.nombre || 'Sin nombre';
        const folio = c.tarjeton ? (String(c.tarjeton).startsWith('TPA') ? c.tarjeton : 'TPA' + String(c.tarjeton).padStart(4, '0')) : '--';
        const tipo = c.tipo_tarjeton || 'B';

        aoa.push([nombreCompleto, '', '', folio, '', tipo]);
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
        merges.push({ s: { r, c: 3 }, e: { r, c: 4 } });
        applyRowStyle(r, 0, 2, STYLES.dataLeft);
        applyRowStyle(r, 3, 4, STYLES.dataCenter);
        setCellStyle(r, 5, STYLES.dataCenter);
        r++;
      });
    } else {
      aoa.push(['Sin faltas de conductor registradas para el día de hoy', '', '', '', '', '']);
      merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
      applyRowStyle(r, 0, 5, STYLES.dataCenter);
      r++;
    }

    // FILA EN BLANCO SEPARADORA
    aoa.push(['', '', '', '', '', '']);
    r++;

    // 11. OBSERVACIONES
    aoa.push(['Observaciones', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.sectionBanner);
    r++;

    aoa.push(['Sin observaciones registradas durante la jornada de despacho.', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.dataLeft);
    r++;

    // FILA EN BLANCO SEPARADORA
    aoa.push(['', '', '', '', '', '']);
    r++;

    // 12. CORRIDAS PENDIENTES POR PROGRAMACIÓN
    aoa.push(['Corridas pendientes por programación:', '', '', '', '', '']);
    merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
    applyRowStyle(r, 0, 5, STYLES.sectionBanner);
    r++;

    if (corridasPendientes.length > 0) {
      corridasPendientes.forEach(cp => {
        aoa.push([cp, '', '', '', '', '']);
        merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
        applyRowStyle(r, 0, 5, STYLES.dataLeft);
        r++;
      });
    } else {
      aoa.push(['No hay corridas pendientes por programación.', '', '', '', '', '']);
      merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
      applyRowStyle(r, 0, 5, STYLES.dataCenter);
      r++;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENSAMBLAR LIBRO Y HOJA CON ESTILOS
    // ═══════════════════════════════════════════════════════════════════════════
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Asignar anchos de columnas óptimos
    worksheet['!cols'] = [
      { wch: 32 }, // Columna A
      { wch: 20 }, // Columna B
      { wch: 20 }, // Columna C
      { wch: 26 }, // Columna D
      { wch: 20 }, // Columna E
      { wch: 24 }  // Columna F
    ];

    // Asignar celdas combinadas (Merges)
    worksheet['!merges'] = merges;

    // Asignar estilos a las celdas
    Object.keys(cellStyles).forEach(cellRef => {
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = cellStyles[cellRef];
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen Despacho');

    // Descargar archivo Excel
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Resumen_Despacho_${fechaArchivo}.xlsx`);

    Swal.fire({
      icon: 'success',
      title: '¡Reporte Generado!',
      text: 'El Resumen de Despacho en formato Excel se ha descargado correctamente.',
      confirmButtonColor: '#601a2a',
      timer: 3000
    });

  } catch (error) {
    console.error('Error al generar Excel de Resumen de Despacho:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al generar reporte',
      text: 'Ocurrió un error al procesar los datos para el archivo Excel.',
      confirmButtonColor: '#601a2a'
    });
  } finally {
    if (typeof setLoading === 'function') setLoading(false);
  }
}
