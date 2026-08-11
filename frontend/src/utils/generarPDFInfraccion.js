import jsPDF from 'jspdf';

/**
 * Carga una imagen de forma asíncrona
 */
const loadImage = (src) => {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

/**
 * Obtiene la data URL optimizada y el aspect ratio (ancho/alto) de una imagen
 */
const getOptimizedImage = (imgEl, maxW = 350) => {
  if (!imgEl) return null;
  try {
    const canvas = document.createElement('canvas');
    let width = imgEl.naturalWidth || imgEl.width || 200;
    let height = imgEl.naturalHeight || imgEl.height || 100;
    const aspect = width / height;

    if (width > maxW) {
      width = maxW;
      height = Math.round(width / aspect);
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, width, height);
    return {
      dataUrl: canvas.toDataURL('image/png'),
      aspect
    };
  } catch (err) {
    console.error('Error optimizando imagen:', err);
    return null;
  }
};

/**
 * Recolorea el logo de SITMAH a un tono naranja vibrante (#e04f00) respetando transparencia
 */
const getOrangeSitmahLogo = (imgEl, maxW = 350) => {
  if (!imgEl) return null;
  try {
    const canvas = document.createElement('canvas');
    let width = imgEl.naturalWidth || imgEl.width || 200;
    let height = imgEl.naturalHeight || imgEl.height || 100;
    const aspect = width / height;

    if (width > maxW) {
      width = maxW;
      height = Math.round(width / aspect);
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, width, height);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#e04f00'; // Naranja oficial SITMAH
    ctx.fillRect(0, 0, width, height);

    return {
      dataUrl: canvas.toDataURL('image/png'),
      aspect
    };
  } catch (err) {
    console.error('Error tiñendo logo SITMAH:', err);
    return getOptimizedImage(imgEl, maxW);
  }
};

/**
 * Recolorea el logo de Oficialía Mayor de blanco a guinda (#691d33) respetando la transparencia
 */
const getGuindaOficialiaLogo = (imgEl, maxW = 400) => {
  if (!imgEl) return null;
  try {
    const canvas = document.createElement('canvas');
    let width = imgEl.naturalWidth || imgEl.width || 300;
    let height = imgEl.naturalHeight || imgEl.height || 100;
    const aspect = width / height;

    if (width > maxW) {
      width = maxW;
      height = Math.round(width / aspect);
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, width, height);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#691d33';
    ctx.fillRect(0, 0, width, height);

    return {
      dataUrl: canvas.toDataURL('image/png'),
      aspect
    };
  } catch (err) {
    console.error('Error tiñendo logo de Oficialía:', err);
    return getOptimizedImage(imgEl, maxW);
  }
};

/**
 * Comprime una imagen Base64 (ej. firmas canvas) a baja resolución para aligerar el PDF
 */
const compressSignature = (base64Str, maxW = 300) => {
  return new Promise((resolve) => {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:')) {
      return resolve(null);
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width || 300;
        let height = img.naturalHeight || img.height || 120;
        const aspect = width / height;

        if (width > maxW) {
          width = maxW;
          height = Math.round(width / aspect);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

/**
 * Formatea texto a Mayúsculas (para Placas e Identificaciones)
 */
const toUpper = (str) => {
  if (!str || str === '—') return '—';
  return String(str).trim().toUpperCase();
};

/**
 * Formatea texto a Tipo Oración / Título
 */
const toTitleCase = (str) => {
  if (!str || str === '—') return '—';
  const clean = String(str).trim();
  if (!clean) return '—';
  return clean
    .toLowerCase()
    .split(' ')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
};

const UMA_VALOR_2026 = 108.57;

/**
 * Genera el documento PDF idéntico al formato oficial "BOLETA DE INFRACCIÓN"
 * 
 * @param {Object} datos Datos de la infracción registrados
 * @param {string} accion 'download' | 'open' | 'print'
 */
export const generarPDFInfraccion = async (datos = {}, accion = 'download') => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageW = 210;
    const margin = 8;
    const contentW = pageW - margin * 2; // 194mm

    // Cargar logotipos (SITMAH en naranja y Oficialía en guinda)
    const logoSitmahRaw = await loadImage('/images/sitmah_logo.webp');
    const logoOficialiaRaw = await loadImage('/images/oficialia.webp');

    const logoSitmah = getOrangeSitmahLogo(logoSitmahRaw, 350);
    const logoOficialia = getGuindaOficialiaLogo(logoOficialiaRaw, 500);

    // Optimizar firmas
    const firmaInspectorOptimized = await compressSignature(datos.firma_inspector);
    const firmaConductorOptimized = await compressSignature(datos.firma_conductor);

    let y = 6;

    // ── LOGOS SUPERIORES ──────────────────────────────────────────────
    if (logoSitmah) {
      const h1 = 13;
      const w1 = h1 * logoSitmah.aspect;
      doc.addImage(logoSitmah.dataUrl, 'PNG', margin, y, w1, h1);
    }
    if (logoOficialia) {
      const h2 = 16.5;
      const w2 = h2 * logoOficialia.aspect;
      doc.addImage(logoOficialia.dataUrl, 'PNG', pageW - margin - w2, y - 0.5, w2, h2);
    }

    y += 19;

    // ── BANNER PRINCIPAL DE TÍTULO ───────────────────────────────────
    doc.setFillColor(96, 26, 42); // Maroon #601a2a
    doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('BOLETA DE INFRACCIÓN', pageW / 2, y + 4.5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('INFRACCIÓN POR INVASIÓN AL CARRIL CONFINADO DEL SITMAH', pageW / 2, y + 8.2, { align: 'center' });

    y += 12;

    // ── FOLIO NÚMERO ─────────────────────────────────────────────────
    doc.setTextColor(96, 26, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    
    const rawFolio = datos.folio || 'BI-2026-0001';
    const cleanNum = rawFolio.split('-').pop() || '0001';
    const formattedFolio = String(cleanNum).padStart(4, '0');
    doc.text(`FOLIO: SITMAH/BI/${formattedFolio}/2026`, pageW - margin, y + 2, { align: 'right' });

    y += 4;

    // Helper para pintar barra de título de sección
    const drawSectionHeader = (posY, title) => {
      doc.setFillColor(96, 26, 42);
      doc.roundedRect(margin, posY, contentW, 4.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(title, margin + 3, posY + 3.2);
    };

    // ── I. LUGAR, FECHA Y HORA DE EMISIÓN ─────────────────────────────
    drawSectionHeader(y, 'I. LUGAR, FECHA Y HORA DE EMISIÓN');
    y += 4.5;

    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentW, 16, 'S');

    // Parsear fecha y hora
    const fechaObj = datos.fecha ? new Date(datos.fecha) : new Date();
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const mesNombre = meses[fechaObj.getMonth()] || 'julio';
    const anio = fechaObj.getFullYear() || 2026;
    const fechaTexto = `${dia} de ${mesNombre} de ${anio}`;
    const horaTexto = datos.hora || '12:00';

    const municipioClean = toTitleCase(
      (datos.municipio || datos.lugar || 'Pachuca de Soto')
        .replace(/,\s*Estado de Hidalgo/gi, '')
        .replace(/Estado de Hidalgo/gi, '')
        .trim()
    );

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');

    doc.text('Fecha de expedición:', margin + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(fechaTexto, margin + 31, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Hora de intervención:', margin + 110, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${horaTexto} hrs.`, margin + 140, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Municipio:', margin + 3, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${municipioClean}, Hidalgo.`, margin + 18, y + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Ubicación exacta:', margin + 3, y + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(datos.ubicacion_exacta || datos.lugar || 'Carril Confinado Troncal (URBANUSS)'), margin + 26, y + 14.5);

    y += 18;

    // ── II. DATOS DEL VEHÍCULO INFRACTOR ──────────────────────────────
    drawSectionHeader(y, 'II. DATOS DEL VEHÍCULO INFRACTOR');
    y += 4.5;

    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentW, 20, 'S');

    const colW = contentW / 5;
    for (let i = 1; i < 5; i++) {
      doc.line(margin + colW * i, y, margin + colW * i, y + 10);
    }
    doc.line(margin, y + 10, margin + contentW, y + 10);

    // Fila 1 Encabezados
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Placa de Circulación', margin + 2, y + 3.5);
    doc.text('Entidad Federativa', margin + colW + 2, y + 3.5);
    doc.text('Marca', margin + colW * 2 + 2, y + 3.5);
    doc.text('Submarca / Línea', margin + colW * 3 + 2, y + 3.5);
    doc.text('Modelo (Año)', margin + colW * 4 + 2, y + 3.5);

    // Fila 1 Valores
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(toUpper(datos.placas), margin + 2, y + 7.5);
    doc.text(toTitleCase(datos.entidad_federativa || 'Hidalgo'), margin + colW + 2, y + 7.5);
    doc.text(toTitleCase(datos.marca), margin + colW * 2 + 2, y + 7.5);
    doc.text(toTitleCase(datos.submarca || '—'), margin + colW * 3 + 2, y + 7.5);
    doc.text(toTitleCase(datos.modelo), margin + colW * 4 + 2, y + 7.5);

    // Fila 2
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Color:', margin + 2, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(datos.color), margin + 12, y + 15);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('NIV / VIN:', margin + 45, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toUpper(datos.niv_vin), margin + 60, y + 15);

    // Tipo de vehículo
    const tipoV = (datos.tipo_vehiculo || 'Particular').toLowerCase();
    const isParticular = tipoV.includes('particular');
    const isServicio = tipoV.includes('servicio') || tipoV.includes('público');
    const isCarga = tipoV.includes('carga');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Tipo de Vehículo:', margin + 105, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${isParticular ? 'X' : '  '} ) Particular     ( ${isServicio ? 'X' : '  '} ) Servicio Público     ( ${isCarga ? 'X' : '  '} ) Carga`, margin + 128, y + 15);

    y += 22;

    // ── III. DATOS DE LA PERSONA CONDUCTORA Y/O PROPIETARIA ────────────
    drawSectionHeader(y, 'III. DATOS DE LA PERSONA CONDUCTORA Y/O PROPIETARIA');
    y += 4.5;

    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentW, 20, 'S');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Nombre de la persona conductora:', margin + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(datos.conductor_nombre), margin + 45, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Domicilio:', margin + 3, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(datos.conductor_domicilio), margin + 17, y + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('No. Licencia:', margin + 3, y + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toUpper(datos.licencia_numero), margin + 20, y + 14.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Tipo:', margin + 65, y + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toUpper(datos.licencia_tipo), margin + 73, y + 14.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Estado:', margin + 95, y + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(datos.licencia_estado || 'Hidalgo'), margin + 106, y + 14.5);

    const calidad = (datos.calidad_conductor || 'Conductora').toLowerCase();
    const isConductora = calidad.includes('conductor');
    const isPropietaria = calidad.includes('propietari');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Calidad:', margin + 135, y + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${isConductora ? 'X' : '  '} ) Conductora   ( ${isPropietaria ? 'X' : '  '} ) Propietaria`, margin + 147, y + 14.5);

    y += 22;

    // ── IV. FUNDAMENTACIÓN LEGAL DE LA COMPETENCIA Y FACULTAD DE SANCIONAR ──
    drawSectionHeader(y, 'IV. FUNDAMENTACIÓN LEGAL DE LA COMPETENCIA Y FACULTAD DE SANCIONAR');
    y += 4.5;

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    const legalPara = 'La presente boleta de infracción es emitida por la persona inspectora de transporte adscrita a la Dirección Jurídica del Sistema Integrado de Transporte Masivo de Hidalgo (SITMAH), en ejercicio de sus facultades legales y administrativas, con fundamento en el artículo 4 párrafo 21 de la Constitución Política de los Estados Unidos Mexicanos; en los artículos 2 fracción I, 3 fracción I inciso d), fracciones XIII y XIX, 14 fracción I y XXXVI, 258, 269, 272 fracciones I, II y III, 276, 297 y 307 de la Ley de Movilidad y Transporte para el Estado de Hidalgo; y 47 fracción VI, 48, 49, 248, 287, 402 y 403 fracción IV del Reglamento de Movilidad, por transitar o invadir indebidamente el carril confinado del Sistema Integrado de Transporte Masivo de Hidalgo (SITMAH), constituyendo una infracción a la normativa aplicable, por lo que se procede a imponer la sanción correspondiente.';

    const splitLegal = doc.splitTextToSize(legalPara, contentW);
    doc.text(splitLegal, margin, y + 3);

    y += splitLegal.length * 2.8 + 4;

    // ── V. MOTIVACIÓN / DESCRIPCIÓN CIRCUNSTANCIADA DE LOS HECHOS ──────
    drawSectionHeader(y, 'V. MOTIVACIÓN / DESCRIPCIÓN CIRCUNSTANCIADA DE LOS HECHOS');
    y += 4.5;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    doc.text('(Circunstancias de tiempo, modo y lugar constitutivas de la infracción)', margin + 3, y + 2.5);

    y += 3.5;

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const motText1 = 'En la fecha, hora y ubicación precisa indicadas en el Apartado I de esta boleta, la persona inspectora de transporte adscrita a la Dirección Jurídica observó y constató en flagrancia que el vehículo descrito en el Apartado II:';
    doc.text(motText1, margin, y + 2);

    y += 4.5;

    const motHecho = (datos.motivacion_hecho || 'transitaba').toLowerCase();
    const isTransitaba = motHecho.includes('transitaba');
    const isIngreso = motHecho.includes('ingres');
    const isManiobro = motHecho.includes('maniobr');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(96, 26, 42);
    doc.text(`( ${isTransitaba ? 'X' : '  '} ) transitaba                 ( ${isIngreso ? 'X' : '  '} ) ingresó                 ( ${isManiobro ? 'X' : '  '} ) maniobró`, margin + 30, y + 2);

    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    const motText2 = 'en el carril confinado y exclusivo destinado para la circulación operacional de las unidades del Sistema Integrado de Transporte Masivo de Hidalgo (SITMAH), contraviniendo la prohibición expresa establecida en la normatividad aplicable y poniendo en riesgo la fluidez y seguridad de las personas usuarias del sistema.';
    const splitMot2 = doc.splitTextToSize(motText2, contentW);
    doc.text(splitMot2, margin, y + 2);

    y += splitMot2.length * 2.8 + 2;

    if (datos.descripcion_hechos) {
      doc.setFont('helvetica', 'bold');
      doc.text('Detalles adicionales de la intervención: ', margin, y + 2);
      doc.setFont('helvetica', 'normal');
      const addDesc = doc.splitTextToSize(String(datos.descripcion_hechos), contentW - 45);
      doc.text(addDesc, margin + 42, y + 2);
      y += addDesc.length * 2.8 + 2;
    }

    y += 2;

    // ── VI & VII. SANCIÓN IMPUESTA / GARANTÍA Y FIRMA INSPECTOR ───────
    const colBoxW = (contentW - 3) / 2; // ~95.5mm cada columna

    // Columna Izquierda: VI. SANCIÓN IMPUESTA Y GARANTÍA RETENIDA
    doc.setFillColor(96, 26, 42);
    doc.roundedRect(margin, y, colBoxW, 4.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('VI. SANCIÓN IMPUESTA Y GARANTÍA RETENIDA', margin + 2, y + 3.2);

    // Columna Derecha: VII. IDENTIFICACIÓN Y FIRMA DEL INSPECTOR
    const rightColX = margin + colBoxW + 3;
    doc.setFillColor(96, 26, 42);
    doc.roundedRect(rightColX, y, colBoxW, 4.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('VII. INSPECTORA DE TRANSPORTE AUTORIZADA', rightColX + 2, y + 3.2);

    y += 4.5;

    // Recuadros de las 2 columnas
    const boxHeight = 36;
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, colBoxW, boxHeight, 'S');
    doc.rect(rightColX, y, colBoxW, boxHeight, 'S');

    // --- Contenido Columna VI (Sanción y Garantía) ---
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Sanción impuesta:', margin + 2, y + 4);

    const umaCant = parseFloat(datos.sancion_uma) || 0;
    const pesosEquiv = (umaCant * UMA_VALOR_2026).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`Multa equivalente a  ${umaCant || '____'}  Unidades de Medida (UMA)`, margin + 2, y + 8);
    doc.text(`(Equivalente a: $${pesosEquiv} MXN)`, margin + 2, y + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Garantía retenida (en su caso):', margin + 2, y + 16.5);

    const isDetencion = Boolean(datos.garantia_tipo?.includes('Detención') || datos.garantia_retenida);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${isDetencion ? 'X' : '  '} ) Detención del Vehículo`, margin + 2, y + 20.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Otro / Observaciones:', margin + 2, y + 25.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const obsText = datos.garantia_observaciones || '—';
    const splitObs = doc.splitTextToSize(obsText, colBoxW - 4);
    doc.text(splitObs, margin + 2, y + 29.5);

    // --- Contenido Columna VII (Inspector) ---
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Nombre:', rightColX + 2, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(datos.inspector_nombre || 'INSPECTOR EN SESIÓN'), rightColX + 15, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Gafete:', rightColX + 2, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toUpper(datos.inspector_gafete || '001'), rightColX + 14, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Adscripción: Dirección Jurídica del SITMAH', rightColX + 2, y + 12);

    if (firmaInspectorOptimized) {
      try {
        doc.addImage(firmaInspectorOptimized, 'PNG', rightColX + colBoxW / 2 - 18, y + 14, 36, 12);
      } catch (e) {
        console.warn('Error firma inspector:', e);
      }
    }
    doc.line(rightColX + 10, y + 29, rightColX + colBoxW - 10, y + 29);
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Nombre y Firma Autógrafa', rightColX + colBoxW / 2, y + 32.5, { align: 'center' });

    y += boxHeight + 4;

    // ── VIII. OBSERVACIONES Y FIRMA DE LA PERSONA INFRACTORA ──────────
    drawSectionHeader(y, 'VIII. OBSERVACIONES Y FIRMA DE LA PERSONA INFRACTORA');
    y += 4.5;

    const blockVIIIHeight = 32;
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentW, blockVIIIHeight, 'S');

    const negoRaw = datos.conductor_nego_firmar;
    const conductorNego = (negoRaw === true || negoRaw === 1 || negoRaw === '1' || negoRaw === 'true');

    // Aceptación Notificación
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Aceptación de la Notificación:', margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`( ${conductorNego ? 'X' : '  '} ) La persona conductora se negó a recibir o firmar la boleta de infracción`, margin + 3, y + 9);
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('(Artículos 258 y 260 Ley de Movilidad / Art. 49 Reglamento)', margin + 7, y + 12.5);

    // Firma Conductor (Lado derecho del recuadro)
    const rightVIIIX = margin + contentW / 2 + 10;
    if (conductorNego) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(8);
      doc.text('SE NEGÓ A RECIBIR / FIRMAR', rightVIIIX + 15, y + 16);
    } else {
      if (firmaConductorOptimized) {
        try {
          doc.addImage(firmaConductorOptimized, 'PNG', rightVIIIX + 10, y + 4, 38, 14);
        } catch (e) {
          console.warn('Error firma conductor:', e);
        }
      }
      doc.line(rightVIIIX, y + 21, rightVIIIX + 60, y + 21);
      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Firma de la persona conductora o infractora', rightVIIIX + 30, y + 24.5, { align: 'center' });
    }

    // Nota al pie del recuadro
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    const legalFooterVIII = 'La persona a quien le sea emitida la presente boleta podrá apegarse a lo establecido en los artículos 79, 81 y 83 de la Ley Estatal del Procedimiento Administrativo para el Estado de Hidalgo, de conformidad con lo que dispone el artículo 17 de la Constitución Política de los Estados Unidos Mexicanos.';
    doc.text(legalFooterVIII, pageW / 2, y + 29.5, { align: 'center', maxWidth: contentW - 6 });

    // Acciones de salida
    const cleanFolio = (datos.folio || 'BI-2026-0001').replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${cleanFolio}.pdf`;

    // ── ANEXO FOTOGRÁFICO ──────────────────────────────────────────
    if (datos.imagenes && datos.imagenes.length > 0) {
      let currentIdxOnPage = 0;
      for (let i = 0; i < datos.imagenes.length; i++) {
        if (i >= 5) break; // max 5
        const imgFile = datos.imagenes[i];
        if (!imgFile) continue;

        try {
          // Convert file to base64 if it's a File object (which it is from the form)
          const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(imgFile);
          });
          
          if (base64Data) {
            const imgObj = await loadImage(base64Data);
            if (imgObj) {
              const opt = getOptimizedImage(imgObj, 600); // 600 max w for crispness
              if (opt) {
                // Si es la primera imagen en una página, añadimos página e imprimimos header
                if (currentIdxOnPage % 4 === 0) {
                  doc.addPage();
                  // Dibujar encabezado
                  doc.setFillColor(96, 26, 42);
                  doc.roundedRect(margin, margin, contentW, 10, 1.5, 1.5, 'F');
                  doc.setTextColor(255, 255, 255);
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(11);
                  doc.text('ANEXO FOTOGRÁFICO DE EVIDENCIA', pageW / 2, margin + 6.5, { align: 'center' });
                }

                // Cálculo de posiciones en la cuadrícula de 2x2
                const col = currentIdxOnPage % 2;
                const row = Math.floor((currentIdxOnPage % 4) / 2);
                
                const cellW = 90;
                const cellH = 65;
                const gapX = 8;
                const gapY = 8;
                const startY = margin + 10 + 10; // Espacio debajo del encabezado

                // Ajuste proporcional de la imagen dentro de la celda de 90x65
                let targetW = cellW;
                let targetH = targetW / opt.aspect;
                if (targetH > cellH) {
                  targetH = cellH;
                  targetW = targetH * opt.aspect;
                }

                const cellX = margin + col * (cellW + gapX);
                const cellY = startY + row * (cellH + gapY);
                const imgX = cellX + (cellW - targetW) / 2;
                const imgY = cellY + (cellH - targetH) / 2;

                doc.addImage(opt.dataUrl, 'PNG', imgX, imgY, targetW, targetH);
                currentIdxOnPage++;
              }
            }
          }
        } catch(e) {
            console.error("Error drawing image to pdf:", e);
        }
      }
    }

    if (accion === 'open' || accion === 'print') {
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
    } else {
      doc.save(filename);
    }

    return true;
  } catch (error) {
    console.error('Error al generar el PDF de la Infracción:', error);
    throw error;
  }
};
