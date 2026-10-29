import jsPDF from 'jspdf';
import API_BASE from '../config/api';
import { estaDesincorporadaPorItinerario } from './itinerarioUtils';

const DEFAULT_MODELS_CONFIG = [
    { id: 'URBANUS', label: 'URBANUSS', image: '/images/urbanussfrenterealista.webp', color: 'maroon' },
    { id: 'ZAFIRO', label: 'ZAFIRO', image: '/images/zafirofrenterealista.webp', color: 'gold' },
    { id: 'VAGONETA', label: 'VAGONETA', image: '/images/vagoneta frente.webp', color: 'green' },
    { id: 'ORION', label: 'ORIÓN', image: '/images/orionfrente.webp', color: 'blue' },
];

function calcularMetricasDesdeDatos(apiData = [], inicioData = []) {
    const normStr = (str) =>
        (str || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .trim();

    const computedModelData = DEFAULT_MODELS_CONFIG.map((mc) => {
        const units = (Array.isArray(apiData) ? apiData : []).filter((d) => {
            const matchesModel = normStr(d.TIPO_DE_UNIDAD).includes(normStr(mc.id));
            const est = normStr(d.ESTATUS || d.estatus);
            const isNoProgramada = est === 'NO_PROGRAMADA' || est === 'NO PROGRAMADA';
            return matchesModel && !isNoProgramada;
        });
        const getEstatus = (d) => normStr(d.ESTATUS || d.estatus);

        const unidadesDesincItinerario = units.filter((d) => estaDesincorporadaPorItinerario(d));
        const unidadesOperacion = units.filter((d) => getEstatus(d).includes('OPERACI') && !estaDesincorporadaPorItinerario(d));
        const unidadesCirculando = units.filter((d) => {
            const horaSalida = (d.HORA_REAL_SALIDA_PATIO || d.HORA_SALIDA || '').toString().trim();
            const isEncerrada = Boolean(d.YA_ENCERRADA || d.ya_encerrada);
            return getEstatus(d).includes('OPERACI') && !estaDesincorporadaPorItinerario(d) && horaSalida !== '' && !isEncerrada;
        });
        const unidadesReserva = units.filter((d) => getEstatus(d) === 'RESERVA');
        const unidadesMantenimiento = units.filter((d) => getEstatus(d) === 'MANTENIMIENTO');
        const unidadesPercance = units.filter((d) => getEstatus(d).includes('PERCANCE'));

        const unidadesEncerradasProgramadas = units.filter((d) => {
            if (Boolean(d.TURNO_CUMPLIDO || d.turno_cumplido)) return true;
            const est = getEstatus(d);
            if (est === 'MANTENIMIENTO' || est.includes('PERCANCE') || est.includes('TALLER')) return false;
            const isEncerrada = Boolean(d.YA_ENCERRADA || d.ya_encerrada);
            const motivo = (d.MOTIVO_ESTATUS || d.motivo_estatus || d.MOTIVO || d.motivo || '').toString().toLowerCase();
            const esFallaOPercance = motivo.includes('falla') ||
                motivo.includes('averia') ||
                motivo.includes('siniestro') ||
                motivo.includes('taller') ||
                motivo.includes('mantenimiento') ||
                motivo.includes('percance');
            if (esFallaOPercance) return false;
            const esEncierroMotivo = motivo.includes('fin de turno') ||
                motivo.includes('encierro programado') ||
                motivo.includes('encierro regular') ||
                motivo.includes('encierro') ||
                motivo.includes('turno cumplido') ||
                motivo.includes('cumplio turno') ||
                motivo.includes('cumplió turno') ||
                motivo.includes('cumplimiento') ||
                motivo.includes('termino de turno') ||
                motivo.includes('término de turno') ||
                motivo.includes('servicio concluido') ||
                motivo.includes('fin de servicio') ||
                motivo.includes('concluyo servicio') ||
                motivo.includes('concluyó servicio') ||
                motivo.includes('fin de jornada');
            return isEncerrada || esEncierroMotivo;
        });

        const total = units.length;
        const operacion = unidadesOperacion.length;
        const desincItinerario = unidadesDesincItinerario.length;
        const circulando = unidadesCirculando.length;
        const encerradasProgramadas = unidadesEncerradasProgramadas.length;
        const mantenimiento = unidadesMantenimiento.length;
        const reserva = unidadesReserva.length;
        const percance = unidadesPercance.length;

        const hasSnapshot = Array.isArray(inicioData) && inicioData.length > 0;
        const programadasInicio = hasSnapshot
            ? inicioData.filter(d => {
                const matchesModel = normStr(d.TIPO_DE_UNIDAD).includes(normStr(mc.id));
                const estatusNorm = normStr(d.ESTATUS || d.estatus);
                return matchesModel && estatusNorm.includes('OPERACI');
            }).length
            : 0;
        const progFallback = units.filter(d => normStr(d.ESTATUS || d.estatus).includes('OPERACI') || Boolean(d.MANTENIMIENTO_RUTA || d.mantenimiento_ruta)).length;
        const programadas = hasSnapshot ? programadasInicio : (progFallback || total || unidadesOperacion.length);

        return {
            ...mc,
            total,
            programadas,
            operacion,
            desincItinerario,
            circulando,
            encerradasProgramadas,
            reserva,
            mantenimiento,
            percance,
            otros: 0,
            units,
        };
    });

    const computedTotales = computedModelData.reduce(
        (acc, m) => ({
            total: (acc.total || 0) + (m.total || 0),
            programadas: acc.programadas + m.programadas,
            operacion: acc.operacion + m.operacion,
            desincItinerario: (acc.desincItinerario || 0) + (m.desincItinerario || 0),
            encerradasProgramadas: (acc.encerradasProgramadas || 0) + (m.encerradasProgramadas || 0),
            circulando: (acc.circulando || 0) + (m.circulando || 0),
            reserva: acc.reserva + m.reserva,
            mantenimiento: acc.mantenimiento + m.mantenimiento,
            percance: (acc.percance || 0) + (m.percance || 0),
        }),
        { total: 0, programadas: 0, operacion: 0, desincItinerario: 0, encerradasProgramadas: 0, circulando: 0, reserva: 0, mantenimiento: 0, percance: 0 }
    );

    const computedEficiencia = computedTotales.programadas > 0
        ? Math.min(100, Math.round(((computedTotales.circulando + (computedTotales.desincItinerario || 0) + (computedTotales.encerradasProgramadas || 0)) / computedTotales.programadas) * 100))
        : 0;

    return {
        totales: computedTotales,
        modelData: computedModelData,
        eficienciaGlobal: computedEficiencia,
    };
}

const COLOR_GUINDA      = [96, 26, 42]; 
const COLOR_WHITE       = [255, 255, 255];
const COLOR_GREEN       = [22, 163, 74];
const COLOR_GOLD        = [180, 83, 9];
const COLOR_AMBER       = [217, 119, 6];
const COLOR_RED         = [220, 38, 38];
const COLOR_ROSE        = [225, 29, 72];
const COLOR_BLUE        = [37, 99, 235];
const COLOR_GRAY        = [107, 114, 128];
const COLOR_LIGHT_GRAY  = [243, 244, 246];
const COLOR_BEIGE_HEADER= [216, 192, 157]; // #d8c09d
const COLOR_BEIGE_BG    = [229, 215, 195]; // #e5d7c3
const COLOR_BEIGE_BORDER= [209, 193, 169]; // #d1c1a9
const COLOR_GRAY_BANNER = [115, 123, 133]; // #737b85
const COLOR_LIGHT_CELL  = [226, 232, 240]; // #e2e8f0

const loadImage = (src) => {
    return new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
};

const getModelColor = (modelId) => {
    switch(modelId?.toUpperCase()) {
        case 'URBANUS':
        case 'URBANUSS': return COLOR_GUINDA;
        case 'ZAFIRO': return COLOR_GOLD;
        case 'VAGONETA': return COLOR_GREEN;
        case 'ORION':
        case 'ORIÓN': return COLOR_BLUE;
        default: return COLOR_GRAY;
    }
};

function formatFolio(tarjeton) {
    if (!tarjeton) return '--';
    const str = String(tarjeton).trim();
    if (str.toUpperCase().startsWith('TPA')) {
        const numPart = str.slice(3).replace(/\D/g, '');
        return numPart ? `TPA${numPart.padStart(4, '0')}` : str.toUpperCase();
    }
    const clean = str.replace(/\D/g, '');
    return clean ? `TPA${clean.padStart(4, '0')}` : str.toUpperCase();
}

function formatTipo(c) {
    if (!c) return 'C';
    const raw = String(c.tipo_tarjeton || c.tipo_conductor || c.tipo_licencia || c.tipo || 'C').toUpperCase();
    if (raw.includes('TRONCAL') || raw.includes('ARTICULADO') || raw.includes('BRT') || raw === 'C') return 'C';
    if (raw.includes('ALIMENTADOR') || raw.includes('CONVENCIONAL') || raw === 'B') return 'B';
    if (raw === 'A') return 'A';
    return raw.slice(0, 1) || 'C';
}

function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s|\/|-)\p{L}/gu, (match) => match.toUpperCase());
}



