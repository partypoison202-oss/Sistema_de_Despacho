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

  // Cargar logo oficial respetando colores originales y transparencia
  const logoDataUrl = await cargarLogoOficial('/images/sistema_de_tm.webp');

  // Fecha / hora
  const now = new Date();
  const fechaStr = now
    .toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    .toUpperCase();
  const horaStr =
    now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' HORAS';

  const calcularDias = (fecha) => {
    if (!fecha) return '—';
    const startDate = new Date(fecha);
    const endDate = new Date(now);

    const diff = endDate - startDate;
    if (diff < 0) return '0';
    
    return Math.floor(diff / (1000 * 60 * 60 * 24)).toString();
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
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
    const f = (tipo === 'en-mantenimiento' ? u.fecha_folio_mantenimiento : null) || u.fecha_registro || u.fecha_folio_mantenimiento;
    if (!f) return -Infinity;
    const t = new Date(f).getTime();
    return isNaN(t) ? -Infinity : t;
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
