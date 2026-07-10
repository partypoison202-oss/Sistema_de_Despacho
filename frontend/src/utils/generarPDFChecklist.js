import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CONDUCTORES from '../data/conductores';

const PUNTOS = [
    { id: 'carroceria_exterior', label: 'Carrocería exterior' },
    { id: 'mobitec', label: 'Mobitec' },
    { id: 'torreta', label: 'Torreta' },
    { id: 'pintura_vinil', label: 'Pintura y vinil' },
    { id: 'parabrisas_cristales', label: 'Parabrisas y cristales' },
    { id: 'luces_exteriores', label: 'Luces exteriores' },
    { id: 'puertas', label: 'Puertas' },
    { id: 'llantas', label: 'Llantas' },
    { id: 'rines', label: 'Rines' },
    { id: 'retrovisores', label: 'Retrovisores' },
    { id: 'limpieza', label: 'Limpieza' },
    { id: 'asientos', label: 'Asientos' },
    { id: 'extintor_seguridad', label: 'Extintor y seguridad' },
    { id: 'documentacion', label: 'Documentación' },
    { id: 'tecnologia', label: 'Tecnología' },
    { id: 'alerta_tablero', label: 'Alerta en tablero' },
];

// Colores institucionales
const COLOR_GUINDA     = [136, 19, 55];
const COLOR_GUINDA_DK  = [100, 10, 35];
const COLOR_WHITE      = [255, 255, 255];
const COLOR_GRAY_LIGHT = [246, 246, 248];
const COLOR_GRAY_TEXT  = [75, 85, 99];
const COLOR_BIEN       = [5, 150, 105];
const COLOR_MAL        = [220, 38, 38];

const loadImage = (src) => {
    return new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
};

/**
 * Compone una imagen con fondo transparente sobre un color sólido.
 * Devuelve un data URL PNG listo para jsPDF sin cuadro negro.
 */
