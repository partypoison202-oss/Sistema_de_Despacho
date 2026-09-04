import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper: Carga una imagen y retorna promesa con objeto { base64, width, height }
const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve({
        base64: canvas.toDataURL('image/png'),
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const generarPDFProgramacionOperativa = async (previewData, action = 'base64') => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const horaGeneracion = new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit'
  });

  // ── Colores corporativos ──
  const vino = [107, 29, 51];
  const vinoOscuro = [74, 16, 32];
  const dorado = [197, 160, 89];
  const grisTexto = [75, 85, 99];

  // ── ENCABEZADO ──
  const headerAlto = 26;
  doc.setFillColor(...vino);
  doc.rect(0, 0, pageWidth, headerAlto, 'F');
  // Franja dorada inferior del header
  doc.setFillColor(...dorado);
  doc.rect(0, headerAlto, pageWidth, 1.2, 'F');

  const logoAltoMM = 15;
  const logoY = (headerAlto - logoAltoMM) / 2;

  let textoX = 14;
  let textoRightLimit = pageWidth - 14;

  // ── LOGO IZQUIERDO: sistema_de_tm ──
  try {
    const { base64, width, height } = await loadImageAsBase64('/images/sistema_de_tm.webp');
    const anchoMM = (width / height) * logoAltoMM;
    doc.addImage(base64, 'PNG', 14, logoY, anchoMM, logoAltoMM, undefined, 'FAST');
    textoX = 14 + anchoMM + 6;
  } catch (e) {
    console.warn('No se pudo cargar el logo sistema_de_tm.webp para el PDF:', e);
  }

  // ── LOGO DERECHO: sitmah_logo ──
  try {
    const { base64, width, height } = await loadImageAsBase64('/images/sitmah_logo.png');
    const anchoMM = (width / height) * logoAltoMM;
    const logoXDerecho = pageWidth - 14 - anchoMM;
    doc.addImage(base64, 'PNG', logoXDerecho, logoY, anchoMM, logoAltoMM, undefined, 'FAST');
    textoRightLimit = logoXDerecho - 6;
  } catch (e) {
    console.warn('No se pudo cargar el logo sitmah_logo para el PDF:', e);
  }

  // ── TÍTULO (centrado entre ambos logos) ──
  const tituloAncho = textoRightLimit - textoX;
  const tituloCentro = textoX + tituloAncho / 2;

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Programación Operativa Diaria', tituloCentro, 11, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Reporte de unidades, conductores y rutas', tituloCentro, 17, { align: 'center' });

  const fechaCapitalizada = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  doc.setFontSize(7.5);
  doc.text(`${fechaCapitalizada} · Generado a las ${horaGeneracion} hrs`, tituloCentro, 22.5, { align: 'center' });

  // ── RESUMEN POR ESTATUS ──
  const conteo = previewData.reduce((acc, fila) => {
    const est = String(fila.ESTATUS || 'sin_estatus').toLowerCase();
    acc[est] = (acc[est] || 0) + 1;
    return acc;
  }, {});

  const resumenItems = [
    { label: 'Total unidades', valor: previewData.length, color: vinoOscuro },
    { label: 'En operación', valor: conteo.operacion || 0, color: [46, 125, 50] },
    { label: 'En reserva', valor: conteo.reserva || 0, color: [30, 90, 168] },
    { label: 'Mantenimiento', valor: conteo.mantenimiento || 0, color: [184, 134, 11] },
  ];

  const resumenY = 34;
  const boxWidth = (pageWidth - 28 - 3 * 4) / 4;
  resumenItems.forEach((item, i) => {
    const x = 14 + i * (boxWidth + 4);
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, resumenY, boxWidth, 14, 1.5, 1.5, 'FD');
    doc.setFillColor(...item.color);
    doc.roundedRect(x, resumenY, 2, 14, 1, 1, 'F');

    doc.setTextColor(...item.color);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.valor), x + 6, resumenY + 7);

    doc.setTextColor(...grisTexto);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x + 6, resumenY + 11.5);
  });

  // ── TABLA ──
  const columnas = ['Económico', 'Tipo', 'Estatus', 'Ruta', 'Tarjetón', 'Conductor', 'Hora Acople', 'Hora Salida', 'Patio Norte', 'Acople', 'Corrida'];
  const filas = previewData.map(fila => {
    const isPatioNorte = fila.PATIO_NORTE === true || fila.PATIO_NORTE === 1 || fila.PATIO_NORTE === '1' || String(fila.PATIO_NORTE).toLowerCase() === 'true' || String(fila.PATIO_NORTE).toUpperCase() === 'SÍ' || String(fila.PATIO_NORTE).toUpperCase() === 'SI' || fila.TRANSPORTE_PATIO_NORTE === true || fila.TRANSPORTE_PATIO_NORTE === 1 || fila.TRANSPORTE_PATIO_NORTE === '1' || String(fila.TRANSPORTE_PATIO_NORTE).toLowerCase() === 'true' || String(fila.TRANSPORTE_PATIO_NORTE).toUpperCase() === 'SÍ' || String(fila.TRANSPORTE_PATIO_NORTE).toUpperCase() === 'SI' || fila['PATIO NORTE'] || fila['Patio Norte'];
    return [
      fila.ECONOMICO ?? '',
      fila.TIPO_DE_UNIDAD ?? '',
      (fila.ESTATUS ?? '').toUpperCase(),
      fila.RUTA ?? '',
      fila.TARJETON ?? '',
      fila.NOMBRE_CONDUCTOR ?? '',
      fila.HORA_DE_ACOPLE ?? '',
      fila.HORA_SALIDA ?? '',
      isPatioNorte ? 'SÍ' : '',
      fila.ACOPLE ?? '',
      fila.CORRIDAS ?? '',
    ];
  });

  const leyenda = [
    { color: [198, 239, 206], label: 'Operación' },
    { color: [221, 235, 247], label: 'Reserva' },
    { color: [255, 242, 204], label: 'Mantenimiento' },
    { color: [252, 228, 228], label: 'Percance' },
  ];
  let legendX = 14;
  doc.setFontSize(7.5);
  leyenda.forEach(item => {
    doc.setFillColor(...item.color);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(legendX, resumenY + 18, 4, 4, 0.5, 0.5, 'FD');
    doc.setTextColor(...grisTexto);
    doc.text(item.label, legendX + 6, resumenY + 21.2);
    legendX += doc.getTextWidth(item.label) + 16;
  });

  autoTable(doc, {
    head: [columnas],
    body: filas,
    startY: resumenY + 28,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: 'middle',
      lineColor: [225, 225, 225],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: vino,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
    },
    bodyStyles: { halign: 'center', textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [250, 248, 245] },
    columnStyles: {
      5: { halign: 'left' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const estatus = String(filas[data.row.index]?.[2] ?? '').toLowerCase();
        if (estatus === 'operacion') {
          data.cell.styles.fillColor = [198, 239, 206];
          data.cell.styles.textColor = [30, 90, 30];
          data.cell.styles.fontStyle = 'bold';
        }
        if (estatus === 'reserva') {
          data.cell.styles.fillColor = [221, 235, 247];
          data.cell.styles.textColor = [20, 60, 110];
          data.cell.styles.fontStyle = 'bold';
        }
        if (estatus === 'mantenimiento') {
          data.cell.styles.fillColor = [255, 242, 204];
          data.cell.styles.textColor = [130, 95, 10];
          data.cell.styles.fontStyle = 'bold';
        }
        if (estatus === 'percance') {
          data.cell.styles.fillColor = [252, 228, 228];
          data.cell.styles.textColor = [150, 40, 40];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

      doc.setDrawColor(...dorado);
      doc.setLineWidth(0.4);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

      doc.setFontSize(7.5);
      doc.setTextColor(...grisTexto);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistema de Despacho — Documento generado automáticamente', 14, pageHeight - 7);
      doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
    },
  });

  if (action === 'download') {
    doc.save('Programacion_Operativa.pdf');
    return null;
  }
  return doc.output('datauristring').split(',')[1];
};