function drawHeader(pdf, pw, fecha, bannerImg, stmImg, hgoImg, horaInicioDespacho = '--:--', horaTerminoDespacho = '--:--') {
    // 1. Banner swoosh decorativo en la esquina superior izquierda
    if (bannerImg && (bannerImg.naturalWidth > 0 || bannerImg.width > 0)) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = bannerImg.naturalWidth || bannerImg.width;
            canvas.height = bannerImg.naturalHeight || bannerImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bannerImg, 0, 0);
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 160, 23);
        } catch {
            pdf.setFillColor(...COLOR_GUINDA);
            pdf.rect(0, 0, 140, 23, 'F');
        }
    } else {
        pdf.setFillColor(...COLOR_GUINDA);
        pdf.rect(0, 0, 140, 23, 'F');
    }

    // 2. Logo Sistema de Transporte Metropolitano sobre el swoosh
    if (stmImg && (stmImg.naturalWidth > 0 || stmImg.width > 0)) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = stmImg.naturalWidth || stmImg.width;
            canvas.height = stmImg.naturalHeight || stmImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(stmImg, 0, 0);
            const maxW = 42;
            const maxH = 16;
            const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
            const drawW = canvas.width * ratio;
            const drawH = canvas.height * ratio;
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 8, 3.5, drawW, drawH);
        } catch {}
    }

    // 3. Logo Escudo Hidalgo a la derecha
    if (hgoImg && (hgoImg.naturalWidth > 0 || hgoImg.width > 0)) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = hgoImg.naturalWidth || hgoImg.width;
            canvas.height = hgoImg.naturalHeight || hgoImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(hgoImg, 0, 0);
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', pw - 23, 3, 16, 16);
        } catch {}
    }

    // 4. Textos institucionales superiores a la derecha
    const rightLimit = pw - 26;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(31, 41, 55); // #1f2937
    pdf.text('PLATAFORMA ACOTMA', rightLimit, 5.2, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15.5);
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.text('DESPACHO DEL SERVICIO', rightLimit, 10.6, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81); // #374151
    pdf.text(fecha, rightLimit, 15.0, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.text(`INICIO DE DESPACHO: ${horaInicioDespacho}`, rightLimit, 18.8, { align: 'right' });
    pdf.text(`TÉRMINO DE DESPACHO: ${horaTerminoDespacho}`, rightLimit, 22.3, { align: 'right' });
}

function drawFooter(pdf, pw, ph, pageNum, totalPages = 3) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(17, 24, 39);
    pdf.text(`PÁG. ${pageNum} de ${totalPages}`, pw - 10, ph - 6, { align: 'right' });
}

