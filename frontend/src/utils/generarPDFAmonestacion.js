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
    
    // Dibujar imagen original
    ctx.drawImage(imgEl, 0, 0, width, height);

    // Aplicar tinte naranja sobre los píxeles opacos
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
    
    // Dibujar la imagen blanca original
    ctx.drawImage(imgEl, 0, 0, width, height);

    // Reemplazar color blanco por guinda #691d33 sobre la máscara transparente
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
 * Formatea texto a Tipo Oración / Título (Primera letra de cada palabra en Mayúscula)
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

/**
 * Genera el documento PDF idéntico al formato oficial "ACTA DE AMONESTACIÓN Y CULTURA VIAL"
 * 
 * @param {Object} datos Datos de la amonestación registrados
 * @param {string} accion 'download' | 'open' | 'print'
 */
export const generarPDFAmonestacion = async (datos = {}, accion = 'download') => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageW = 210;
    const margin = 10;
    const contentW = pageW - margin * 2; // 190mm

    // Cargar logotipos (SITMAH en naranja y Oficialía en guinda) y el URBANUSS
    const logoSitmahRaw = await loadImage('/images/sitmah_logo.webp');
    const logoOficialiaRaw = await loadImage('/images/oficialia.webp');
    const busFrontRaw = await loadImage('/images/urbanu-frente.webp');

    const logoSitmah = getOrangeSitmahLogo(logoSitmahRaw, 350);
    const logoOficialia = getGuindaOficialiaLogo(logoOficialiaRaw, 500);
    const busFront = getOptimizedImage(busFrontRaw, 200);

    // Optimizar firmas para reducir el peso del PDF
    const firmaInspectorOptimized = await compressSignature(datos.firma_inspector);
    const firmaConductorOptimized = await compressSignature(datos.firma_conductor);

    let y = 6;

    // ── LOGOS SUPERIORES (RESPETANDO ASPECT RATIO PROPORCIONAL) ─────────
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
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ACTA DE AMONESTACIÓN Y CULTURA VIAL', pageW / 2, y + 5.5, { align: 'center' });

    y += 10;

    // ── FOLIO NÚMERO ─────────────────────────────────────────────────
    doc.setTextColor(96, 26, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    const rawFolio = datos.folio || 'AM-2026-0001';
    const cleanNum = rawFolio.split('-').pop() || '0001';
    const formattedFolio = String(cleanNum).padStart(4, '0');
    doc.text(`FOLIO NÚMERO: SITMAH/CULTURA-VIAL/${formattedFolio}/2026`, pageW - margin, y + 3, { align: 'right' });

    y += 6;

    // ── SECCIÓN DE INTRODUCCIÓN ──────────────────────────────────────
    doc.setDrawColor(203, 213, 225); // #cbd5e1
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, 23, 2, 2, 'S');

    // Parsear fecha y hora
    const fechaObj = datos.fecha ? new Date(datos.fecha) : new Date();
    const dia = String(fechaObj.getDate() || 28).padStart(2, '0');
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const mesNombre = meses[fechaObj.getMonth()] || 'julio';
    const anio = fechaObj.getFullYear() || 2026;
    
    const horaTexto = datos.hora || '12:00';

    // Limpiar municipio duplicado y formatear
    const municipioClean = toTitleCase(
      (datos.lugar || 'Pachuca de Soto')
        .replace(/,\s*Estado de Hidalgo/gi, '')
        .replace(/Estado de Hidalgo/gi, '')
        .trim()
    );

    doc.setTextColor(30, 41, 59); // #1e293b
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const introLine1 = `En la ciudad de ${municipioClean}, Estado de Hidalgo, siendo las ${horaTexto} horas del día ${dia} del mes de ${mesNombre} del año ${anio}.`;
    doc.text(introLine1, margin + 4, y + 5);

    const introText2 = `El Sistema Integrado de Transporte Masivo de Hidalgo (SITMAH), en su esfuerzo por promover una cultura de movilidad responsable y salvaguardar la integridad de las personas usuarias del sistema, emite la presente ACTA DE AMONESTACIÓN Y CULTURA VIAL a través de la persona inspectora de transporte adscrita a la Dirección Jurídica.`;
    
    const splitIntro2 = doc.splitTextToSize(introText2, contentW - 8);
    doc.text(splitIntro2, margin + 4, y + 10);

    y += 26;

    // ── 1. DATOS DEL VEHÍCULO INFRACTOR ──────────────────────────────
    doc.setFillColor(96, 26, 42);
    doc.roundedRect(margin, y, contentW, 5.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1. DATOS DEL VEHÍCULO INFRACTOR', margin + 3, y + 4);

    y += 5.5;

    // Tabla de datos del vehículo (Height: 25mm)
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentW, 25, 'S');

    // Columnas
    const colW = contentW / 5; // 38mm cada una
    for (let i = 1; i < 5; i++) {
      doc.line(margin + colW * i, y, margin + colW * i, y + 12);
    }
    doc.line(margin, y + 12, margin + contentW, y + 12);
    doc.line(margin, y + 18.5, margin + contentW, y + 18.5);

    // Encabezados fila 1
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    doc.text('Placas de Circulación:', margin + 2, y + 4);
    doc.text('Entidad Federativa:', margin + colW + 2, y + 4);
    doc.text('Marca:', margin + colW * 2 + 2, y + 4);
    doc.text('Modelo:', margin + colW * 3 + 2, y + 4);
    doc.text('Color:', margin + colW * 4 + 2, y + 4);

    // Valores fila 1 (Placas EN MAYÚSCULAS; Marca, Modelo, Color en Tipo Oración)
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);

    doc.text(toUpper(datos.placas), margin + 2, y + 9.5);
    doc.text(toTitleCase(datos.entidad_federativa || 'Hidalgo'), margin + colW + 2, y + 9.5);
    doc.text(toTitleCase(datos.marca), margin + colW * 2 + 2, y + 9.5);
    doc.text(toTitleCase(datos.modelo), margin + colW * 3 + 2, y + 9.5);
    doc.text(toTitleCase(datos.color), margin + colW * 4 + 2, y + 9.5);

    // Fila 2: Conductor (Tipo Oración)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Nombre de la persona conductora (Opcional):', margin + 2, y + 15.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text(toTitleCase(datos.conductor_nombre), margin + 68, y + 15.5);

    // Fila 3: Identificación (EN MAYÚSCULAS)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Identificación:', margin + 2, y + 22.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text(toUpper(datos.conductor_identificacion), margin + 25, y + 22.5);

    y += 28;

    // ── 2. DESCRIPCIÓN DE LOS HECHOS ──────────────────────────────────
    doc.setFillColor(96, 26, 42);
    doc.roundedRect(margin, y, contentW, 5.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('2. DESCRIPCIÓN DE LOS HECHOS', margin + 3, y + 4);

    y += 5.5;

    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentW, 23, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const descText = 'Se hace constar que el vehículo con las características arriba descritas fue detectado transitando sobre el carril exclusivo, confinado o preferencial del Servicio Público de Transporte Masivo de Pasajeros, a la altura de:';
    
    const splitDesc = doc.splitTextToSize(descText, contentW - 6);
    doc.text(splitDesc, margin + 3, y + 4.5);

    doc.line(margin, y + 9.5, margin + contentW, y + 9.5);
    doc.line(margin + contentW / 2, y + 9.5, margin + contentW / 2, y + 23);

    // Columna 1: Corredor Troncal / Vialidad
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Corredor Troncal / Vialidad:', margin + 3, y + 13.5);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text('Corredor 1 Troncal (URBANUSS)', margin + 3, y + 18.5);

    // Columna 2: Estación / Referencia
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Estación / Referencia:', margin + contentW / 2 + 3, y + 13.5);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(datos.lugar || 'Pachuca de Soto, Estado de Hidalgo'), margin + contentW / 2 + 3, y + 18.5);

    y += 26;

    // ── 3. FUNDAMENTACIÓN LEGAL Y AMONESTACIÓN ────────────────────────
    doc.setFillColor(96, 26, 42);
    doc.roundedRect(margin, y, contentW, 5.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3. FUNDAMENTACIÓN LEGAL Y AMONESTACIÓN', margin + 3, y + 4);

    y += 10.5;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    const legText1 = `Con fundamento en los artículos 2, fracción I; 4; 5; 13, fracción VI; 14, fracción XXIII, 258 y 272 de la Ley de Movilidad y Transporte para el Estado de Hidalgo, respecto al servicio público de transporte masivo en cuanto al uso adecuado de la infraestructura destinada a su operación; a las facultades de inspección, vigilancia y verificación del cumplimiento de la Ley precitada; así como a las sanciones procedentes por invadir o transitar indebidamente en los carriles exclusivos o confinados del servicio de transporte masivo; y toda vez que el vehículo descrito fue detectado invadiendo la vía exclusiva, se emite la presente AMONESTACIÓN.`;
    const splitLeg1 = doc.splitTextToSize(legText1, contentW);
    doc.text(splitLeg1, margin, y);

    y += splitLeg1.length * 3.4 + 3.5;

    const legText2 = `Esta primera falta queda registrada en el padrón de monitoreo interno del SITMAH como una medida de carácter educativo y preventivo, con el fin de fomentar la convivencia armónica y el respeto al transporte masivo.`;
    doc.setFont('helvetica', 'bold');
    const splitLeg2 = doc.splitTextToSize(legText2, contentW);
    doc.text(splitLeg2, margin, y);

    y += splitLeg2.length * 3.4 + 4.5;

    // Callout Box: IMPORTANCIA DEL CARRIL EXCLUSIVO
    doc.setFillColor(254, 252, 232); // Light amber #fefce8
    doc.setDrawColor(217, 119, 6);  // Amber border #d97706
    doc.roundedRect(margin, y, contentW, 21, 2, 2, 'FD');

    // Icono Bus / Imagen frontal del URBANUSS
    if (busFront) {
      const bh = 14;
      const bw = bh * busFront.aspect;
      doc.addImage(busFront.dataUrl, 'PNG', margin + 3, y + 3.5, bw, bh);
    } else {
      doc.setFillColor(96, 26, 42);
      doc.circle(margin + 12, y + 10.5, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('BUS', margin + 12, y + 11.5, { align: 'center' });
    }

    // Texto explicativo
    doc.setTextColor(146, 64, 14); // #92400e
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('IMPORTANCIA DEL CARRIL EXCLUSIVO', margin + 22, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    const busImportance = 'El carril exclusivo del transporte masivo está destinado únicamente a la operación de las unidades del sistema, lo que permite brindar un servicio eficiente, seguro y puntual a miles de personas usuarias. Invadirlo genera demoras, afecta la frecuencia del servicio, incrementa el riesgo de accidentes y vulnera el derecho a la movilidad. Respetarlo es respetar a todas y todos.';
    const splitBusImp = doc.splitTextToSize(busImportance, contentW - 25);
    doc.text(splitBusImp, margin + 22, y + 9.5);

    y += 26;

    // ── 4. APERCIBIMIENTO LEGAL PARA REINCIDENTES ─────────────────────
    doc.setFillColor(161, 98, 7); // Color bronce/marrón #a16207
    doc.roundedRect(margin, y, contentW, 5.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('4. APERCIBIMIENTO LEGAL PARA REINCIDENTES', margin + 3, y + 4);

    y += 10.5;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    const apercibimiento1 = 'Se le notifica formalmente que, de registrarse una SEGUNDA INCIDENCIA circulando por la infraestructura reservada, el beneficio de esta amonestación quedará anulado.';
    doc.setFont('helvetica', 'bold');
    const splitAper1 = doc.splitTextToSize(apercibimiento1, contentW);
    doc.text(splitAper1, margin, y);

    y += splitAper1.length * 3.4 + 3.5;

    doc.setFont('helvetica', 'normal');
    const apercibimiento2 = 'Se procederá de manera inmediata a la elaboración de la boleta de infracción formal, ejecutando la detención y aseguramiento de la unidad con auxilio de la fuerza pública para su remisión al depósito vehicular, cuando resulte procedente conforme a la normatividad aplicable, dando estricto cumplimiento a lo mandatado en el Artículo 272, fracción I de la Ley de Movilidad y Transporte para el Estado de Hidalgo.';
    const splitAper2 = doc.splitTextToSize(apercibimiento2, contentW);
    doc.text(splitAper2, margin, y);

    y += splitAper2.length * 3.4 + 6;

    // ── SECCIÓN DE FIRMAS ─────────────────────────────────────────────
    const blockW = (contentW - 4) / 2; // 93mm cada bloque

    // Bloque Izquierdo: Inspector
    doc.setFillColor(96, 26, 42);
    doc.rect(margin, y, blockW, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.text('DATOS DE LA PERSONA INSPECTORA DE TRANSPORTE QUE EMITE LA PRESENTE', margin + blockW / 2, y + 3.5, { align: 'center' });

    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y + 5, blockW, 36, 'S');

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Nombre de la persona inspectora de transporte:', margin + 2, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(datos.inspector_nombre || 'Administrador'), margin + 2, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('No. de Gafete / Credencial:', margin + 2, y + 17);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(datos.inspector_gafete || '001'), margin + 37, y + 17);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Adscripción: Dirección Jurídica del SITMAH', margin + 2, y + 21);

    // Firma Inspector
    if (firmaInspectorOptimized) {
      try {
        doc.addImage(firmaInspectorOptimized, 'PNG', margin + blockW / 2 - 20, y + 22, 40, 12);
      } catch (e) {
        console.warn('Error adjuntando firma inspector al PDF:', e);
      }
    }
    doc.line(margin + 10, y + 35, margin + blockW - 10, y + 35);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('FIRMA DE LA PERSONA INSPECTORA DE TRANSPORTE', margin + blockW / 2, y + 38.5, { align: 'center' });

    // Bloque Derecho: Conductor
    const rightMargin = margin + blockW + 4;
    doc.setFillColor(96, 26, 42);
    doc.rect(rightMargin, y, blockW, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('RECIBÍ NOTIFICACIÓN DE LA PRESENTE ACTA', rightMargin + blockW / 2, y + 3.5, { align: 'center' });

    doc.setDrawColor(203, 213, 225);
    doc.rect(rightMargin, y + 5, blockW, 36, 'S');

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Nombre de la persona conductora (Opcional):', rightMargin + 2, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    const conductorNombreMostrar = toTitleCase(datos.recibio_nombre || datos.conductor_nombre || '—');
    doc.text(conductorNombreMostrar, rightMargin + 2, y + 13);

    // Detección estricta de negativa de firma
    const negoRaw = datos.conductor_nego_firmar;
    const conductorNego = (negoRaw === true || negoRaw === 1 || negoRaw === '1' || negoRaw === 'true');

    if (conductorNego) {
      doc.setDrawColor(96, 26, 42);
      doc.rect(rightMargin + 4, y + 26, 4, 4, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(96, 26, 42);
      doc.setFontSize(8);
      doc.text('X', rightMargin + 4.8, y + 29.2);

      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      const negoText = 'La persona conductora se negó a firmar o a recibir copia de la presente acta.\n(Artículos 258 y 260 de la Ley de Movilidad y Transporte para el Estado de Hidalgo)';
      const splitNego = doc.splitTextToSize(negoText, blockW - 12);
      doc.text(splitNego, rightMargin + 10, y + 27.5);
    } else {
      if (firmaConductorOptimized) {
        try {
          doc.addImage(firmaConductorOptimized, 'PNG', rightMargin + blockW / 2 - 20, y + 18, 40, 15);
        } catch (e) {
          console.warn('Error adjuntando firma conductor al PDF:', e);
        }
      }
      doc.line(rightMargin + 10, y + 35, rightMargin + blockW - 10, y + 35);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Firma de la persona conductora', rightMargin + blockW / 2, y + 38.5, { align: 'center' });
    }

    y += 44;

    // ── PIE DE PÁGINA FINAL ───────────────────────────────────────────
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);

    const footerLegal = 'La presente acta tiene carácter educativo y preventivo. El registro de esta amonestación no implica por sí misma la imposición de sanción económica. Sin embargo, en caso de reincidencia, se aplicarán las sanciones correspondientes conforme a la Ley de Movilidad y Transporte.';
    doc.text(footerLegal, pageW / 2, y, { align: 'center', maxWidth: contentW });

    // Ejecutar acción solicitada
    const cleanFolio = (datos.folio || 'AM-2026-0001').replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${cleanFolio}.pdf`;

    if (accion === 'open' || accion === 'print') {
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
    } else {
      doc.save(filename);
    }

    return true;
  } catch (error) {
    console.error('Error al generar el PDF de la Amonestación:', error);
    throw error;
  }
};
