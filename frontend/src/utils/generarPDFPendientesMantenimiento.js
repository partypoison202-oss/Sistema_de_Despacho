import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * generatePDFPendientesMantenimiento
 * @param {Array} unidades - Array de unidades en mantenimiento
 * @param {string} tipo - 'autobuses' (Urbanuss, Zafiro, Orion) o 'vagonetas' (Vagoneta)
 */
export const generarPDFPendientesMantenimiento = (unidades, tipo) => {
  const pdf = new jsPDF('l', 'mm', 'letter');
  
  // Filtrar unidades según el tipo
  let unidadesFiltradas = [];
  if (tipo === 'vagonetas') {
    unidadesFiltradas = unidades.filter(u => String(u.tipo).toLowerCase() === 'vagoneta');
  } else {
    // autobuses
    unidadesFiltradas = unidades.filter(u => ['urbanuss', 'zafiro', 'orion'].includes(String(u.tipo).toLowerCase()));
  }

  // Título principal
  pdf.setFillColor(107, 29, 51); // Vino
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 25, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  const title = tipo === 'vagonetas' ? 'REPORTE DE FOLIOS VAGONETAS' : 'REPORTE DE FOLIOS PENDIENTES';
  pdf.text(title, 20, 16);

  // Fecha y hora actual
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const fechaStr = now.toLocaleDateString('es-MX', options).toUpperCase();
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' HORAS';

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.text(`${fechaStr}`, pdf.internal.pageSize.getWidth() - 15, 35, { align: 'right' });
  pdf.text(`${horaStr}`, pdf.internal.pageSize.getWidth() - 15, 43, { align: 'right' });

  // Calcular días fuera de servicio (aproximado)
  const calcularDias = (fechaIngreso) => {
    if (!fechaIngreso) return 0;
    const ingreso = new Date(fechaIngreso);
    const diffTime = Math.abs(now - ingreso);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Formatear Fecha y Hora
  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Preparar datos para la tabla
  let tableHeaders = [];
  let tableBody = [];

  if (tipo === 'vagonetas') {
    tableHeaders = [['FOLIO', 'ECO', 'SISTEMA', 'FALLA REPORTADA', 'FECHA DE INGRESO', 'HORA DE INGRESO', 'DÍAS FUERA DE SERVICIO', 'STATUS']];
    tableBody = unidadesFiltradas.map((u) => [
      u.folio_mantenimiento || '',
      u.numero_eco,
      'MANTENIMIENTO', // Sistema (Hardcoded for now as it's not saved specifically)
      u.falla_reportada || u.motivo_estatus || '',
      formatDate(u.fecha_folio_mantenimiento || u.updated_at),
      formatTime(u.fecha_folio_mantenimiento || u.updated_at),
      calcularDias(u.fecha_folio_mantenimiento || u.updated_at).toString(),
      'PENDIENTE'
    ]);
  } else {
    tableHeaders = [['NO', 'FOLIO', 'ECO', 'MODELO', 'SISTEMA', 'FALLA REPORTADA', 'FECHA DE INGRESO', 'DÍAS FUERA DE SERVICIO', 'STATUS']];
    tableBody = unidadesFiltradas.map((u, index) => [
      (index + 1).toString(),
      u.folio_mantenimiento || '',
      u.numero_eco,
      String(u.tipo).toUpperCase(),
      'MANTENIMIENTO',
      u.falla_reportada || u.motivo_estatus || '',
      formatDate(u.fecha_folio_mantenimiento || u.updated_at),
      calcularDias(u.fecha_folio_mantenimiento || u.updated_at).toString(),
      'PENDIENTE'
    ]);
  }

  // Generar tabla
  autoTable(pdf, {
    startY: 55,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [107, 29, 51], // Vino
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 9
    },
    bodyStyles: {
      halign: 'center',
      valign: 'middle',
      fontSize: 9
    },
    styles: {
      cellPadding: 3,
    },
    columnStyles: {
      3: { cellWidth: 35 }, // Falla Reportada un poco más ancha
    }
  });

  // Footer notes can go here later si se requieren programaciones adicionales

  // Descargar
  const filename = `Reporte_${tipo === 'vagonetas' ? 'Vagonetas' : 'Pendientes'}_${fechaStr.replace(/ /g, '_')}.pdf`;
  pdf.save(filename);
};