export const generarPDFEstadisticasCentro = async (totales = null, modelData = null, eficienciaGlobal = null, apiDataParam = null) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    // Fechas actuales (Local México y UTC)
    const nowLocal = new Date();
    const anoLocal = nowLocal.getFullYear();
    const mesLocal = String(nowLocal.getMonth() + 1).padStart(2, '0');
    const diaLocal = String(nowLocal.getDate()).padStart(2, '0');
    const todayLocalStr = `${anoLocal}-${mesLocal}-${diaLocal}`;
    const todayIsoStr = nowLocal.toISOString().slice(0, 10);

    // Consultas complementarias en paralelo
    const [
        resDespacho,
        resReservasHoy,
        resReservasLocal,
        resConductores,
        resMonitoreo,
        resCiclosHoy,
        resInicioHoy
    ] = await Promise.all([
        apiDataParam ? Promise.resolve(null) : fetch(`${API_BASE}/api/despacho/hoy`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/api/reservas/autorizadas?fecha=HOY`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/api/reservas/autorizadas?fecha=${todayLocalStr}`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/api/conductores?incluir_bajas=true`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/api/despacho/monitoreo-conductores/todos`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/api/despacho/ciclos?fecha=HOY`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/api/despacho/inicio-hoy`, { headers: authHeaders }).catch(() => null)
    ]);

    let listaUnidades = apiDataParam;
    if (!listaUnidades && resDespacho?.ok) {
        try { listaUnidades = await resDespacho.json(); } catch { listaUnidades = []; }
    }
    if (!Array.isArray(listaUnidades)) listaUnidades = [];

    let listaInicio = [];
    if (resInicioHoy?.ok) {
        try { listaInicio = await resInicioHoy.json(); } catch { listaInicio = []; }
    }
    if (!Array.isArray(listaInicio)) listaInicio = [];

    // Si se invoca desde otro módulo (ej. Despacho de Unidades) sin pre-calcular totales y modelData,
    // se calculan automáticamente con la misma fórmula que Centro de Control.
    if (!totales || !modelData || eficienciaGlobal === null || eficienciaGlobal === undefined) {
        const calculadas = calcularMetricasDesdeDatos(listaUnidades, listaInicio);
        if (!totales) totales = calculadas.totales;
        if (!modelData) modelData = calculadas.modelData;
        if (eficienciaGlobal === null || eficienciaGlobal === undefined) {
            eficienciaGlobal = calculadas.eficienciaGlobal;
        }
    }

    // Extraer tarjetones autorizados de reservas exclusivamente para HOY
    let listaReservasTarjeton = [];
    const parseTarjetones = async (res) => {
        if (!res?.ok) return [];
        try {
            const raw = await res.json();
            return Array.isArray(raw) ? raw.map(t => String(t || '').trim()).filter(Boolean) : [];
        } catch {
            return [];
        }
    };

    const [tarjHoy, tarjLocal] = await Promise.all([
        parseTarjetones(resReservasHoy),
        parseTarjetones(resReservasLocal)
    ]);

    // Combinar únicamente los tarjetones de reserva autorizados para HOY
    listaReservasTarjeton = Array.from(new Set([
        ...tarjHoy,
        ...tarjLocal
    ]));

    const normalizeTarjetonKey = (t) => {
        if (!t) return '';
        const digits = String(t).replace(/\D/g, '').trim();
        if (digits) {
            const num = Number.parseInt(digits, 10);
            return Number.isNaN(num) ? digits : String(num);
        }
        return String(t).toUpperCase().trim();
    };

    const setReservasAutorizadas = new Set(listaReservasTarjeton.map(normalizeTarjetonKey).filter(Boolean));

    let listaConductores = [];
    if (resConductores?.ok) {
        try {
            const rawCond = await resConductores.json();
            if (Array.isArray(rawCond)) listaConductores = rawCond;
        } catch {}
    }

    let conductoresFaltaMonitoreo = [];
    if (resMonitoreo?.ok) {
        try {
            const dataMon = await resMonitoreo.json();
            if (Array.isArray(dataMon?.conductores_falta)) {
                conductoresFaltaMonitoreo = dataMon.conductores_falta;
            }
        } catch {}
    }

    let ciclosRegistrados = null;
    if (resCiclosHoy?.ok) {
        try {
            const dataCiclos = await resCiclosHoy.json();
            if (dataCiclos?.ciclos !== null && dataCiclos?.ciclos !== undefined) {
                ciclosRegistrados = Number(dataCiclos.ciclos);
            }
        } catch {}
    }

    // =========================================================================
    // PROCESAMIENTO DE FALTAS DEL DÍA (CONDUCTORES NORMALES Y EN RESERVA)
    // =========================================================================
    const conductoresConFalta = [];
    const tarjetonesFaltaSet = new Set();

    // 1. Integrar faltas identificadas por Mesa de Control (monitoreo-conductores: estrictamente faltas/inasistencias de hoy)
    conductoresFaltaMonitoreo.forEach(cm => {
        const estadoMon = String(cm.estado_servicio || cm.estado || '').toLowerCase().trim();
        const observaciones = String(cm.observaciones || cm.motivo || '').toLowerCase().trim();

        // Excluir descansos, vacaciones, permutas, permisos e incapacidades (NO son faltas injustificadas)
        const esInasistenciaNoFalta = estadoMon === 'descanso' || estadoMon === 'vacaciones' || 
                                      estadoMon === 'permiso' || estadoMon === 'incapacidad' || 
                                      estadoMon === 'permuta';
        if (esInasistenciaNoFalta) return;

        const esFaltaDirecta = estadoMon === 'falta' || estadoMon === 'inasistencia' || 
                               observaciones.includes('falta') || observaciones.includes('inasistencia');
        if (!esFaltaDirecta) return;

        const tKey = normalizeTarjetonKey(cm.tarjeton);
        if (tKey && !tarjetonesFaltaSet.has(tKey)) {
            tarjetonesFaltaSet.add(tKey);
            const enCatalogo = listaConductores.find(c => normalizeTarjetonKey(c.tarjeton) === tKey);
            if (enCatalogo) {
                conductoresConFalta.push(enCatalogo);
            } else {
                conductoresConFalta.push({
                    tarjeton: cm.tarjeton,
                    nombre: cm.nombre_completo || cm.nombre,
                    tipo_conductor: cm.tipo_tarjeton || 'C',
                    estado_servicio: 'falta'
                });
            }
        }
    });

    // 2. Integrar faltas registradas en catálogo estrictamente para la fecha de HOY
    listaConductores.forEach(c => {
        let faltas = [];
        const raw = c.faltas_detalle;
        if (Array.isArray(raw)) faltas = raw;
        else if (typeof raw === 'string' && raw.trim()) {
            try { faltas = JSON.parse(raw); } catch { faltas = []; }
        }

        let asistencias = [];
        const rawAsis = c.asistencias_detalle;
        if (Array.isArray(rawAsis)) asistencias = rawAsis;
        else if (typeof rawAsis === 'string' && rawAsis.trim()) {
            try { asistencias = JSON.parse(rawAsis); } catch { asistencias = []; }
        }

        const tieneFaltaHoy = faltas.some(f => {
            const fDate = String(f.fecha || '').slice(0, 10);
            const esFechaCoincidente = (fDate === todayLocalStr || fDate === todayIsoStr);
            const noJustificada = !f.justificada && f.estado !== 'justificada' && f.estado !== 'retardo';
            return esFechaCoincidente && noJustificada;
        });

        const tieneAsistenciaFalta = asistencias.some(a => {
            const aDate = String(a.fecha || '').slice(0, 10);
            const esFecha = (aDate === todayLocalStr || aDate === todayIsoStr);
            const esFalta = String(a.estado || '').toLowerCase() === 'falta' || String(a.estado || '').toLowerCase() === 'inasistencia';
            return esFecha && esFalta;
        });

        if (tieneFaltaHoy || tieneAsistenciaFalta) {
            const tKey = normalizeTarjetonKey(c.tarjeton) || String(c.id);
            if (tKey && !tarjetonesFaltaSet.has(tKey)) {
                tarjetonesFaltaSet.add(tKey);
                conductoresConFalta.push(c);
            }
        }
    });

    // 3. Detectar si en las unidades operativas se reportó falta específica de conductor (no falla mecánica)
    listaUnidades.forEach(u => {
        const textoMotivo = [
            u.MOTIVO_ESTATUS, u.CAMBIO_MOTIVO, u.FALLA, u.MOTIVO, u.MOTIVO_FALTANTE, u.FALLA_REPORTADA
        ].map(m => String(m || '').toLowerCase()).join(' ');

        const esFaltaConductor = /\bfalta\s+de\s+(?:conductor|operador)\b/i.test(textoMotivo) || 
                                 /\binasistencia\s+de\s+(?:conductor|operador)\b/i.test(textoMotivo) ||
                                 /\b(?:conductor|operador)\s+no\s+se\s+present[oó]\b/i.test(textoMotivo);

        if (esFaltaConductor) {
            const tarj = String(u.TARJETON || u.tarjeton || u.numero_tarjeton || u.CAMBIO_DESDE || '').trim();
            const tKey = normalizeTarjetonKey(tarj);
            if (tKey && !tarjetonesFaltaSet.has(tKey)) {
                tarjetonesFaltaSet.add(tKey);
                const enCatalogo = listaConductores.find(c => normalizeTarjetonKey(c.tarjeton) === tKey);
                if (enCatalogo) {
                    conductoresConFalta.push(enCatalogo);
                } else {
                    const nom = String(u.NOMBRE_CONDUCTOR || u.nombre_conductor || u.CONDUCTOR || u.conductor || '').trim();
                    conductoresConFalta.push({
                        tarjeton: tarj,
                        nombre: nom,
                        tipo_conductor: u.TIPO_DE_UNIDAD || u.tipo || 'B',
                        estado_servicio: 'falta'
                    });
                }
            }
        }
    });

    // =========================================================================
    // PROCESAMIENTO DE CONDUCTORES EN RESERVA (PROGRAMACIÓN Y LOGÍSTICA)
    // =========================================================================
    const conductoresEnReservaTotal = [];
    const tarjetonesReservaSet = new Set();

    // 1. Tomar los conductores autorizados exclusivamente para la jornada de HOY
    if (setReservasAutorizadas.size > 0) {
        setReservasAutorizadas.forEach(tKey => {
            if (!tarjetonesReservaSet.has(tKey) && !tarjetonesFaltaSet.has(tKey)) {
                tarjetonesReservaSet.add(tKey);
                const enCatalogo = listaConductores.find(c => normalizeTarjetonKey(c.tarjeton) === tKey);
                if (enCatalogo) {
                    conductoresEnReservaTotal.push(enCatalogo);
                } else {
                    conductoresEnReservaTotal.push({
                        tarjeton: tKey,
                        nombre: `Operador Tarjetón ${formatFolio(tKey)}`,
                        tipo_conductor: 'C',
                        estado_servicio: 'reserva'
                    });
                }
            }
        });
    } else {
        // Fallback si no existieran registros en reservas_autorizadas para hoy
        listaConductores.forEach(c => {
            const tKey = normalizeTarjetonKey(c.tarjeton);
            const estado = String(c.estado_servicio || '').toLowerCase();
            const isReservaEstado = estado === 'reserva' || estado === 'en_reserva';
            const tieneFaltaHoy = tKey !== '' && tarjetonesFaltaSet.has(tKey);

            if (isReservaEstado && !tieneFaltaHoy) {
                if (tKey && !tarjetonesReservaSet.has(tKey)) {
                    tarjetonesReservaSet.add(tKey);
                    conductoresEnReservaTotal.push(c);
                }
            }
        });
    }

    // 2. Identificar qué conductores ya están asignados a unidades en servicio/operación o relevo
    const tarjetonesEnServicioSet = new Set();
    const nombresEnServicioSet = new Set();

    listaUnidades.forEach(u => {
        const est = String(u.ESTATUS || u.estatus || '').toLowerCase().trim();
        const isOperacion = est === 'operacion' || est.includes('operacion') || est === 'circulando' || est === 'itinerario';
        if (isOperacion) {
            const tarj = normalizeTarjetonKey(u.TARJETON || u.tarjeton || u.numero_tarjeton);
            const tarjRelevo = normalizeTarjetonKey(u.RELEVO_TARJETON || u.relevo_tarjeton);
            const nom = String(u.NOMBRE_CONDUCTOR || u.nombre_conductor || u.CONDUCTOR || u.conductor || '').trim().toLowerCase();
            const nomRelevo = String(u.RELEVO_CONDUCTOR || u.relevo_conductor || '').trim().toLowerCase();

            if (tarj) tarjetonesEnServicioSet.add(tarj);
            if (tarjRelevo) tarjetonesEnServicioSet.add(tarjRelevo);
            if (nom) nombresEnServicioSet.add(nom);
            if (nomRelevo) nombresEnServicioSet.add(nomRelevo);
        }
    });

    listaConductores.forEach(c => {
        const estado = String(c.estado_servicio || '').toLowerCase().trim();
        if (estado === 'en_servicio') {
            const tKey = normalizeTarjetonKey(c.tarjeton);
            if (tKey) tarjetonesEnServicioSet.add(tKey);
            const cNom = String(c.nombre || `${c.nombres || ''} ${c.apellidos || ''}`).toLowerCase().trim();
            if (cNom) nombresEnServicioSet.add(cNom);
        }
    });

    const isEnServicio = (c) => {
        const tKey = normalizeTarjetonKey(c.tarjeton);
        if (tKey && tarjetonesEnServicioSet.has(tKey)) return true;
        const nom = String(c.nombre || c.nombre_completo || `${c.nombres || ''} ${c.apellidos || ''}`).toLowerCase().trim();
        if (nom && nombresEnServicioSet.has(nom)) return true;
        return false;
    };

    // Filtrar: los conductores disponibles son aquellos de reserva que aún NO han entrado a servicio
    const conductoresEnReservaDisponibles = conductoresEnReservaTotal.filter(c => !isEnServicio(c));
    const conductoresEnReserva = conductoresEnReservaDisponibles;

    // Procesamiento de corridas faltantes
    const parseCiclo = (val) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return Number.isNaN(val) ? 0 : val;
        const str = String(val).trim();
        if (!str || str === '-' || str === '--') return 0;

        if (str === '1/2') return 0.5;

        if (/^\d+\/\d+$/.test(str)) {
            const [n, d] = str.split('/').map(Number);
            return d !== 0 ? n / d : 0;
        }

        const mixedMatch = /^(\d+)\s+(\d+)\/(\d+)$/.exec(str);
        if (mixedMatch) {
            const entero = Number(mixedMatch[1]);
            const n = Number(mixedMatch[2]);
            const d = Number(mixedMatch[3]);
            return d !== 0 ? entero + (n / d) : entero;
        }

        const numDirecto = Number(str.replace(',', '.'));
        if (!Number.isNaN(numDirecto)) return numDirecto;

        const tokens = str.split(/\s+/);
        let sum = 0;
        let found = false;
        for (const token of tokens) {
            const t = token.trim();
            if (t.includes('/')) {
                const parts = t.split('/');
                if (parts.length === 2) {
                    const n = Number(parts[0]);
                    const d = Number(parts[1]);
                    if (!Number.isNaN(n) && !Number.isNaN(d) && d !== 0) {
                        sum += n / d;
                        found = true;
                    }
                }
            } else {
                const n = Number(t.replace(',', '.'));
                if (!Number.isNaN(n) && n > 0) {
                    sum += n;
                    found = true;
                }
            }
        }
        return found ? sum : 0;
    };

    const formatCiclo = (num) => {
        if (!num || Number.isNaN(num) || num <= 0) return '0';
        const entero = Math.floor(num);
        const residuo = Math.round((num - entero) * 100) / 100;
        const enteroStr = entero.toLocaleString('es-MX');

        if (Math.abs(residuo - 0.5) < 0.05) {
            return entero === 0 ? '1/2' : `${enteroStr} 1/2`;
        }
        if (Math.abs(residuo) < 0.05) {
            return enteroStr;
        }
        if (Math.abs(residuo - 0.25) < 0.05) {
            return entero === 0 ? '1/4' : `${enteroStr} 1/4`;
        }
        if (Math.abs(residuo - 0.75) < 0.05) {
            return entero === 0 ? '3/4' : `${enteroStr} 3/4`;
        }
        return Number.isInteger(num) ? enteroStr : String(Number(num.toFixed(2)));
    };

    const ciclosFaltantes = listaUnidades.filter(u => {
        const ciclo = u.CICLO || u.ciclo;
        return ciclo !== null && ciclo !== undefined && String(ciclo).trim() !== '';
    });

    const sumCiclos = (unidades) => {
        return unidades.reduce((acc, u) => {
            const cicloVal = u.CICLO || u.ciclo;
            return acc + parseCiclo(cicloVal);
        }, 0);
    };

    const unidadesAlimentador = ciclosFaltantes.filter(u => {
        const tipo = (u.TIPO_DE_UNIDAD || u.tipo || '').toUpperCase();
        const ruta = (u.RUTA || u.ruta || '').toUpperCase();
        return !tipo.includes('URBANUS') && !ruta.startsWith('T-');
    });

    const unidadesTroncal = ciclosFaltantes.filter(u => {
        const tipo = (u.TIPO_DE_UNIDAD || u.tipo || '').toUpperCase();
        const ruta = (u.RUTA || u.ruta || '').toUpperCase();
        return tipo.includes('URBANUS') || ruta.startsWith('T-');
    });

    const faltantesAlimentador = sumCiclos(unidadesAlimentador);
    const faltantesTroncal = sumCiclos(unidadesTroncal);
    const faltantesTotal = faltantesAlimentador + faltantesTroncal;



    // =========================================================================
    // CORRIDAS PENDIENTES POR PROGRAMACIÓN
    // =========================================================================
    // Se evalúan las unidades programadas. Si su hora de salida programada (o acople)
    // es posterior a la hora en que se generó el reporte (al dar clic), deben mostrarse.
    // "no importa que esa unidad ya esté despachada, si su hora de salida es despues
    // de cuando se generó el reporte, ahi se debe mostrar".
    const extraerMinutosYHora = (val) => {
        if (!val) return null;
        const str = String(val).trim();
        if (!str || str === '--:--' || str === '-' || str.toLowerCase() === 'null') return null;
        const match = /(\d{1,2}):(\d{2})/.exec(str);
        if (!match) return null;
        const h = Number.parseInt(match[1], 10);
        const m = Number.parseInt(match[2], 10);
        if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
        return {
            formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            minutes: h * 60 + m
        };
    };

    // Minutos actuales en que se generó el reporte (hora exacta del clic)
    const clickMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();

    const normEcoKey = (val) => {
        const s = String(val ?? '').trim();
        if (!s) return '';
        const n = Number.parseInt(s, 10);
        return (!Number.isNaN(n) && n > 0) ? String(n).padStart(3, '0') : s.toUpperCase();
    };

    // Mapa de apoyo con inicio-hoy (snapshot de apertura) por económico normalizado
    const mapaInicioPorEco = new Map();
    listaInicio.forEach(u => {
        const ecoKey = normEcoKey(u.ECONOMICO || u.numero_eco);
        if (ecoKey) mapaInicioPorEco.set(ecoKey, u);
    });

    // Combinar unidades operativas con inicio para no perder programaciones iniciales
    const universoUnidades = [...listaUnidades];
    const ecosEnUniverso = new Set(
        universoUnidades.map(u => normEcoKey(u.ECONOMICO || u.numero_eco)).filter(Boolean)
    );
    listaInicio.forEach(uIni => {
        const ecoKey = normEcoKey(uIni.ECONOMICO || uIni.numero_eco);
        if (ecoKey && !ecosEnUniverso.has(ecoKey)) {
            ecosEnUniverso.add(ecoKey);
            universoUnidades.push(uIni);
        }
    });

    const todasLasCorridas = [];
    universoUnidades.forEach(u => {
        const rawEco = String(u.ECONOMICO || u.numero_eco || '').trim();
        const ecoKey = normEcoKey(rawEco);
        const fallbackIni = mapaInicioPorEco.get(ecoKey) || {};
        const eco = ecoKey || normEcoKey(fallbackIni.ECONOMICO || fallbackIni.numero_eco);

        const rutaRaw = String(
            u.RUTA || u.ruta || fallbackIni.RUTA || fallbackIni.ruta ||
            u.MANTENIMIENTO_RUTA || u.mantenimiento_ruta || ''
        ).trim();
        const corridaRaw = String(
            u.CORRIDAS ?? u.CORRIDA ?? u.corrida ?? u.corridas ??
            fallbackIni.CORRIDAS ?? fallbackIni.CORRIDA ?? fallbackIni.corrida ?? fallbackIni.corridas ??
            u.MANTENIMIENTO_CORRIDA ?? u.mantenimiento_corrida ?? ''
        ).trim();

        // Hora de la columna "hora de salida de patio"
        const rawSalidaPatio = String(
            u.hora_salida_patio || u.HORA_SALIDA_PATIO || u['HORA DE SALIDA DE PATIO'] ||
            u.hora_salida_programada || u.hora_programada || u.HORA_PROGRAMADA ||
            fallbackIni.hora_salida_patio || fallbackIni.HORA_SALIDA_PATIO || fallbackIni['HORA DE SALIDA DE PATIO'] ||
            fallbackIni.hora_salida_programada || fallbackIni.hora_programada || fallbackIni.HORA_PROGRAMADA ||
            u.HORA_DE_ACOPLE || u.hora_de_acople || fallbackIni.HORA_DE_ACOPLE || fallbackIni.hora_de_acople ||
            ''
        ).trim();

        // Hora de acople (como fallback si no estuviera registrada hora de salida de patio)
        const rawAcople = String(u.ACOPLE || u.acople || fallbackIni.ACOPLE || fallbackIni.acople || '').trim();

        const objSalidaPatio = extraerMinutosYHora(rawSalidaPatio);
        const objAcople = extraerMinutosYHora(rawAcople);

        // Se jala estrictamente la hora de la columna "hora de salida de patio" (o acople como fallback).
        // NO se toma la hora de incorporación, ya que esa hora corresponde a itinerario.
        let displayHora = null;
        let refMinutes = null;

        const salidaPendiente = objSalidaPatio && objSalidaPatio.minutes > clickMinutes;
        const acoplePendiente = !objSalidaPatio && objAcople && objAcople.minutes > clickMinutes;

        if (salidaPendiente) {
            displayHora = objSalidaPatio.formatted;
            refMinutes = objSalidaPatio.minutes;
        } else if (acoplePendiente) {
            displayHora = objAcople.formatted;
            refMinutes = objAcople.minutes;
        }

        if (!displayHora || refMinutes === null) return;

        const rutaFormateada = rutaRaw ? rutaRaw.toUpperCase().replace(/^T(\d{2})$/, 'T-$1') : '';

        const tieneRuta = rutaFormateada && rutaFormateada !== 'SIN RUTA';
        const tieneCorrida = Boolean(corridaRaw);

        let textoEtiqueta = '';
        if (tieneRuta && tieneCorrida) {
            textoEtiqueta = `${rutaFormateada} corrida ${corridaRaw}`;
        } else if (eco) {
            textoEtiqueta = tieneRuta ? `Unidad ${eco} (${rutaFormateada})` : `Unidad ${eco}`;
        } else if (tieneRuta) {
            textoEtiqueta = `${rutaFormateada}`;
        } else {
            textoEtiqueta = `Unidad`;
        }

        todasLasCorridas.push({
            eco: eco,
            ruta: rutaFormateada,
            corrida: corridaRaw,
            etiqueta: textoEtiqueta,
            acople: displayHora,
            minutes: refMinutes
        });
    });

    // Deduplicar por unidad (económico) para no descartar unidades distintas que compartan ruta o número de corrida
    const corridasMap = new Map();
    todasLasCorridas.forEach((item, idx) => {
        const key = item.eco ? `eco_${item.eco}` : `item_${idx}`;
        if (!corridasMap.has(key) || item.minutes < corridasMap.get(key).minutes) {
            corridasMap.set(key, item);
        }
    });

    const corridasPendientes = Array.from(corridasMap.values())
        .sort((a, b) =>
            a.minutes - b.minutes ||
            (a.ruta || '').localeCompare(b.ruta || '', undefined, { numeric: true }) ||
            (a.eco || '').localeCompare(b.eco || '', undefined, { numeric: true })
        );

    const fecha = new Date().toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric'
    }).toUpperCase();

    // Calcular la hora en que inició el despacho (hora real de salida de la primera unidad despachada)
    const salidasDespachadas = [];
    universoUnidades.forEach(u => {
        const rawReal = String(
            u.HORA_REAL_SALIDA_PATIO || u.hora_real_salida_patio || u.HORA_SALIDA || u.hora_salida || ''
        ).trim();
        if (!rawReal || rawReal === '--:--' || rawReal === '-' || rawReal.toLowerCase() === 'null') return;
        const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(rawReal);
        if (!m) return;
        const hh = Number.parseInt(m[1], 10);
        const mm = Number.parseInt(m[2], 10);
        const ss = m[3] !== undefined ? Number.parseInt(m[3], 10) : 0;
        if (Number.isNaN(hh) || Number.isNaN(mm) || Number.isNaN(ss)) return;
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return;
        const totalSeconds = hh * 3600 + mm * 60 + ss;
        if (totalSeconds <= 0) return; // Ignorar 00:00 o 00:00:00
        salidasDespachadas.push({
            totalSeconds,
            formatted: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} HRS`
        });
    });
    salidasDespachadas.sort((a, b) => a.totalSeconds - b.totalSeconds);
    const horaInicioDespacho = salidasDespachadas.length > 0 ? salidasDespachadas[0].formatted : 'SIN INICIAR';
    const horaTerminoDespacho = salidasDespachadas.length > 0 ? salidasDespachadas[salidasDespachadas.length - 1].formatted : 'SIN INICIAR';

    // Formato exacto 4:3 (254mm x 190.5mm = 720pt x 540pt)
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [254, 190.5] });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    // Pre-cargar imágenes concurrentemente
    const [bannerImg, stmImg, hgoImg, conductoresImg, loadedModelImages] = await Promise.all([
        loadImage('/images/banner_swoosh_reporte.png'),
        loadImage('/images/sistema_de_tm.webp'),
        loadImage('/images/escudo_hidalgo.png'),
        loadImage('/images/conductores_reporte.png'),
        Promise.all(modelData.map(async (m) => [m.id, await loadImage(m.image)]))
    ]);

    const modelImages = Object.fromEntries(loadedModelImages);

    // ==========================================
    // PÁGINA 1: KPIs Y DESGLOSE POR TIPO
    // ==========================================
    drawHeader(pdf, pw, fecha, bannerImg, stmImg, hgoImg, horaInicioDespacho, horaTerminoDespacho);
    drawFooter(pdf, pw, ph, 1, 3);

    // 7 Cajas de KPIs
    let currentY = 26;
    const marginX = 10;
    const totalW = pw - marginX * 2;
    const gap = 2.4;
    const boxWidth = (totalW - (gap * 6)) / 7;
    const boxHeight = 21;

    const kpis = [
        { label: 'TOTAL PROGRAMADAS', value: totales.programadas, color: COLOR_GUINDA },
        { label: 'EN OPERACIÓN', value: totales.circulando ?? totales.operacion, color: COLOR_GREEN },
        { label: 'EN RESERVA', value: totales.reserva, color: COLOR_GOLD },
        { label: 'EN MANTENIMIENTO', value: totales.mantenimiento, color: COLOR_RED },
        { label: 'EN PERCANCE', value: totales.percance ?? 0, color: COLOR_ROSE },
        { label: 'DESINCORPORADAS\nPOR ITINERARIO', lines: ['DESINCORPORADAS', 'POR ITINERARIO'], value: totales.desincItinerario ?? 0, color: COLOR_AMBER },
        { label: 'EFICIENCIA OPERATIVA', value: `${eficienciaGlobal}%`, color: COLOR_GOLD, bg: [254, 243, 199] }
    ];

    kpis.forEach((kpi, i) => {
        const x = marginX + (boxWidth + gap) * i;
        
        pdf.setDrawColor(229, 231, 235);
        pdf.setFillColor(...(kpi.bg || COLOR_WHITE));
        pdf.roundedRect(x, currentY, boxWidth, boxHeight, 2, 2, kpi.bg ? 'FD' : 'D');
        
        // Franja lateral
        pdf.setFillColor(...kpi.color);
        pdf.roundedRect(x - 0.5, currentY + 0.8, 2.5, boxHeight - 1.6, 1, 1, 'F');
        
        // Valor
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(17);
        pdf.setTextColor(...kpi.color);
        pdf.text(String(kpi.value), x + (boxWidth / 2) + 0.8, currentY + 9.5, { align: 'center' });

        // Etiqueta
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...(kpi.bg ? kpi.color : COLOR_GRAY));
        if (kpi.lines) {
            pdf.setFontSize(4.4);
            pdf.text(kpi.lines[0], x + (boxWidth / 2) + 0.8, currentY + 14.3, { align: 'center' });
            pdf.text(kpi.lines[1], x + (boxWidth / 2) + 0.8, currentY + 17.5, { align: 'center' });
        } else {
            pdf.setFontSize(4.7);
            pdf.text(kpi.label, x + (boxWidth / 2) + 0.8, currentY + 16, { align: 'center' });
        }
    });

    currentY += 25.5;

    // Título de sección
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.text('|', marginX, currentY);
    pdf.setTextColor(31, 41, 55);
    pdf.text('Desglose por tipo de unidad', marginX + 3.5, currentY);

    currentY += 4.5;

    // Grid 2x2 para las 4 tecnologías
    const cardGapX = 6;
    const cardGapY = 4.5;
    const cardWidth = (totalW - cardGapX) / 2;
    const cardHeight = 57;

    modelData.forEach((m, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = marginX + (cardWidth + cardGapX) * col;
        const y = currentY + (cardHeight + cardGapY) * row;
        
        const mainColor = getModelColor(m.id);

        // Tarjeta
        pdf.setDrawColor(229, 231, 235);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

        // Borde superior de color
        pdf.setFillColor(...mainColor);
        pdf.roundedRect(x, y, cardWidth, 3.5, 3, 3, 'F');
        pdf.rect(x, y + 1.8, cardWidth, 1.7, 'F');

        // Imagen de la unidad
        const img = modelImages[m.id];
        if (img && (img.naturalWidth > 0 || img.width > 0)) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width  = img.naturalWidth  || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const maxW = 14;
                const maxH = 10;
                const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
                const drawW = canvas.width * ratio;
                const drawH = canvas.height * ratio;
                
                const imgX = x + 5 + (maxW - drawW) / 2;
                const imgY = y + 4 + (maxH - drawH) / 2;
                
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', imgX, imgY, drawW, drawH);
            } catch {}
        }

        // Título y Subtítulo
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(17, 24, 39);
        pdf.text(m.label, x + 23, y + 8);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...COLOR_GRAY);
        pdf.text(`${m.total ?? m.units?.length ?? m.programadas} unidades`, x + 23, y + 12.5);

        // Barra segmentada
        const barY = y + 15;
        const barX = x + 6;
        const barW = cardWidth - 12;
        const barH = 3.5;
        
        pdf.setFillColor(229, 231, 235);
        pdf.roundedRect(barX, barY, barW, barH, 1.7, 1.7, 'F');

        let currentBarX = barX;
        const activeSegments = [];
        if (m.operacion > 0) activeSegments.push({ val: m.operacion, color: COLOR_GREEN });
        if ((m.desincItinerario || 0) > 0) activeSegments.push({ val: m.desincItinerario, color: COLOR_AMBER });
        if (m.reserva > 0) activeSegments.push({ val: m.reserva, color: COLOR_GOLD });
        if (m.mantenimiento > 0) activeSegments.push({ val: m.mantenimiento, color: COLOR_RED });
        if ((m.percance || 0) > 0) activeSegments.push({ val: m.percance, color: COLOR_ROSE });

        const divisor = (m.total || m.programadas) > 0 ? (m.total || m.programadas) : (m.operacion + (m.desincItinerario || 0) + m.reserva + m.mantenimiento + (m.percance || 0));

        activeSegments.forEach((seg, i) => {
            const segW = divisor > 0 ? (seg.val / divisor) * barW : 0;
            if (segW > 0) {
                const isFirst = i === 0;
                const isLast = i === activeSegments.length - 1;
                pdf.setFillColor(...seg.color);
                pdf.roundedRect(currentBarX, barY, segW, barH, 1.7, 1.7, 'F');
                if (!isFirst) pdf.rect(currentBarX, barY, 1.5, barH, 'F');
                if (!isLast) pdf.rect(currentBarX + segW - 1.5, barY, 1.5, barH, 'F');
                currentBarX += segW;
            }
        });

        // Filas de desglose
        const pct = (val) => (m.total || m.programadas) > 0 ? Math.round((val / (m.total || m.programadas)) * 100) : 0;
        const eficiencia = (m.programadas || m.total || m.operacion) > 0 
            ? Math.min(100, Math.round((((m.circulando || 0) + (m.desincItinerario || 0) + (m.encerradasProgramadas || 0)) / (m.programadas || m.total || m.operacion)) * 100)) 
            : 0;

        const rows = [
            { label: 'Operación', val: m.operacion, p: pct(m.operacion), color: COLOR_GREEN, bg: [220, 252, 231] },
            { label: 'Desinc. Itinerario', val: m.desincItinerario || 0, p: pct(m.desincItinerario || 0), color: COLOR_AMBER, badgeColor: COLOR_GOLD, bg: [254, 243, 199] },
            { label: 'Reserva', val: m.reserva, p: pct(m.reserva), color: COLOR_GOLD, badgeColor: COLOR_GOLD, bg: [254, 243, 199] },
            { label: 'Mantenimiento', val: m.mantenimiento, p: pct(m.mantenimiento), color: COLOR_RED, badgeColor: COLOR_RED, bg: [254, 226, 226] },
            { label: 'Percance', val: m.percance || 0, p: pct(m.percance || 0), color: COLOR_ROSE, badgeColor: COLOR_ROSE, bg: [255, 228, 230] },
            { label: 'Eficiencia', val: null, p: eficiencia, color: COLOR_GOLD, badgeColor: COLOR_GOLD, bg: [254, 243, 199], isEficiencia: true }
        ];

        let rowY = y + 22.8;
        rows.forEach(r => {
            pdf.setDrawColor(243, 244, 246);
            pdf.line(x + 6, rowY - 2.5, x + cardWidth - 6, rowY - 2.5);

            // Viñeta punto
            pdf.setFillColor(...r.color);
            pdf.circle(x + 8, rowY - 0.7, 1.05, 'F');

            // Etiqueta
            pdf.setFont('helvetica', r.isEficiencia ? 'bold' : 'normal');
            pdf.setFontSize(6.5);
            pdf.setTextColor(...(r.isEficiencia ? r.color : COLOR_GRAY));
            pdf.text(r.label, x + 12, rowY);

            // Badge %
            const badgeW = 9;
            const badgeH = 3.5;
            pdf.setFillColor(...r.bg);
            pdf.roundedRect(x + cardWidth - 25, rowY - 2.6, badgeW, badgeH, 1.7, 1.7, 'F');
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(5.4);
            pdf.setTextColor(...(r.badgeColor || r.color));
            pdf.text(`${r.p}%`, x + cardWidth - 20.5, rowY - 0.3, { align: 'center' });

            // Valor numérico
            if (r.val !== null) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(7.3);
                pdf.setTextColor(17, 24, 39);
                pdf.text(String(r.val), x + cardWidth - 8, rowY, { align: 'right' });
            }

            rowY += 5.3;
        });
    });

    // ==========================================
    // PÁGINA 2: PERSONAS CONDUCTORAS
    // ==========================================
    pdf.addPage([254, 190.5], 'landscape');
    drawHeader(pdf, pw, fecha, bannerImg, stmImg, hgoImg, horaInicioDespacho, horaTerminoDespacho);
    drawFooter(pdf, pw, ph, 2, 3);

    // Tarjeta beige contenedora principal
    const p2CardX = 10;
    const p2CardY = 25.5;
    const p2CardW = pw - 20;
    const p2CardH = ph - 38;

    pdf.setFillColor(...COLOR_BEIGE_BG);
    pdf.setDrawColor(...COLOR_BEIGE_BORDER);
    pdf.roundedRect(p2CardX, p2CardY, p2CardW, p2CardH, 4, 4, 'FD');

    // Ilustración de conductores a la izquierda
    if (conductoresImg && (conductoresImg.naturalWidth > 0 || conductoresImg.width > 0)) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width  = conductoresImg.naturalWidth  || conductoresImg.width;
            canvas.height = conductoresImg.naturalHeight || conductoresImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(conductoresImg, 0, 0);
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 14, 28, 36, 28);
        } catch {}
    }

    // Tabla Resumen "Personas conductoras" (derecha de la ilustración)
    const pcTableX = 54;
    const pcTableW = p2CardW - 48;
    const pcTableY = 28;

    // Encabezado beige
    pdf.setFillColor(...COLOR_BEIGE_HEADER);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(pcTableX, pcTableY, pcTableW, 6.5, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Personas conductoras', pcTableX + pcTableW / 2, pcTableY + 4.5, { align: 'center' });

    // Filas Resumen
    const pcRows = [
        { label: 'Reservas programadas', val: conductoresEnReservaTotal.length },
        { label: 'Reservas por corridas faltantes', val: 0 },
        { label: 'Faltas de conductor', val: conductoresConFalta.length }
    ];

    const labelColW = pcTableW * 0.72;
    const valColW = pcTableW * 0.28;

    pcRows.forEach((r, idx) => {
        const rowY = pcTableY + 6.5 + (idx * 6.2);
        
        // Etiqueta guinda
        pdf.setFillColor(...COLOR_GUINDA);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(pcTableX, rowY, labelColW, 6.2, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...COLOR_WHITE);
        pdf.text(r.label, pcTableX + labelColW / 2, rowY + 4.2, { align: 'center' });

        // Valor gris claro
        pdf.setFillColor(...COLOR_LIGHT_CELL);
        pdf.rect(pcTableX + labelColW, rowY, valColW, 6.2, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text(String(r.val), pcTableX + labelColW + valColW / 2, rowY + 4.5, { align: 'center' });
    });

    // ── Tabla Conductores en reserva ──
    const resTblX = 14;
    const resTblW = p2CardW - 8;
    let tblCursorY = 54;

    pdf.setFillColor(...COLOR_BEIGE_HEADER);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(resTblX, tblCursorY, resTblW, 6, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Conductores en reserva', resTblX + resTblW / 2, tblCursorY + 4.2, { align: 'center' });
    tblCursorY += 6;

    // Encabezados de columnas
    const colW_Nombre = resTblW * 0.60;
    const colW_Folio  = resTblW * 0.22;
    const colW_Tipo   = resTblW * 0.18;

    pdf.setFillColor(...COLOR_GUINDA);
    pdf.rect(resTblX, tblCursorY, colW_Nombre, 5.5, 'FD');
    pdf.rect(resTblX + colW_Nombre, tblCursorY, colW_Folio, 5.5, 'FD');
    pdf.rect(resTblX + colW_Nombre + colW_Folio, tblCursorY, colW_Tipo, 5.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLOR_WHITE);
    pdf.text('Nombre', resTblX + colW_Nombre / 2, tblCursorY + 3.8, { align: 'center' });
    pdf.text('Folio', resTblX + colW_Nombre + colW_Folio / 2, tblCursorY + 3.8, { align: 'center' });
    pdf.text('Tipo', resTblX + colW_Nombre + colW_Folio + colW_Tipo / 2, tblCursorY + 3.8, { align: 'center' });
    tblCursorY += 5.5;

    // Filas de conductores en reserva
    const maxReservaRows = Math.max(Math.min(conductoresEnReserva.length, 6), 2);
    for (let i = 0; i < maxReservaRows; i++) {
        const c = conductoresEnReserva[i];
        pdf.setFillColor(...COLOR_WHITE);
        pdf.rect(resTblX, tblCursorY, colW_Nombre, 5.2, 'FD');
        pdf.rect(resTblX + colW_Nombre, tblCursorY, colW_Folio, 5.2, 'FD');
        pdf.rect(resTblX + colW_Nombre + colW_Folio, tblCursorY, colW_Tipo, 5.2, 'FD');

        if (c) {
            const nomCompleto = toTitleCase(c.nombre || c.nombre_completo || `${c.nombres || ''} ${c.apellidos || ''}`);
            const folio = formatFolio(c.tarjeton);
            const tipo = formatTipo(c);

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(0, 0, 0);
            pdf.text(nomCompleto, resTblX + colW_Nombre / 2, tblCursorY + 3.6, { align: 'center' });
            pdf.text(folio, resTblX + colW_Nombre + colW_Folio / 2, tblCursorY + 3.6, { align: 'center' });
            pdf.text(tipo, resTblX + colW_Nombre + colW_Folio + colW_Tipo / 2, tblCursorY + 3.6, { align: 'center' });
        }
        tblCursorY += 5.2;
    }

    // ── Tabla Conductores con falta ──
    tblCursorY += 2;
    pdf.setFillColor(...COLOR_BEIGE_HEADER);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(resTblX, tblCursorY, resTblW, 6, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Conductores con falta', resTblX + resTblW / 2, tblCursorY + 4.2, { align: 'center' });
    tblCursorY += 6;

    // Encabezados
    pdf.setFillColor(...COLOR_GUINDA);
    pdf.rect(resTblX, tblCursorY, colW_Nombre, 5.5, 'FD');
    pdf.rect(resTblX + colW_Nombre, tblCursorY, colW_Folio, 5.5, 'FD');
    pdf.rect(resTblX + colW_Nombre + colW_Folio, tblCursorY, colW_Tipo, 5.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLOR_WHITE);
    pdf.text('Nombre', resTblX + colW_Nombre / 2, tblCursorY + 3.8, { align: 'center' });
    pdf.text('Folio', resTblX + colW_Nombre + colW_Folio / 2, tblCursorY + 3.8, { align: 'center' });
    pdf.text('Tipo', resTblX + colW_Nombre + colW_Folio + colW_Tipo / 2, tblCursorY + 3.8, { align: 'center' });
    tblCursorY += 5.5;

    // Filas con datos y filas vacías hasta la base de la tarjeta
    const baseEndY = p2CardY + p2CardH - 4;
    let rowIndex = 0;
    while (tblCursorY + 5.2 <= baseEndY) {
        const c = conductoresConFalta[rowIndex];
        pdf.setFillColor(...COLOR_WHITE);
        pdf.rect(resTblX, tblCursorY, colW_Nombre, 5.2, 'FD');
        pdf.rect(resTblX + colW_Nombre, tblCursorY, colW_Folio, 5.2, 'FD');
        pdf.rect(resTblX + colW_Nombre + colW_Folio, tblCursorY, colW_Tipo, 5.2, 'FD');

        if (c) {
            const nomCompleto = toTitleCase(c.nombre || c.nombre_completo || `${c.nombres || ''} ${c.apellidos || ''}`);
            const folio = formatFolio(c.tarjeton);
            const tipo = formatTipo(c);

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(0, 0, 0);
            pdf.text(nomCompleto, resTblX + colW_Nombre / 2, tblCursorY + 3.6, { align: 'center' });
            pdf.text(folio, resTblX + colW_Nombre + colW_Folio / 2, tblCursorY + 3.6, { align: 'center' });
            pdf.text(tipo, resTblX + colW_Nombre + colW_Folio + colW_Tipo / 2, tblCursorY + 3.6, { align: 'center' });
        }
        tblCursorY += 5.2;
        rowIndex++;
    }

    // ==========================================
    // PÁGINA 3: CORRIDAS FALTANTES Y OBSERVACIONES
    // ==========================================
    pdf.addPage([254, 190.5], 'landscape');
    drawHeader(pdf, pw, fecha, bannerImg, stmImg, hgoImg, horaInicioDespacho, horaTerminoDespacho);
    drawFooter(pdf, pw, ph, 3, 3);

    const p3X = 10;
    const p3W = pw - 20;
    let p3CursorY = 25.5;

    // ── Tabla Corridas faltantes ──
    pdf.setFillColor(...COLOR_BEIGE_HEADER);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(p3X, p3CursorY, p3W, 6, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Corridas faltantes', p3X + p3W / 2, p3CursorY + 4.2, { align: 'center' });
    p3CursorY += 6;

    const cfCols = [
        { label: 'Servicio Alimentador', val: formatCiclo(faltantesAlimentador), wLabel: 52, wVal: 26 },
        { label: 'Servicio Troncal', val: formatCiclo(faltantesTroncal), wLabel: 52, wVal: 26 },
        { label: 'Total', val: formatCiclo(faltantesTotal), wLabel: 52, wVal: 26 }
    ];

    let cfX = p3X;
    cfCols.forEach(col => {
        // Label guinda
        pdf.setFillColor(...COLOR_GUINDA);
        pdf.rect(cfX, p3CursorY, col.wLabel, 6.5, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...COLOR_WHITE);
        pdf.text(col.label, cfX + col.wLabel / 2, p3CursorY + 4.3, { align: 'center' });
        cfX += col.wLabel;

        // Valor
        pdf.setFillColor(...(col.label === 'Total' ? COLOR_WHITE : COLOR_LIGHT_CELL));
        pdf.rect(cfX, p3CursorY, col.wVal, 6.5, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text(String(col.val), cfX + col.wVal / 2, p3CursorY + 4.5, { align: 'center' });
        cfX += col.wVal;
    });
    p3CursorY += 9;

    // ── Tabla Resumen de corridas y ciclos faltantes ──
    pdf.setFillColor(...COLOR_BEIGE_HEADER);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(p3X, p3CursorY, p3W, 6, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Resumen de corridas y ciclos faltantes', p3X + p3W / 2, p3CursorY + 4.2, { align: 'center' });
    p3CursorY += 6;

    const tablaFaltantesCols = [
        { label: 'No', w: 16 },
        { label: 'Eco', w: 22 },
        { label: 'Ruta', w: 38 },
        { label: 'Corrida', w: 34 },
        { label: 'Corrida', w: 34 },
        { label: 'Ciclo', w: 34 },
        { label: 'Motivo', w: 56 }
    ];

    let headerX = p3X;
    pdf.setFillColor(...COLOR_GUINDA);
    tablaFaltantesCols.forEach(c => {
        pdf.rect(headerX, p3CursorY, c.w, 6, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...COLOR_WHITE);
        pdf.text(c.label, headerX + c.w / 2, p3CursorY + 4.2, { align: 'center' });
        headerX += c.w;
    });
    p3CursorY += 6;

    const maxFilasFaltantes = Math.min(ciclosFaltantes.length, 6);
    const faltantesFilas = ciclosFaltantes.length > 0 ? ciclosFaltantes.slice(0, maxFilasFaltantes) : [null, null];
    faltantesFilas.forEach((item, idx) => {
        let colX = p3X;
        pdf.setFillColor(...(item ? COLOR_WHITE : COLOR_LIGHT_CELL));
        tablaFaltantesCols.forEach((c, cIdx) => {
            pdf.rect(colX, p3CursorY, c.w, 5.5, 'FD');
            if (item) {
                let cellText = '';
                if (cIdx === 0) cellText = String(idx + 1);
                else if (cIdx === 1) cellText = item.ECONOMICO ? String(item.ECONOMICO).padStart(3, '0') : '';
                else if (cIdx === 2) cellText = String(item.RUTA || item.ruta || '');
                else if (cIdx === 3) cellText = String(item.CORRIDAS ?? item.CORRIDA ?? item.corrida ?? '');
                else if (cIdx === 4) cellText = String(item.HORA_SALIDA || item.ACOPLE || '');
                else if (cIdx === 5) cellText = formatCiclo(parseCiclo(item.CICLO || item.ciclo)) || String(item.CICLO || item.ciclo || '');
                else if (cIdx === 6) cellText = String(item.MOTIVO || item.motivo || item.MOTIVO_ESTATUS || '');

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(7.5);
                pdf.setTextColor(0, 0, 0);
                pdf.text(cellText, colX + c.w / 2, p3CursorY + 3.8, { align: 'center' });
            }
            colX += c.w;
        });
        p3CursorY += 5.5;
    });
    p3CursorY += 5;

    // ── Franja Gris: OBSERVACIONES DEL DESPACHO ──
    pdf.setFillColor(...COLOR_GRAY_BANNER);
    pdf.setDrawColor(156, 163, 175);
    pdf.rect(p3X, p3CursorY, p3W, 7.5, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...COLOR_WHITE);
    pdf.text('OBSERVACIONES DEL DESPACHO', p3X + p3W / 2, p3CursorY + 5.2, { align: 'center' });
    p3CursorY += 7.5;

    // Tarjeta blanca para observaciones
    const obsHeight = ph - p3CursorY - 14;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(209, 213, 219);
    pdf.rect(p3X, p3CursorY, p3W, obsHeight, 'FD');

    // Valor de ciclos programados (dinámico desde módulo de programación y logística)
    const ciclosFinal = (ciclosRegistrados !== null && !Number.isNaN(ciclosRegistrados)) 
        ? ciclosRegistrados 
        : 2371.5;
    
    const ciclosTexto = Number.isInteger(ciclosFinal)
        ? ciclosFinal.toLocaleString('es-MX')
        : formatCiclo(ciclosFinal);

    const totalPendientes = corridasPendientes.length;
    const isCompactObs = totalPendientes > 5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(isCompactObs ? 16 : 18);
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.text(`${ciclosTexto} ciclos programados`, p3X + p3W / 2, p3CursorY + (isCompactObs ? 11.5 : 22), { align: 'center' });

    // Corridas pendientes por programación
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(isCompactObs ? 10 : 10.5);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Corridas pendientes por programación:', p3X + p3W / 2, p3CursorY + (isCompactObs ? 19.5 : 38), { align: 'center' });

    let pendY = p3CursorY + (isCompactObs ? 26 : 46);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(31, 41, 55);

    if (totalPendientes > 0) {
        if (totalPendientes <= 5) {
            corridasPendientes.forEach(cp => {
                const linea = `${cp.etiqueta} acopla: ${cp.acople}`;
                pdf.text(linea, p3X + p3W / 2, pendY, { align: 'center' });
                pendY += 5.5;
            });
        } else {
            const availH = Math.max(20, (p3CursorY + obsHeight - 3.5) - pendY);
            let numCols = 2;
            if (totalPendientes > 48) numCols = 5;
            else if (totalPendientes > 27) numCols = 4;
            else if (totalPendientes > 12) numCols = 3;

            const rowsPerCol = Math.ceil(totalPendientes / numCols);
            const defaultRowH = numCols === 2 ? 5.0 : (numCols === 3 ? 4.5 : (numCols === 4 ? 3.8 : 3.4));
            const rowH = Math.min(defaultRowH, availH / rowsPerCol);
            const defaultFont = numCols === 2 ? 9.0 : (numCols === 3 ? 8.3 : (numCols === 4 ? 7.4 : 6.6));
            const fontSize = Math.max(5.8, Math.min(defaultFont, rowH * 1.85));

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(fontSize);
            pdf.setTextColor(31, 41, 55);

            const colW = p3W / numCols;
            corridasPendientes.forEach((cp, idx) => {
                const colIdx = Math.floor(idx / rowsPerCol);
                const rowIdx = idx % rowsPerCol;
                const xCenter = p3X + colIdx * colW + colW / 2;
                const yPos = pendY + rowIdx * rowH;
                const linea = `${cp.etiqueta} acopla: ${cp.acople}`;
                pdf.text(linea, xCenter, yPos, { align: 'center' });
            });
        }
    } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text('Sin corridas pendientes por programación a la hora del reporte', p3X + p3W / 2, pendY, { align: 'center' });
    }

    pdf.save(`Reporte_Estadisticas_Centro_${new Date().toISOString().slice(0,10)}.pdf`);
};
