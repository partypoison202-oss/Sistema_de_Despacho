import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Carga el logo institucional oficial en su formato original
 * respetando sus colores (dorado y blanco) y transparencia natural para jsPDF.
 */
const cargarLogoOficial = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

/**
 * Genera el encabezado común (franja vino + logo + título) en el PDF.
 */
const agregarEncabezado = (pdf, logoDataUrl, titulo, subtitulo) => {
  const pageW = pdf.internal.pageSize.getWidth();
  const HEADER_H = 30;

  // Fondo guinda
  pdf.setFillColor(96, 26, 42);
  pdf.rect(0, 0, pageW, HEADER_H, 'F');

  // Franja decorativa inferior (más oscura)
  pdf.setFillColor(70, 15, 30);
  pdf.rect(0, HEADER_H - 1.5, pageW, 1.5, 'F');

  // Logo en la esquina superior izquierda con proporciones correctas
  if (logoDataUrl) {
    const logoH = 22;
    const props = pdf.getImageProperties(logoDataUrl);
    const logoW = logoH * (props.width / props.height);
    pdf.addImage(logoDataUrl, 'PNG', 7, (HEADER_H - logoH) / 2, logoW, logoH);
  }

  // Institución (Subtítulo dorado arriba)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(197, 160, 89);
  pdf.text('SISTEMA DE TRANSPORTE METROPOLITANO DE HIDALGO', pageW / 2, 11, { align: 'center' });

  // Título principal
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text(titulo, pageW / 2, 18, { align: 'center' });

  if (subtitulo) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitulo, pageW / 2, 24, { align: 'center' });
  }

  // Resetear color
  pdf.setTextColor(0, 0, 0);
};

/**
 * generarPDFPendientesMantenimiento
 * @param {Array} unidades - Todas las unidades con estatus='mantenimiento'
 * @param {string} tipo    - 'pendientes' | 'en-mantenimiento'
 */
