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

  // Cargar logo con fondo transparente
  const logoDataUrl = await cargarLogoTransparente(stmLogo);

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
    titulo = 'UNIDADES PENDIENTES DE MANTENIMIENTO';
    subtitulo = 'Con incidencia registrada — sin orden de mantenimiento generada';
    filename = `Reporte_Pendientes_Mantenimiento_${fechaStr.replace(/ /g, '_')}.pdf`;
  } else {
    // Ya tienen folio completo generado (en mantenimiento activo)
    unidadesFiltradas = unidades.filter(
      (u) => u.folio_mantenimiento && String(u.folio_mantenimiento).trim() !== ''
    );
    titulo = 'UNIDADES YA EN MANTENIMIENTO';
    subtitulo = 'Con orden de mantenimiento activa (Folio generado)';
    filename = `Reporte_En_Mantenimiento_${fechaStr.replace(/ /g, '_')}.pdf`;
  }

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

  pdf.save(filename);
};
