import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import stmLogo from '../assets/logo-stm.webp';

/**
 * Carga una imagen y elimina el fondo blanco usando canvas,
 * devolviendo un dataURL PNG con transparencia.
 */
const cargarLogoTransparente = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      // Quitar píxeles casi-blancos (umbral 230)
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
          data[i + 3] = 0; // alpha = transparente
        }
      }
      ctx.putImageData(imageData, 0, 0);
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

  // Logo en la esquina superior izquierda
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

export const generarPDFItinerario = async (data, desde, hasta) => {
  // Use landscape orientation for the itinerary matrix
  const pdf = new jsPDF('l', 'mm', 'letter');
  
  const logoDataUrl = await cargarLogoTransparente(stmLogo);
  
  // Format dates for subtitle
  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };
  
  agregarEncabezado(
    pdf, 
    logoDataUrl, 
    'REPORTE DE ITINERARIO DE ASISTENCIAS', 
    `PERIODO: ${formatDate(desde)} AL ${formatDate(hasta)}`
  );

  if (!data || !data.fechas || data.fechas.length === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.text('No hay datos en el rango seleccionado.', 14, 45);
    window.open(pdf.output('bloburl'), '_blank');
    return;
  }

  // Build the table headers
  const headDays = data.fechas.map(f => {
    const dateObj = new Date(f + 'T00:00:00');
    return dateObj.getDate().toString().padStart(2, '0');
  });

  const headers = [
    ['TARJETÓN', 'OPERADOR', 'A', 'F', 'D', 'V', 'I', ...headDays]
  ];

  // Build the table body
  const body = data.matriz.map(row => {
    const asistenciasObj = row.dias || {};
    const rowDays = data.fechas.map(f => asistenciasObj[f] || 'A'); // Default A
    
    return [
      row.tarjeton,
      row.nombre,
      row.totales.A.toString(),
      row.totales.F.toString(),
      row.totales.D.toString(),
      row.totales.V.toString(),
      row.totales.I.toString(),
      ...rowDays
    ];
  });

  autoTable(pdf, {
    startY: 35,
    head: headers,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1,
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [96, 26, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold' }, // Tarjetón
      1: { halign: 'left', minCellWidth: 30 },    // Operador
    },
    didParseCell: (data) => {
      // Color code the matrix cells based on A, F, D, V, I
      if (data.section === 'body' && data.column.index >= 2) {
        const val = data.cell.raw;
        
        // Sums columns
        if (data.column.index === 2) { data.cell.styles.textColor = [22, 101, 52]; data.cell.styles.fontStyle = 'bold'; } // A
        if (data.column.index === 3) { data.cell.styles.textColor = [153, 27, 27]; data.cell.styles.fontStyle = 'bold'; } // F
        if (data.column.index === 4) { data.cell.styles.textColor = [154, 52, 18]; data.cell.styles.fontStyle = 'bold'; } // D
        if (data.column.index === 5) { data.cell.styles.textColor = [133, 77, 14]; data.cell.styles.fontStyle = 'bold'; } // V
        if (data.column.index === 6) { data.cell.styles.textColor = [30, 64, 175]; data.cell.styles.fontStyle = 'bold'; } // I

        // Day columns
        if (data.column.index > 6) {
          data.cell.styles.fontStyle = 'bold';
          if (val === 'A') { data.cell.styles.fillColor = [220, 252, 231]; data.cell.styles.textColor = [22, 101, 52]; }
          if (val === 'F') { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [153, 27, 27]; }
          if (val === 'D') { data.cell.styles.fillColor = [255, 237, 213]; data.cell.styles.textColor = [154, 52, 18]; }
          if (val === 'V') { data.cell.styles.fillColor = [254, 240, 138]; data.cell.styles.textColor = [133, 77, 14]; }
          if (val === 'I') { data.cell.styles.fillColor = [219, 234, 254]; data.cell.styles.textColor = [30, 64, 175]; }
        }
      }
    }
  });

  // Footer: Página X de Y
  const pageCount = pdf.internal.getNumberOfPages();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.text(`Página ${i} de ${pageCount}`, w / 2, h - 8, { align: 'center' });
  }

  // Open PDF in a new tab to visualize it (user request)
  window.open(pdf.output('bloburl'), '_blank');
};
