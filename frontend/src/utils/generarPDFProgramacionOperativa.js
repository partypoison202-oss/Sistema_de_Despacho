import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper: Caché en memoria para evitar recargas y conversiones de canvas repetidas
const logoCache = new Map();

const getLogoData = (url) => {
  if (logoCache.has(url)) {
    return logoCache.get(url);
  }
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
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
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  logoCache.set(url, promise);
  return promise;
};

// Precarga inmediata de logos en segundo plano
if (typeof window !== 'undefined') {
  getLogoData('/images/sistema_de_tm.webp').catch(() => {});
  getLogoData('/images/sitmah_logo.webp').catch(() => {});
}

export const generarPDFProgramacionOperativa = async (previewData, action = 'base64', totales = null, options = {}) => {
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

  // ── LOGOS (Carga paralela y ultra-rápida en memoria) ──
  try {
    const [logoLeft, logoRight] = await Promise.all([
      getLogoData('/images/sistema_de_tm.webp'),
      getLogoData('/images/sitmah_logo.webp'),
    ]);

    if (logoLeft?.base64 && logoLeft.height > 0) {
      const anchoMM = (logoLeft.width / logoLeft.height) * logoAltoMM;
      doc.addImage(logoLeft.base64, 'PNG', 14, logoY, anchoMM, logoAltoMM, undefined, 'FAST');
      textoX = 14 + anchoMM + 6;
    }

    if (logoRight?.base64 && logoRight.height > 0) {
      const anchoMM = (logoRight.width / logoRight.height) * logoAltoMM;
      const logoXDerecho = pageWidth - 14 - anchoMM;
      doc.addImage(logoRight.base64, 'PNG', logoXDerecho, logoY, anchoMM, logoAltoMM, undefined, 'FAST');
      textoRightLimit = logoXDerecho - 6;
    }
  } catch (e) {
    console.warn('Advertencia al cargar logos para el PDF:', e);
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
  const conteo = (Array.isArray(previewData) ? previewData : []).reduce((acc, fila) => {
    const est = String(fila.ESTATUS || 'sin_estatus').toLowerCase().trim();
    if (est.includes('operaci')) acc.operacion = (acc.operacion || 0) + 1;
    else if (est.includes('reserva')) acc.reserva = (acc.reserva || 0) + 1;
    else if (est.includes('mantenimiento')) acc.mantenimiento = (acc.mantenimiento || 0) + 1;
    else if (est.includes('percance')) acc.percance = (acc.percance || 0) + 1;
    return acc;
  }, { operacion: 0, reserva: 0, mantenimiento: 0, percance: 0 });

  const totalProgramadas = totales?.programadas ?? conteo.operacion;
  const enOperacion = totales?.operacion ?? conteo.operacion;
  const enReserva = totales?.reserva ?? conteo.reserva;
  const enMantenimiento = totales?.mantenimiento ?? conteo.mantenimiento;

  const resumenItems = [
    { label: 'Total programadas', valor: totalProgramadas, color: vinoOscuro },
    { label: 'En operación', valor: enOperacion, color: [46, 125, 50] },
    { label: 'En reserva', valor: enReserva, color: [30, 90, 168] },
    { label: 'Mantenimiento', valor: enMantenimiento, color: [184, 134, 11] },
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
  const omitirRelevosYPatioNorte = Boolean(options?.omitirRelevosYPatioNorte || options?.esDespacho);

  const columnas = omitirRelevosYPatioNorte
    ? ['Económico', 'Tipo', 'Estatus', 'Ruta', 'Tarjetón', 'Conductor', 'Hora Acople', 'Hora Salida', 'Acople', 'Corrida']
    : ['Económico', 'Tipo', 'Estatus', 'Ruta', 'Tarjetón', 'Conductor', 'Rel. Tarjetón', 'Rel. Conductor', 'Rel. Hora', 'Hora Acople', 'Hora Salida', 'Patio Norte', 'Acople', 'Corrida'];

  const filas = (Array.isArray(previewData) ? previewData : []).map(fila => {
    const isPatioNorte = fila.PATIO_NORTE === true || fila.PATIO_NORTE === 1 || fila.PATIO_NORTE === '1' || String(fila.PATIO_NORTE).toLowerCase() === 'true' || String(fila.PATIO_NORTE).toUpperCase() === 'SÍ' || String(fila.PATIO_NORTE).toUpperCase() === 'SI' || fila.TRANSPORTE_PATIO_NORTE === true || fila.TRANSPORTE_PATIO_NORTE === 1 || fila.TRANSPORTE_PATIO_NORTE === '1' || String(fila.TRANSPORTE_PATIO_NORTE).toLowerCase() === 'true' || String(fila.TRANSPORTE_PATIO_NORTE).toUpperCase() === 'SÍ' || String(fila.TRANSPORTE_PATIO_NORTE).toUpperCase() === 'SI' || fila['PATIO NORTE'] || fila['Patio Norte'];

    if (omitirRelevosYPatioNorte) {
      return [
        fila.ECONOMICO ?? '',
        fila.TIPO_DE_UNIDAD ?? '',
        (fila.ESTATUS ?? '').toUpperCase(),
        fila.RUTA ?? '',
        fila.TARJETON ? String(fila.TARJETON).padStart(4, '0') : '',
        fila.NOMBRE_CONDUCTOR ?? '',
        fila.HORA_DE_ACOPLE ?? '',
        fila.HORA_REAL_SALIDA_PATIO ?? '',
        fila.ACOPLE ?? '',
        fila.CORRIDAS ?? '',
      ];
    }

    return [
      fila.ECONOMICO ?? '',
      fila.TIPO_DE_UNIDAD ?? '',
      (fila.ESTATUS ?? '').toUpperCase(),
      fila.RUTA ?? '',
      fila.TARJETON ? String(fila.TARJETON).padStart(4, '0') : '',
      fila.NOMBRE_CONDUCTOR ?? '',
      fila.RELEVO_TARJETON ? String(fila.RELEVO_TARJETON).padStart(4, '0') : '',
      fila.RELEVO_CONDUCTOR ?? '',
      fila.RELEVO_HORA ?? '',
      fila.HORA_DE_ACOPLE ?? '',
      fila.HORA_REAL_SALIDA_PATIO ?? '',
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
        } else if (estatus === 'reserva') {
          data.cell.styles.fillColor = [221, 235, 247];
          data.cell.styles.textColor = [20, 60, 110];
          data.cell.styles.fontStyle = 'bold';
        } else if (estatus === 'mantenimiento') {
          data.cell.styles.fillColor = [255, 242, 204];
          data.cell.styles.textColor = [130, 95, 10];
          data.cell.styles.fontStyle = 'bold';
        } else if (estatus === 'percance') {
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
    const nombreArchivo = options?.nombreArchivo || (omitirRelevosYPatioNorte ? 'Programacion_Operativa_Despacho.pdf' : 'Programacion_Operativa.pdf');
    doc.save(nombreArchivo);
    return null;
  }
  return doc.output('datauristring').split(',')[1];
};
