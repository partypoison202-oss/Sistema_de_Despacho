// src/utils/pdfGeneratorEncierro.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { limpiarTexto } from './limpiarTexto';

export const generarPDFEncierro = ({
  responsable,
  kilometraje,
  zonaFormateada,
  unidadEco,
  transporteFormateado,
  fechaVisual,
  estados,
  observacionesEspecificas,
  observacionesGenerales,
  componentesEvaluacion,
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 15;
  let y = margin;

  // Limpiar textos
  const responsableLimpio   = limpiarTexto(responsable)  || 'No especificado';
  const kilometrajeLimpio   = limpiarTexto(kilometraje)  || 'No especificado';
  const zonaLimpia          = limpiarTexto(zonaFormateada);
  const unidadLimpia        = limpiarTexto(unidadEco);
  const transporteLimpio    = limpiarTexto(transporteFormateado);

  // ── Encabezado ──────────────────────────────────────────────
  // Franja de color guinda de cabecera
  doc.setFillColor(107, 29, 51);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Check List de Encierro', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${transporteLimpio}  /  Unidad: ${unidadLimpia}  /  Zona: ${zonaLimpia}`, margin, 20);
  doc.text(`Fecha: ${fechaVisual}`, 210 - margin, 20, { align: 'right' });

  y = 36;

  // ── Datos generales ─────────────────────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, 180, 18, 3, 3, 'F');

  doc.setTextColor(107, 29, 51);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSABLE', margin + 4, y + 6);
  doc.text('KILOMETRAJE', margin + 65, y + 6);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(responsableLimpio, margin + 4, y + 14);
  doc.text(`${kilometrajeLimpio} km`, margin + 65, y + 14);

  y += 26;

  // ── Tabla del checklist ──────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Checklist de Inspección — Encierro', margin, y);
  y += 5;

  const tableData = componentesEvaluacion.map((item) => {
    let estadoRaw = estados[item.n] || 'Pendiente';
    let estadoTexto = 'Pendiente';
    if (estadoRaw === 'OK')     estadoTexto = 'OK';
    else if (estadoRaw === 'NO OK') estadoTexto = 'NO OK';
    else if (estadoRaw === 'N/A')   estadoTexto = 'N/A';

    const obsEspecifica = observacionesEspecificas[item.n]
      ? limpiarTexto(observacionesEspecificas[item.n])
      : '';

    return [
      item.n.toString(),
      limpiarTexto(item.area),
      limpiarTexto(item.desc),
      estadoTexto,
      obsEspecifica,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['N°', 'Área/Componente', 'Descripción', 'Estado', 'Observación específica']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      font: 'helvetica',
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [107, 29, 51],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 247, 244],
    },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 68 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 48 },
    },
    didParseCell: function (data) {
      if (data.column.index === 3 && data.section === 'body') {
        const estado = data.cell.text[0];
        if (estado === 'OK')     data.cell.styles.textColor = [19, 115, 51];
        else if (estado === 'NO OK') data.cell.styles.textColor = [197, 34, 31];
        else if (estado === 'N/A')   data.cell.styles.textColor = [120, 120, 120];
        else                         data.cell.styles.textColor = [150, 100, 0];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Observaciones generales ──────────────────────────────────
  const obsGeneralesLimpio = limpiarTexto(observacionesGenerales);
  if (obsGeneralesLimpio !== '') {
    if (y > 265) { doc.addPage(); y = margin; }

    doc.setFillColor(107, 29, 51);
    doc.rect(margin, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones Generales', margin + 3, y + 5);
    y += 11;

    doc.setFillColor(250, 247, 244);
    const splitText = doc.splitTextToSize(obsGeneralesLimpio, 174);
    const boxH = splitText.length * 5 + 8;
    doc.rect(margin, y, 180, boxH, 'F');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(splitText, margin + 3, y + 5);
    y += boxH + 8;
  }

  // ── Firma / Pie ──────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Reporte de Encierro generado automáticamente — ${new Date().toLocaleString()}`,
      margin,
      doc.internal.pageSize.height - 8
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width - margin,
      doc.internal.pageSize.height - 8,
      { align: 'right' }
    );
  }

  doc.save(`encierro_${unidadLimpia}_${zonaLimpia.replace(/\s/g, '_')}.pdf`);
};