export const generarPDFPendientesMantenimiento = async (unidades, tipo) => {
  const pdf = new jsPDF('l', 'mm', 'letter');
  const pageW = pdf.internal.pageSize.getWidth();

  // Cargar logo institucional oficial
  const logoDataUrl = (await cargarLogoOficial('/images/acotma_logo_connombre_contorno_v2.png')) || (await cargarLogoOficial('/images/sistema_de_tm.webp'));

  // Fecha / hora
  const now = new Date();
  const fechaStr = now
    .toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    .toUpperCase();
  const horaStr =
    now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' HORAS';

  // Función auxiliar para parsear fechas locales sin sesgo de hora o zona horaria
  const parsearFechaLocal = (fechaInput) => {
    if (!fechaInput) return null;
    if (fechaInput instanceof Date) {
      return new Date(fechaInput.getFullYear(), fechaInput.getMonth(), fechaInput.getDate());
    }
    const str = String(fechaInput).trim();
    // Manejar formato YYYY-MM-DD o YYYY-MM-DD HH:mm:ss o ISO
    const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
    // Manejar formato DD/MM/YYYY
    const matchSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchSlash) {
      const day = parseInt(matchSlash[1], 10);
      const month = parseInt(matchSlash[2], 10) - 1;
      const year = parseInt(matchSlash[3], 10);
      return new Date(year, month, day);
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const calcularDias = (fecha) => {
    if (!fecha) return '—';
    const startDate = parsearFechaLocal(fecha);
    if (!startDate) return '—';

    // Normalizar la fecha actual a medianoche (00:00:00) para calcular días calendario exactos
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = today.getTime() - startDate.getTime();
    if (diffTime < 0) return '0';
    
    // Diferencia en días calendario exactos (redondeo para tolerar cambios de horario)
    const dias = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return dias.toString();
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    const d = parsearFechaLocal(isoStr);
    if (!d) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  let unidadesFiltradas;
  let titulo;
  let subtitulo;
  let filename;

  if (tipo === 'pendientes') {
    // Tienen número de incidencia registrada pero NO tienen folio generado aún
    unidadesFiltradas = unidades.filter(
      (u) => !u.folio_mantenimiento || String(u.folio_mantenimiento).trim() === ''
    );
    titulo = 'ECONÓMICOS EN MANTENIMIENTO';
    subtitulo = 'Económicos con incidencia asignada';
    filename = `Reporte_Economicos_Mantenimiento_${fechaStr.replace(/ /g, '_')}.pdf`;
  } else {
    // Ya tienen folio completo generado (en mantenimiento activo)
    unidadesFiltradas = unidades.filter(
      (u) => u.folio_mantenimiento && String(u.folio_mantenimiento).trim() !== ''
    );
    titulo = 'ECONÓMICOS CON FOLIO';
    subtitulo = 'Unidades con reporte de falla activo';
    filename = `Reporte_Economicos_Folio_${fechaStr.replace(/ /g, '_')}.pdf`;
  }

  // Ordenar: el más nuevo arriba, el más viejo abajo (descendente)
  // 1. Por fecha de ingreso / folio (fecha más reciente primero)
  // 2. Si las fechas son iguales, por número de folio / incidencia (mayor número = más nuevo arriba)
  // 3. Fallback por ID de registro (id_incidencia mayor = creado recientemente arriba)
  const obtenerTimestamp = (u) => {
    const f = u.fecha_folio_mantenimiento || u.fecha_registro;
    if (!f) return -Infinity;
    if (f instanceof Date) return f.getTime();
    const str = String(f).trim().replace(' ', 'T');
    const t = new Date(str).getTime();
    if (!isNaN(t)) return t;
    const d = parsearFechaLocal(f);
    return d ? d.getTime() : -Infinity;
  };

  const extraerNumero = (val) => {
    if (!val) return 0;
    const digits = String(val).replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  unidadesFiltradas.sort((a, b) => {
    const timeA = obtenerTimestamp(a);
    const timeB = obtenerTimestamp(b);
    if (timeA !== timeB) {
      return timeB - timeA; // Más nuevo (mayor timestamp) arriba, más viejo abajo
    }

    const folioA = tipo === 'pendientes' ? a.numero_incidencia : (a.folio_mantenimiento || a.numero_incidencia);
    const folioB = tipo === 'pendientes' ? b.numero_incidencia : (b.folio_mantenimiento || b.numero_incidencia);
    const numA = extraerNumero(folioA);
    const numB = extraerNumero(folioB);
    if (numA !== numB && numA > 0 && numB > 0) {
      return numB - numA; // Más nuevo (mayor número) arriba, más viejo abajo
    }

    const idA = Number(a.id_incidencia) || 0;
    const idB = Number(b.id_incidencia) || 0;
    if (idA !== idB && idA > 0 && idB > 0) {
      return idB - idA; // Mayor ID arriba, menor ID abajo
    }

    return String(b.numero_eco || '').localeCompare(String(a.numero_eco || ''));
  });

  // Encabezado
  agregarEncabezado(pdf, logoDataUrl, titulo, subtitulo);

  // Fecha y hora — esquina superior derecha
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(fechaStr, pageW - 10, 38, { align: 'right' });
  pdf.text(horaStr, pageW - 10, 44, { align: 'right' });

  let tableHeaders;
  let tableBody;
  let colStyles;

  if (tipo === 'pendientes') {
    tableHeaders = [
      ['NO', 'N° INCIDENCIA', 'ECO', 'TIPO', 'FALLA REPORTADA', 'FECHA INGRESO', 'DÍAS FUERA'],
    ];
    tableBody = unidadesFiltradas.map((u, idx) => [
      (idx + 1).toString(),
      u.numero_incidencia || '—',
      u.numero_eco,
      String(u.tipo || '').toUpperCase(),
      String(u.falla_reportada || u.motivo_estatus || '—').toUpperCase(),
      formatDate(u.fecha_folio_mantenimiento || u.fecha_registro),
      calcularDias(u.fecha_folio_mantenimiento || u.fecha_registro),
    ]);
    colStyles = {
      4: { halign: 'left', cellWidth: 50 },
      5: { halign: 'left', cellWidth: 35 },
    };
  } else {
    tableHeaders = [
      ['NO', 'N° INCIDENCIA', 'N° FOLIO', 'ECO', 'TIPO', 'FALLA REPORTADA', 'FECHA INGRESO', 'DÍAS FUERA'],
    ];
    tableBody = unidadesFiltradas.map((u, idx) => [
      (idx + 1).toString(),
      u.numero_incidencia || '—',
      u.folio_mantenimiento || '—',
      u.numero_eco,
      String(u.tipo || '').toUpperCase(),
      String(u.falla_reportada || u.motivo_estatus || '—').toUpperCase(),
      formatDate(u.fecha_folio_mantenimiento || u.fecha_registro),
      calcularDias(u.fecha_folio_mantenimiento || u.fecha_registro),
    ]);
    colStyles = {
      5: { halign: 'left', cellWidth: 50 },
      6: { halign: 'left', cellWidth: 35 },
    };
  }

  autoTable(pdf, {
    startY: 50,
    margin: { top: 40 },
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [107, 29, 51],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 9,
    },
    bodyStyles: {
      halign: 'center',
      valign: 'middle',
      fontSize: 8,
    },
    styles: {
      cellPadding: 3,
    },
    columnStyles: colStyles,
    // Repetir encabezado en cada página
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) {
        agregarEncabezado(pdf, logoDataUrl, titulo, subtitulo);
      }
    },
  });

  const blob = pdf.output('blob');
  return { blob, filename };
};
