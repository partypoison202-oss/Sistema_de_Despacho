// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { limpiarTexto } from './limpiarTexto';

export const generarPDFProfesional = ({
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

  // Limpiar todos los textos que se usarán
  const responsableLimpio = limpiarTexto(responsable) || 'No especificado';
  const kilometrajeLimpio = limpiarTexto(kilometraje) || 'No especificado';
  const zonaLimpia = limpiarTexto(zonaFormateada);
  const unidadLimpia = limpiarTexto(unidadEco);
  const transporteLimpio = limpiarTexto(transporteFormateado);

  // Encabezado
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`Reporte de Inspeccion - ${transporteLimpio}`, margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Unidad ECO: ${unidadLimpia}`, margin, y);
  y += 6;
  doc.text(`Zona inspeccionada: ${zonaLimpia}`, margin, y);
  y += 6;
  doc.text(`Fecha y hora: ${fechaVisual}`, margin, y);
  y += 10;

  // Datos generales
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos Generales', margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Responsable: ${responsableLimpio}`, margin, y);
  y += 5;
  doc.text(`Kilometraje actual: ${kilometrajeLimpio} km`, margin, y);
  y += 10;

  // Tabla de evaluación
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Checklist de Inspeccion', margin, y);
  y += 6;

  const tableData = [];
  componentesEvaluacion.forEach((item) => {
    let estadoRaw = estados[item.n] || 'Pendiente';
    let estadoTexto = 'Pendiente';
    if (estadoRaw === 'OK') estadoTexto = 'OK';
    else if (estadoRaw === 'NO OK') estadoTexto = 'NO OK';
    else if (estadoRaw === 'N/A') estadoTexto = 'N/A';
    else if (typeof estadoRaw === 'string' && estadoRaw.includes('OK')) estadoTexto = 'OK';
    else if (typeof estadoRaw === 'string' && estadoRaw.includes('NO')) estadoTexto = 'NO OK';
    else if (typeof estadoRaw === 'string' && estadoRaw.includes('N/A')) estadoTexto = 'N/A';

    tableData.push([
      item.n.toString(),
      limpiarTexto(item.area),
      limpiarTexto(item.desc),
      estadoTexto,
    ]);
  });

  autoTable(doc, {
    startY: y,
    head: [['N°', 'Area/Componente', 'Descripcion', 'Estado']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 40 },
      2: { cellWidth: 70 },
      3: { cellWidth: 25 },
    },
    didParseCell: function (data) {
      if (data.column.index === 3 && data.row.index > 0) {
        const estado = data.cell.text[0];
        if (estado === 'OK') data.cell.styles.textColor = [0, 128, 0];
        else if (estado === 'NO OK') data.cell.styles.textColor = [255, 0, 0];
        else if (estado === 'N/A') data.cell.styles.textColor = [128, 128, 128];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // Observaciones específicas
  const observacionesEspecificasList = Object.entries(observacionesEspecificas)
    .filter(([_, texto]) => texto && limpiarTexto(texto) !== '');
  if (observacionesEspecificasList.length > 0) {
    if (y > 270) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones Especificas', margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    observacionesEspecificasList.forEach(([id, texto]) => {
      const componente = componentesEvaluacion.find((c) => c.n.toString() === id);
      const nombreArea = componente ? limpiarTexto(componente.area) : `Item ${id}`;
      const textoLimpio = limpiarTexto(texto);
      doc.text(`• ${nombreArea}: ${textoLimpio}`, margin, y);
      y += 5;
      if (y > 280) { doc.addPage(); y = margin; }
    });
    y += 5;
  }

  // Observaciones generales
  const observacionesGeneralesLimpio = limpiarTexto(observacionesGenerales);
  if (observacionesGeneralesLimpio !== '') {
    if (y > 270) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones Generales', margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(observacionesGeneralesLimpio, 180);
    doc.text(splitText, margin, y);
    y += splitText.length * 5 + 5;
  }

  // Pie de página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Reporte generado automaticamente - ${new Date().toLocaleString()}`,
      margin,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Pagina ${i} de ${pageCount}`,
      doc.internal.pageSize.width - margin - 20,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`reporte_${unidadLimpia}_${zonaLimpia.replace(/\s/g, '_')}.pdf`);
};