const compositeLogoOnColor = (imgEl, bgRGB) => {
    const canvas = document.createElement('canvas');
    canvas.width  = imgEl.naturalWidth  || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = `rgb(${bgRGB[0]}, ${bgRGB[1]}, ${bgRGB[2]})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgEl, 0, 0);
    return canvas.toDataURL('image/png');
};

/**
 * Comprime una imagen a una resolución máxima para reducir peso del PDF.
 * Devuelve un data URL JPEG.
 */
const compressImage = (imgEl, maxDimension = 800, quality = 0.6) => {
    const canvas = document.createElement('canvas');
    let width = imgEl.naturalWidth || imgEl.width;
    let height = imgEl.naturalHeight || imgEl.height;

    if (width > maxDimension || height > maxDimension) {
        if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
        } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
        }
    }
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Rellenar fondo blanco (por si hay transparencias)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    ctx.drawImage(imgEl, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
};

const HEADER_H = 30; // altura de la banda membretada

/**
 * Dibuja la banda membretada guinda en la parte superior de la página.
 */
const drawHeader = (doc, logoImg, pageWidth) => {
    // Fondo guinda
    doc.setFillColor(...COLOR_GUINDA);
    doc.rect(0, 0, pageWidth, HEADER_H, 'F');

    // Franja decorativa inferior (más oscura)
    doc.setFillColor(...COLOR_GUINDA_DK);
    doc.rect(0, HEADER_H - 1.5, pageWidth, 1.5, 'F');

    // Logo "T" institucional a la izquierda
    if (logoImg) {
        const logoH = 22;
        const props = doc.getImageProperties(logoImg);
        const logoW = logoH * (props.width / props.height);
        doc.addImage(logoImg, 'PNG', 7, (HEADER_H - logoH) / 2, logoW, logoH);
    }

    // Subtítulo (institución)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_WHITE);
    doc.text('SISTEMA DE TRANSPORTE METROPOLITANO DE HIDALGO', pageWidth / 2, 11, { align: 'center' });

    // Título principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...COLOR_WHITE);
    doc.text('REPORTE DE CHECK LIST', pageWidth / 2, 22, { align: 'center' });

    // Resetear color
    doc.setTextColor(0, 0, 0);
};

/**
 * Dibuja el pie de página guinda con número de página.
 */
const drawFooter = (doc, pageNum, totalPages, pageWidth, pageHeight) => {
    const h = 10;
    doc.setFillColor(...COLOR_GUINDA);
    doc.rect(0, pageHeight - h, pageWidth, h, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_WHITE);
    doc.text('SITMAH — Sistema de Despacho y Gestión de Flota', 10, pageHeight - 3.5);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 10, pageHeight - 3.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
};

export const generarPDFChecklist = async (checklist, accion = 'download') => {
    if (!checklist) return;

    try {
        const doc      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW    = doc.internal.pageSize.width;
        const pageH    = doc.internal.pageSize.height;
        const margin   = 14;
        let   y        = HEADER_H + 9;

        // ── Cargar logo ──────────────────────────────────────────────────────
        // Cargar logo y compositar sobre fondo guinda para eliminar cuadro negro
        const logoRaw  = await loadImage('/images/sistema de tm.webp');
        const logoImg  = logoRaw ? compositeLogoOnColor(logoRaw, COLOR_GUINDA) : null;

        // ── Encabezado primera página ────────────────────────────────────────
        drawHeader(doc, logoImg, pageW);

        // ── Tarjeta de información de la unidad ──────────────────────────────
        const dateFormatted = new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'long',
            timeStyle: 'short',
        }).format(new Date(checklist.fecha_hora || checklist.created_at || new Date()));

        const conductorEncontrado = CONDUCTORES.find(c => c.id === Number(checklist.conductor_id));
        const conductorNombre = conductorEncontrado
            ? conductorEncontrado.nombre
            : (checklist.conductor_nombre || '—');

        // Fondo de la tarjeta
        const cardH = 44;
        doc.setFillColor(...COLOR_GRAY_LIGHT);
        doc.roundedRect(margin, y, pageW - margin * 2, cardH, 2, 2, 'F');
        // Borde guinda
        doc.setDrawColor(...COLOR_GUINDA);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, pageW - margin * 2, cardH, 2, 2, 'S');
        // Franja lateral izquierda
        doc.setFillColor(...COLOR_GUINDA);
        doc.rect(margin, y, 3, cardH, 'F');

        // Título de la tarjeta
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COLOR_GUINDA);
        doc.text(`CHECK LIST  #${checklist.id}`, margin + 8, y + 9);

        // Datos en 2 columnas
        const col1X = margin + 8;
        const col2X = pageW / 2 + 2;
        const rows = [
            { label: 'Unidad (Económico)', value: checklist.economico || checklist.numero_eco || '—' },
            { label: 'Tipo de Unidad',      value: checklist.tipo_unidad  || '—' },
            { label: 'Servicio / Ruta',     value: checklist.servicio     || '—' },
            { label: 'Inspector',           value: checklist.user_name    || '—' },
            { label: 'Conductor',           value: conductorNombre },
            { label: 'Fecha y Hora',        value: dateFormatted },
        ];

        rows.forEach((row, idx) => {
            const colX  = idx % 2 === 0 ? col1X : col2X;
            const rowY  = y + 18 + Math.floor(idx / 2) * 9;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...COLOR_GUINDA);
            doc.text(`${row.label}:`, colX, rowY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COLOR_GRAY_TEXT);
            doc.text(row.value, colX + 35, rowY);
        });

        y += cardH + 7;

        // ── Cajas de resumen ─────────────────────────────────────────────────
        const totalBien   = Object.values(checklist.puntos || {}).filter(p => p?.estado === 'bien').length;
        const totalMal    = Object.values(checklist.puntos || {}).filter(p => p?.estado === 'mal').length;
        const totalPuntos = PUNTOS.length;

        const boxW = (pageW - margin * 2 - 8) / 3;
        const boxH = 15;

        const drawBox = (x, bgRGB, borderRGB, textRGB, num, label) => {
            doc.setFillColor(...bgRGB);
            doc.roundedRect(x, y, boxW, boxH, 2, 2, 'F');
            doc.setDrawColor(...borderRGB);
            doc.setLineWidth(0.4);
            doc.roundedRect(x, y, boxW, boxH, 2, 2, 'S');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.setTextColor(...textRGB);
            doc.text(`${num}`, x + boxW / 2, y + 9.5, { align: 'center' });
            doc.setFontSize(6.5);
            doc.text(label, x + boxW / 2, y + 14, { align: 'center' });
        };

        drawBox(margin,            [236, 253, 245], COLOR_BIEN, COLOR_BIEN,        totalBien,   'BIEN');
        drawBox(margin + boxW + 4, [254, 242, 242], COLOR_MAL,  COLOR_MAL,         totalMal,    'MAL');
        drawBox(margin + (boxW + 4) * 2, [243, 244, 246], [156, 163, 175], [75, 85, 99], totalPuntos, 'TOTAL');

        y += boxH + 8;

        // ── Tabla de puntos evaluados ────────────────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...COLOR_GUINDA);
        doc.text('PUNTOS EVALUADOS', margin, y);
        y += 4;

        const tableData = [];
        PUNTOS.forEach(punto => {
            const pd = checklist.puntos?.[punto.id];
            if (pd && pd.estado) {
                tableData.push([
                    punto.label,
                    pd.estado === 'bien' ? 'Bien' : 'Mal',
                    pd.observaciones || '—',
                ]);
            }
        });

        autoTable(doc, {
            startY: y,
            head: [['Punto Evaluado', 'Estado', 'Observaciones']],
            body: tableData,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9, cellPadding: 3, font: 'helvetica', textColor: [40, 40, 40] },
            headStyles: { fillColor: COLOR_GUINDA, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: [250, 249, 252] },
            columnStyles: {
                0: { cellWidth: 58 },
                1: { cellWidth: 22, halign: 'center' },
                2: { cellWidth: 'auto' },
            },
            didParseCell: (data) => {
                if (data.column.index === 1 && data.row.section === 'body') {
                    if (data.cell.raw === 'Bien') data.cell.styles.textColor = COLOR_BIEN;
                    else if (data.cell.raw === 'Mal') data.cell.styles.textColor = COLOR_MAL;
                    data.cell.styles.fontStyle = 'bold';
                }
            },
            didDrawPage: () => {
                drawHeader(doc, logoImg, pageW);
            },
        });

        let currentY = doc.lastAutoTable.finalY || y;

        // ── Referencia visual (dibujo) ───────────────────────────────────────
        if (checklist.dibujo) {
            const drawingImg = await loadImage(checklist.dibujo);

            if (pageH - currentY - 18 < 82) {
                doc.addPage();
                drawHeader(doc, logoImg, pageW);
                currentY = HEADER_H + 9;
            } else {
                currentY += 10;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...COLOR_GUINDA);
            doc.text('REFERENCIA VISUAL (MARCAS DE FALLAS)', margin, currentY);
            currentY += 5;

            const imgW = 120;
            const imgH = 72;
            const imgX = margin + (pageW - margin * 2 - imgW) / 2;

            // Marco con relleno claro
            doc.setFillColor(245, 245, 245);
            doc.setDrawColor(210, 210, 210);
            doc.setLineWidth(0.4);
            doc.roundedRect(imgX - 2, currentY - 2, imgW + 4, imgH + 4, 2, 2, 'FD');

            if (drawingImg) {
                const compressedDrawing = compressImage(drawingImg, 800, 0.7);
                doc.addImage(compressedDrawing, 'JPEG', imgX, currentY, imgW, imgH, undefined, 'FAST');
            }
            currentY += imgH + 12;
        }

        // ── Evidencias fotográficas ──────────────────────────────────────────
        const fotosEvidencia = [];
        PUNTOS.forEach(punto => {
            const pd = checklist.puntos?.[punto.id];
            if (pd) {
                if (pd.foto) fotosEvidencia.push({ label: punto.label, url: pd.foto });
                if (pd.fotos?.length > 0) {
                    pd.fotos.forEach(f => fotosEvidencia.push({ label: punto.label, url: f }));
                }
            }
        });

        if (fotosEvidencia.length > 0) {
            const loadedPhotos = await Promise.all(
                fotosEvidencia.map(async foto => ({ ...foto, img: await loadImage(foto.url) }))
            );

            let firstPhoto = true;
            for (const { label, img } of loadedPhotos) {
                if (!img) continue;

                if (firstPhoto) {
                    if (pageH - currentY - 18 < 70) {
                        doc.addPage();
                        drawHeader(doc, logoImg, pageW);
                        currentY = HEADER_H + 9;
                    } else {
                        currentY += 8;
                    }
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(...COLOR_GUINDA);
                    doc.text('EVIDENCIAS FOTOGRÁFICAS', margin, currentY);
                    currentY += 6;
                    firstPhoto = false;
                }

                if (pageH - currentY - 18 < 80) {
                    doc.addPage();
                    drawHeader(doc, logoImg, pageW);
                    currentY = HEADER_H + 9;
                }

                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.setTextColor(...COLOR_GRAY_TEXT);
                doc.text(`Evidencia: ${label}`, margin, currentY);
                currentY += 4;

                const props = doc.getImageProperties(img);
                const maxW  = pageW - margin * 2;
                let   pdfH  = (props.height * maxW) / props.width;

                const compressedDataUrl = compressImage(img, 800, 0.6);

                if (pdfH > 70) {
                    pdfH = 70;
                    const pdfW = (props.width * pdfH) / props.height;
                    doc.addImage(compressedDataUrl, 'JPEG', margin + (maxW - pdfW) / 2, currentY, pdfW, pdfH, undefined, 'FAST');
                } else {
                    doc.addImage(compressedDataUrl, 'JPEG', margin, currentY, maxW, pdfH, undefined, 'FAST');
                }
                currentY += pdfH + 8;
            }
        }

        // ── Pie de página en todas las hojas ────────────────────────────────
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            drawFooter(doc, i, totalPages, pageW, pageH);
        }

        // ── Guardar / Imprimir ───────────────────────────────────────────────
        if (accion === 'print') {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } else {
            doc.save(`Checklist_${checklist.id}_Unidad${checklist.economico || ''}.pdf`);
        }
    } catch (err) {
        console.error('Error al generar PDF:', err);
        alert(`Hubo un error al generar el PDF: ${err.message || err}`);
    }
};

