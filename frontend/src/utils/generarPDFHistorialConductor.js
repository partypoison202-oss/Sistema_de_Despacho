import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import stmLogo from '../assets/logo-stm.webp';

/**
 * Carga una imagen y elimina el fondo blanco usando canvas para transparencia.
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
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

const formatearFechaStr = (fStr) => {
  if (!fStr) return 'N/D';
  const partes = String(fStr).substring(0, 10).split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fStr;
};

export const generarPDFHistorialConductor = async ({ conductor, rango, resumen, eventos }) => {
  const pdf = new jsPDF('p', 'mm', 'letter');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const HEADER_H = 28;

  const logoDataUrl = await cargarLogoTransparente(stmLogo);

  // 1. Encabezado Institucional
  pdf.setFillColor(107, 29, 51); // #6b1d33 vino institucional
  pdf.rect(0, 0, pageW, HEADER_H, 'F');

  pdf.setFillColor(70, 15, 30);
  pdf.rect(0, HEADER_H - 1.5, pageW, 1.5, 'F');

  if (logoDataUrl) {
    const logoH = 20;
    const props = pdf.getImageProperties(logoDataUrl);
    const logoW = logoH * (props.width / props.height);
    pdf.addImage(logoDataUrl, 'PNG', 10, (HEADER_H - logoH) / 2, logoW, logoH);
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(197, 160, 89); // Dorado institucional
  pdf.text('SISTEMA DE TRANSPORTE METROPOLITANO DE HIDALGO', pageW / 2 + 10, 9, { align: 'center' });

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EXPEDIENTE E HISTORIAL INDIVIDUAL DE CONDUCTOR', pageW / 2 + 10, 16, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`PERIODO AUDITADO: ${formatearFechaStr(rango?.desde)} AL ${formatearFechaStr(rango?.hasta)}`, pageW / 2 + 10, 22, { align: 'center' });

  // 2. Tarjeta Resumen del Conductor
  let curY = HEADER_H + 6;

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(10, curY, pageW - 20, 26, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`${conductor?.nombre_completo || 'CONDUCTOR'}`, 14, curY + 6);

  // Badge Tarjetón
  pdf.setFillColor(107, 29, 51);
  pdf.roundedRect(14, curY + 9, 32, 5, 1, 1, 'F');
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`TARJETÓN: ${conductor?.tarjeton || 'S/N'}`, 30, curY + 12.5, { align: 'center' });

  // Badge Tipo Tarjetón
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(48, curY + 9, 22, 5, 1, 1, 'FD');
  pdf.setTextColor(51, 65, 85);
  pdf.text(`TIPO: ${conductor?.tipo_tarjeton || 'B'}`, 59, curY + 12.5, { align: 'center' });

  // Detalles en columnas
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);

  pdf.text(`Estado de Servicio: ${conductor?.estado_servicio || 'Disponible'}`, 14, curY + 19);
  pdf.text(`Estatus: ${(conductor?.estatus || 'Activo').toUpperCase()}`, 14, curY + 23);

  pdf.text(`Puesto: ${conductor?.puesto || 'Conductor de Autobús'}`, 80, curY + 6);
  pdf.text(`Categoría / Turno: ${conductor?.categoria || 'A'} / ${conductor?.turno || 'Mixto'}`, 80, curY + 11);
  pdf.text(`Teléfono: ${conductor?.telefono || 'No registrado'}`, 80, curY + 16);
  pdf.text(`Fecha Ingreso: ${formatearFechaStr(conductor?.fecha_ingreso)}`, 80, curY + 21);

  // KPIs de periodo a la derecha
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('MÉTRICAS DEL RANGO:', 145, curY + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(`Asistencias: ${resumen?.asistencias || 0}  |  Descansos: ${resumen?.descansos || 0}`, 145, curY + 11);
  pdf.text(`Faltas (Inj / Just): ${resumen?.faltas_injustificadas || 0} / ${resumen?.faltas_justificadas || 0}`, 145, curY + 16);
  pdf.text(`Permutas / Permisos: ${resumen?.permutas_totales || 0} / ${resumen?.permisos || 0}`, 145, curY + 21);

  // Tasa Asistencia
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(21, 128, 61);
  pdf.text(`Cumplimiento: ${resumen?.tasa_asistencia_pct ?? 100}%`, 145, curY + 25);

  curY += 30;

  // 3. Tabla Detallada de Eventos
  const tableData = (eventos || []).map(ev => {
    return [
      formatearFechaStr(ev.fecha),
      ev.tipo ? ev.tipo.replace('_', ' ') : 'EVENTO',
      ev.titulo || 'Registro Operativo',
      ev.descripcion || '-',
      ev.detalles || '-',
      ev.origen || 'Sistema'
    ];
  });

  autoTable(pdf, {
    startY: curY,
    head: [['FECHA', 'TIPO', 'EVENTO / ASIGNACIÓN', 'DESCRIPCIÓN', 'DETALLES / JUSTIFICACIÓN', 'ORIGEN']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'No se encontraron eventos en este periodo', '-', '-', '-']],
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: 1.6,
      valign: 'middle',
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [107, 29, 51],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', minCellWidth: 16, fontStyle: 'bold' },
      1: { halign: 'center', minCellWidth: 20 },
      2: { minCellWidth: 32, fontStyle: 'bold' },
      3: { minCellWidth: 40 },
      4: { minCellWidth: 48 },
      5: { halign: 'center', minCellWidth: 20 }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rawTipo = String(data.row.raw[1] || '').toUpperCase();
        if (data.column.index === 1) {
          data.cell.styles.fontStyle = 'bold';
          if (rawTipo.includes('ASISTENCIA') || rawTipo.includes('AP')) {
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fillColor = [220, 252, 231];
          } else if (rawTipo === 'FALTA' || rawTipo.includes('INJUSTIFICADA')) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fillColor = [254, 226, 226];
          } else if (rawTipo.includes('JUSTIFICADA')) {
            data.cell.styles.textColor = [4, 120, 87];
            data.cell.styles.fillColor = [209, 250, 229];
          } else if (rawTipo.includes('DESCANSO') || rawTipo.includes('DP')) {
            data.cell.styles.textColor = [154, 52, 18];
            data.cell.styles.fillColor = [255, 237, 213];
          } else if (rawTipo.includes('PERMUTA')) {
            data.cell.styles.textColor = [109, 40, 217];
            data.cell.styles.fillColor = [237, 233, 254];
          } else if (rawTipo.includes('PERMISO')) {
            data.cell.styles.textColor = [2, 132, 199];
            data.cell.styles.fillColor = [224, 242, 254];
          } else if (rawTipo.includes('VACACIONES')) {
            data.cell.styles.textColor = [133, 77, 14];
            data.cell.styles.fillColor = [254, 240, 138];
          } else if (rawTipo.includes('INCAPACIDAD')) {
            data.cell.styles.textColor = [30, 64, 175];
            data.cell.styles.fillColor = [191, 219, 254];
          } else if (rawTipo.includes('RETARDO')) {
            data.cell.styles.textColor = [161, 98, 7];
            data.cell.styles.fillColor = [254, 249, 195];
          }
        }
      }
    }
  });

  // Footer con paginación
  const pageCount = pdf.internal.getNumberOfPages();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.text(
      `Expediente generado el ${new Date().toLocaleString('es-MX')} | Página ${i} de ${pageCount}`,
      pageW / 2,
      pageH - 6,
      { align: 'center' }
    );
  }

  window.open(pdf.output('bloburl'), '_blank');
};
