import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import API_BASE from '../config/api';

function formatListConY(items) {
  if (!items || items.length === 0) return 'Ninguno';
  const clean = items.map(x => String(x).trim()).filter(Boolean);
  if (clean.length === 0) return 'Ninguno';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} y ${clean[1]}`;
  const ultimo = clean.at(-1);
  return `${clean.slice(0, -1).join(', ')} y ${ultimo}`;
}

function formatFolio(tarjeton) {
  if (!tarjeton) return '--';
  const str = String(tarjeton);
  if (str.startsWith('TPA')) {
    return str;
  }
  return `TPA${str.padStart(4, '0')}`;
}

function formatHourWithSec(hStr) {
  if (!hStr) return '--:--:--';
  const parts = hStr.split(':');
  const hh = parts[0].padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');
  const ss = (parts[2] || '00').padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// Carga imagen, la dibuja en un canvas, opcionalmente la pinta de blanco y devuelve PNG Base64
const fetchImageAsPng = async (url, tintWhite = false) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      if (tintWhite) {
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

function procesarModelos(listaUnidades) {
  const MODELOS = [
    { id: 'URBANUSS', label: 'Urbanuss', alt: ['URBANUS'] },
    { id: 'ZAFIRO', label: 'Zafiro', alt: [] },
    { id: 'VAGONETA', label: 'Vagoneta', alt: [] },
    { id: 'ORION', label: 'Orión', alt: ['ORIÓN'] }
  ];
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

  const modelStats = MODELOS.map(m => {
    const matchPattern = [m.id, ...m.alt];
    const units = listaUnidades.filter(u => {
      const tipo = (u.TIPO_DE_UNIDAD || u.tipo || '').toUpperCase().trim();
      return matchPattern.some(p => tipo.includes(p));
    });
    const progCalculada = units.filter(d => (d.ESTATUS || d.estatus || '').toUpperCase().trim().includes('OPERACI')).length;
    
    // Parche para hoy (fijo 130: 38 Urbanuss, 50 Vagonetas, 36 Zafiros, 6 Oriones)
    const overrideHoy = (localDateStr === '2026-10-07' || localDateStr === '2026-10-08') ? getOverrideHoy(m.id) : null;
    const prog = overrideHoy ?? progCalculada;

    const oper = units.filter(d => {
      const status = (d.ESTATUS || d.estatus || '').toUpperCase().trim();
      const isOper = status.includes('OPERACI');
      const isValidada = Boolean(d.HORA_REAL_SALIDA_PATIO || d.hora_real_salida_patio || d.HORA_SALIDA || d.hora_salida || d.MOTIVO_ESTATUS || d.CAMBIO_DESDE);
      return isOper && isValidada;
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
    const ecosReserva = reservaUnits
      .map(u => String(u.ECONOMICO || u.numero_eco || '').trim())
      .filter(Boolean)
      .map(e => e.padStart(3, '0'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
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
  return { modelStats, totales: { totalProgramadas, totalOperacion, totalEficiencia, totalEnReserva, totalEnMantenimiento } };
}

function calcularHorariosDespacho(listaUnidades) {
  const salidasValidas = listaUnidades
    .map(u => (u.HORA_REAL_SALIDA_PATIO || u.hora_real_salida_patio || u.HORA_SALIDA || u.hora_salida || '').toString().trim())
    .filter(t => /^\d{1,2}:\d{2}/.test(t))
    .sort((a, b) => a.localeCompare(b));
  const acoplesValidos = listaUnidades
    .map(u => (u.ACOPLE || u.acople || u.HORA_DE_ACOPLE || '').toString().trim())
    .filter(t => /^\d{1,2}:\d{2}/.test(t))
    .sort((a, b) => a.localeCompare(b));
  const inicioDespacho = salidasValidas.length > 0 ? formatHourWithSec(salidasValidas[0]) : '04:50:00';
  const allHoras = [...salidasValidas, ...acoplesValidos].sort((a, b) => a.localeCompare(b));
  const terminoDespacho = allHoras.length > 0 ? formatHourWithSec(allHoras.at(-1)) : '07:43:00';
  return { inicioDespacho, terminoDespacho };
}

function procesarConductores(listaConductores, listaReservasTarjeton, todayStr) {
  const conductoresEnReserva = listaConductores.filter(c => {
    const t = String(c.tarjeton || '').trim();
    const isAuth = listaReservasTarjeton.includes(t) || listaReservasTarjeton.includes(t.padStart(4, '0'));
    const isDisp = String(c.estado_servicio || '').toLowerCase() === 'disponible';
    return isAuth || (listaReservasTarjeton.length === 0 && isDisp);
  });
  const conductoresConFalta = listaConductores.filter(c => {
    let faltas = [];
    const raw = c.faltas_detalle;
    if (Array.isArray(raw)) faltas = raw;
    else if (typeof raw === 'string' && raw.trim()) { try { faltas = JSON.parse(raw); } catch { faltas = []; } }
    return faltas.some(f => f.fecha === todayStr && !f.justificada && f.estado !== 'justificada');
  });
  return { conductoresEnReserva, conductoresConFalta };
}

export async function descargarResumenDespachoExcel(setLoading) {
  if (typeof setLoading === 'function') setLoading(true);
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const [resDespacho, resReservas, resConductores] = await Promise.all([
      fetch(`${API_BASE}/api/despacho/hoy`, { headers: authHeaders }).catch(() => null),
      fetch(`${API_BASE}/api/reservas/autorizadas?fecha=HOY`, { headers: authHeaders }).catch(() => null),
      fetch(`${API_BASE}/api/conductores`, { headers: authHeaders }).catch(() => null),
    ]);
    const apiData = resDespacho?.ok ? await resDespacho.json() : [];
    const reservasAutorizadas = resReservas?.ok ? await resReservas.json() : [];
    const dbConductores = resConductores?.ok ? await resConductores.json() : [];
    const listaUnidades = Array.isArray(apiData) ? apiData : [];
    const listaReservasTarjeton = Array.isArray(reservasAutorizadas) ? reservasAutorizadas.map(t => String(t).trim()) : [];
    const listaConductores = Array.isArray(dbConductores) ? dbConductores : [];
    const { modelStats, totales } = procesarModelos(listaUnidades);
    const { inicioDespacho, terminoDespacho } = calcularHorariosDespacho(listaUnidades);
    const ciclosFaltantes = listaUnidades.filter(u => { const ciclo = u.CICLO || u.ciclo; return ciclo !== null && ciclo !== undefined && String(ciclo).trim() !== ''; });
    const faltantesAlimentador = ciclosFaltantes.filter(u => { const tipo = (u.TIPO_DE_UNIDAD || u.tipo || '').toUpperCase(); const ruta = (u.RUTA || u.ruta || '').toUpperCase(); return !tipo.includes('URBANUS') && !ruta.startsWith('T-'); }).length;
    const faltantesTroncal = ciclosFaltantes.filter(u => { const tipo = (u.TIPO_DE_UNIDAD || u.tipo || '').toUpperCase(); const ruta = (u.RUTA || u.ruta || '').toUpperCase(); return tipo.includes('URBANUS') || ruta.startsWith('T-'); }).length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const { conductoresEnReserva, conductoresConFalta } = procesarConductores(listaConductores, listaReservasTarjeton, todayStr);
    const fechaFormateada = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Resumen Despacho');
    
    const COLOR_VINO = 'FF601A2A';
    const COLOR_GOLD = 'FFC5A059';
    const COLOR_GRAY = 'FF7F7F7F';

    ws.columns = [
      { width: 35 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 25 }
    ];

    const applyThinBorders = (cell) => {
      cell.border = {
        top: {style:'thin', color: {argb:'FF000000'}}, left: {style:'thin', color: {argb:'FF000000'}},
        bottom: {style:'thin', color: {argb:'FF000000'}}, right: {style:'thin', color: {argb:'FF000000'}}
      };
    };

    for(let i=1; i<=5; i++) {
        ws.mergeCells(`A${i}:F${i}`);
        const r = ws.getRow(i); r.height = 20;
        const c = ws.getCell(`A${i}`);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VINO } };
        c.font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    ws.getCell('A1').value = 'SISTEMA INTEGRADO DE TRANSPORTE MASIVO DE HIDALGO';
    ws.getCell('A2').value = 'Dirección de Operación';
    ws.getCell('A3').value = 'Subdirección de Verificación Operacional';
    ws.getCell('A4').value = 'Resumen Despacho';
    ws.getCell('A5').value = fechaFormateada;
    ws.getCell('A5').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true, italic: true };

    const r6 = ws.getRow(6); r6.height = 20;
    ws.mergeCells('A6:C6'); ws.mergeCells('D6:F6');
    ws.getCell('A6').value = `Inicio despacho: ${inicioDespacho}`;
    ws.getCell('D6').value = `Termino despacho: ${terminoDespacho}`;
    for(let j of ['A','D']) {
      const c = ws.getCell(`${j}6`);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VINO } };
      c.font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    try {
        // Logo SITMAH (Izquierda) - columna A
        const imgSitmah = await fetchImageAsPng('/images/sitmah_logo.webp', false);
        if (imgSitmah) { 
            const imageId = wb.addImage({ base64: imgSitmah, extension: 'png' }); 
            ws.addImage(imageId, { tl: { col: 0.05, row: 0.3 }, ext: { width: 110, height: 42 } }); 
        }
        // Logo STM - ajustado
        const imgStm = await fetchImageAsPng('/images/sistema_de_tm.webp', false);
        if (imgStm) { 
            const imageId3 = wb.addImage({ base64: imgStm, extension: 'png' }); 
            ws.addImage(imageId3, { tl: { col: 5.95, row: 0.4 }, ext: { width: 85, height: 38 } }); 
        }
    } catch(e) { console.log(e); }

    const r7 = ws.getRow(7); r7.height = 75;
    ws.getCell('A7').value = 'Modelo';
    ws.getCell('A7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY } };
    ws.getCell('A7').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A7'));

    const modelosTitulos = ['Urbanuss', 'Zafiro', 'Vagoneta', 'Orión'];
    for(let i=0; i<4; i++) {
        const colLetter = String.fromCharCode(66 + i);
        const cell = ws.getCell(`${colLetter}7`);
        cell.value = modelosTitulos[i];
        cell.font = { name: 'Arial', color: { argb: 'FF800000' }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'top' }; applyThinBorders(cell);
    }

    ws.getCell('F7').value = 'Totales';
    ws.getCell('F7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY } };
    ws.getCell('F7').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true, size: 14 };
    ws.getCell('F7').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('F7'));

    try {
        // Centrado exacto: col_width=154px, row_height=100px
        // offset_col = (col_px - img_w) / (2 * col_px) = fracción de columna
        // offset_row = (row_px - img_h) / (2 * row_px) = fracción de fila
        const colPx = 154; // 22 chars * 7px
        const rowPx = 100; // 75pts ~= 100px
        const buses = [
            { path: '/images/urbanu.webp',      col: 1, w: 110, h: 48 },
            { path: '/images/zafiro.webp',      col: 2, w: 100, h: 52 },
            { path: '/images/vagoneta.webp',    col: 3, w: 95,  h: 48 },
            { path: '/images/orionfrente.webp', col: 4, w: 80,  h: 55 }
        ];
        for (const bus of buses) {
            const imgBus = await fetchImageAsPng(bus.path, false);
            if(imgBus) {
                const imgId = wb.addImage({ base64: imgBus, extension: 'png' });
                const offsetCol = (colPx - bus.w) / (2 * colPx) + 0.45;
                const offsetRow = (rowPx - bus.h) / (2 * rowPx);
                ws.addImage(imgId, { tl: { col: bus.col + offsetCol, row: 6 + offsetRow }, ext: { width: bus.w, height: bus.h } });
            }
        }
    } catch(e) {
        // Ignorar fallo al cargar imagenes decorativas
    }

    const r8 = ws.getRow(8); r8.height = 40;
    ws.getCell('A8').value = 'Eficiencia';
    ws.getCell('A8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C1E3F' } };
    ws.getCell('A8').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A8').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A8'));

    modelStats.forEach((m, idx) => {
        const col = String.fromCharCode(66 + idx);
        const cell = ws.getCell(`${col}8`);
        cell.value = `${m.eficiencia}%`;
        cell.font = { name: 'Arial', color: { argb: 'FF00B050' }, bold: true, size: 22 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(cell);
    });
    ws.getCell('F8').value = `${totales.totalEficiencia}%`;
    ws.getCell('F8').font = { name: 'Arial', color: { argb: 'FF00B050' }, bold: true, size: 22 };
    ws.getCell('F8').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('F8'));

    const r9 = ws.getRow(9); r9.height = 25;
    ws.getCell('A9').value = 'En operación';
    ws.getCell('A9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD } };
    ws.getCell('A9').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A9').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A9'));

    modelStats.forEach((m, idx) => {
        const col = String.fromCharCode(66 + idx);
        const cell = ws.getCell(`${col}9`);
        cell.value = m.operacion;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6DFCA' } };
        cell.font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true, size: 16 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(cell);
    });
    ws.getCell('F9').value = totales.totalOperacion;
    ws.getCell('F9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6DFCA' } };
    ws.getCell('F9').font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true, size: 18 };
    ws.getCell('F9').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('F9'));

    const r10 = ws.getRow(10); r10.height = 25;
    ws.getCell('A10').value = 'Programación Unidades/Conductores';
    ws.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    ws.getCell('A10').font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true };
    ws.getCell('A10').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; applyThinBorders(ws.getCell('A10'));
    
    modelStats.forEach((m, idx) => {
        const col = String.fromCharCode(66 + idx);
        const cell = ws.getCell(`${col}10`);
        cell.value = m.programadas;
        cell.font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true, size: 16 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(cell);
    });
    ws.getCell('F10').value = totales.totalProgramadas;
    ws.getCell('F10').font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true, size: 18 };
    ws.getCell('F10').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('F10'));

    ws.mergeCells('A11:F11');
    ws.getCell('A11').value = 'Unidades en reserva';
    ws.getCell('A11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD } };
    ws.getCell('A11').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A11').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell('A12').value = 'Modelo';
    ws.getCell('A12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY } };
    ws.getCell('A12').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A12').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A12'));
    for(let i=0; i<4; i++) {
        const col = String.fromCharCode(66 + i);
        const cell = ws.getCell(`${col}12`);
        cell.value = modelosTitulos[i];
        cell.font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(cell);
    }
    ws.mergeCells('F12:F13');
    ws.getCell('F12').value = 'Total en reserva';
    ws.getCell('F12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY } };
    ws.getCell('F12').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('F12').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('F12'));

    // Sin height fijo para auto-fit
    ws.getCell('A13').value = 'Económico';
    ws.getCell('A13').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY } };
    ws.getCell('A13').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A13').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A13'));
    modelStats.forEach((m, idx) => {
        const col = String.fromCharCode(66 + idx);
        const cell = ws.getCell(`${col}13`);
        cell.value = m.reservaEcosText;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true }; applyThinBorders(cell);
    });

    ws.getRow(14).height = 30;
    ws.getCell('A14').value = 'Total';
    ws.getCell('A14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY } };
    ws.getCell('A14').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A14').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A14'));
    modelStats.forEach((m, idx) => {
        const col = String.fromCharCode(66 + idx);
        const cell = ws.getCell(`${col}14`);
        cell.value = m.reservaCount;
        cell.font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true, size: 14 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(cell);
    });
    ws.getCell('F14').value = totales.totalEnReserva;
    ws.getCell('F14').font = { name: 'Arial', color: { argb: COLOR_GRAY }, bold: true, size: 24 };
    ws.getCell('F14').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('F14'));

    ws.mergeCells('A15:F15');
    ws.getCell('A15').value = 'Unidades en mantenimiento';
    ws.getCell('A15').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD } };
    ws.getCell('A15').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A15').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell('A16').value = 'Modelo';
    ws.getCell('A16').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY } };
    ws.getCell('A16').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A16').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A16'));
    for(let i=0; i<4; i++) {
        const col = String.fromCharCode(66 + i);
        const cell = ws.getCell(`${col}16`);
        cell.value = modelosTitulos[i];
        cell.font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(cell);
    }
    ws.mergeCells('F16:F17');
    ws.getCell('F16').value = 'Total en mantenimiento';
    ws.getCell('F16').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C1E3F' } };
    ws.getCell('F16').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('F16').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('F16'));

    // Sin height fijo para auto-fit
    ws.getCell('A17').value = 'Económico/falla';
    ws.getCell('A17').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C1E3F' } };
    ws.getCell('A17').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A17').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A17'));
    modelStats.forEach((m, idx) => {
        const col = String.fromCharCode(66 + idx);
        const cell = ws.getCell(`${col}17`);
        cell.value = m.mantFallasText;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true, size: 9 }; applyThinBorders(cell);
    });

    ws.getRow(18).height = 30;
    ws.getCell('A18').value = 'Total';
    ws.getCell('A18').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C1E3F' } };
    ws.getCell('A18').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A18').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A18'));
    modelStats.forEach((m, idx) => {
        const col = String.fromCharCode(66 + idx);
        const cell = ws.getCell(`${col}18`);
        cell.value = m.mantCount;
        cell.font = { name: 'Arial', color: { argb: 'FF000000' }, bold: true, size: 14 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(cell);
    });
    ws.getCell('F18').value = totales.totalEnMantenimiento;
    ws.getCell('F18').font = { name: 'Arial', color: { argb: 'FF9C1E3F' }, bold: true, size: 24 };
    ws.getCell('F18').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('F18'));

    ws.mergeCells('A19:F19');
    ws.getCell('A19').value = 'Corridas faltantes';
    ws.getCell('A19').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VINO } };
    ws.getCell('A19').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A19').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell('A20').value = 'Servicio Alimentador';
    ws.getCell('A20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C1E3F' } };
    ws.getCell('A20').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('A20').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('A20'));
    ws.getCell('B20').value = faltantesAlimentador;
    ws.getCell('B20').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('B20'));
    ws.mergeCells('C20:D20');
    ws.getCell('C20').value = 'Servicio Troncal';
    ws.getCell('C20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C1E3F' } };
    ws.getCell('C20').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('C20').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('C20'));
    ws.getCell('E20').value = faltantesTroncal;
    ws.getCell('E20').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('E20'));
    ws.getCell('F20').value = `Total: ${faltantesAlimentador + faltantesTroncal}`;
    ws.getCell('F20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C1E3F' } };
    ws.getCell('F20').font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('F20').alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell('F20'));

    let rIdx = 22;
    ws.mergeCells(`A${rIdx}:F${rIdx}`);
    ws.getCell(`A${rIdx}`).value = 'Personas conductoras';
    ws.getCell(`A${rIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VINO } };
    ws.getCell(`A${rIdx}`).font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell(`A${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
    rIdx++;

    ws.mergeCells(`A${rIdx}:E${rIdx}`);
    ws.getCell(`A${rIdx}`).value = 'Reservas programadas';
    ws.getCell(`A${rIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C1E3F' } };
    ws.getCell(`A${rIdx}`).font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell(`A${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`F${rIdx}`).value = conductoresEnReserva.length;
    ws.getCell(`F${rIdx}`).font = { name: 'Arial', color: { argb: 'FF9C1E3F' }, bold: true };
    ws.getCell(`F${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell(`F${rIdx}`));
    rIdx++;

    ws.mergeCells(`A${rIdx}:E${rIdx}`);
    ws.getCell(`A${rIdx}`).value = 'Faltas de conductor';
    ws.getCell(`A${rIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C1E3F' } };
    ws.getCell(`A${rIdx}`).font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell(`A${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`F${rIdx}`).value = conductoresConFalta.length;
    ws.getCell(`F${rIdx}`).font = { name: 'Arial', color: { argb: 'FF9C1E3F' }, bold: true };
    ws.getCell(`F${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell(`F${rIdx}`));
    rIdx+=2;

    if(conductoresConFalta.length > 0) {
      ws.mergeCells(`A${rIdx}:F${rIdx}`);
      ws.getCell(`A${rIdx}`).value = 'Conductores con falta';
      ws.getCell(`A${rIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VINO } };
      ws.getCell(`A${rIdx}`).font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true };
      ws.getCell(`A${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };
      rIdx++;
      
      conductoresConFalta.forEach(c => {
        ws.mergeCells(`A${rIdx}:C${rIdx}`);
        ws.getCell(`A${rIdx}`).value = `${c.nombres || ''} ${c.apellidos || ''}`.trim() || c.nombre || '';
        ws.getCell(`A${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell(`A${rIdx}`));
        ws.mergeCells(`D${rIdx}:E${rIdx}`);
        ws.getCell(`D${rIdx}`).value = formatFolio(c.tarjeton);
        ws.getCell(`D${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell(`D${rIdx}`));
        ws.getCell(`F${rIdx}`).value = c.tipo_tarjeton || 'B';
        ws.getCell(`F${rIdx}`).alignment = { horizontal: 'center', vertical: 'middle' }; applyThinBorders(ws.getCell(`F${rIdx}`));
        rIdx++;
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fDate = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
    saveAs(blob, `Resumen_Despacho_${fDate}.xlsx`);
    
    Swal.fire({ icon: 'success', title: '¡Reporte Generado!', text: 'El Resumen de Excel se generó correctamente.', confirmButtonColor: '#601a2a', timer: 3000 });
  } catch (error) {
    console.error('Error Excel:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al procesar el Excel.', confirmButtonColor: '#601a2a' });
  } finally {
    if (typeof setLoading === 'function') setLoading(false);
  }
}
