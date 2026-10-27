import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLOR_GUINDA     = [96, 26, 42]; 
const COLOR_GOLD       = [197, 160, 89];
const COLOR_BEIGE      = [224, 211, 187];
const COLOR_WHITE      = [255, 255, 255];

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

const drawImageFitted = (pdf, img, areaX, areaY, areaW, areaH) => {
    if (!img || !(img.naturalWidth > 0 || img.width > 0)) return;
    const canvas = document.createElement('canvas');
    canvas.width  = img.naturalWidth  || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const ratio = Math.min(areaW / canvas.width, areaH / canvas.height);
    const drawW = canvas.width * ratio;
    const drawH = canvas.height * ratio;
    const x = areaX + (areaW - drawW) / 2;
    const y = areaY + (areaH - drawH) / 2;

    if (drawW > 0 && drawH > 0) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawW, drawH);
    }
};

export const generarPDFReporteGeneral = async (data, totalsExtra = null) => {
    if (!data || !data.length) {
        throw new Error("No hay datos para generar el reporte.");
    }

    const troncales = data.filter(item => (item.tipo === 'troncal' || item.ruta.startsWith('T-')) && !item.ruta.toUpperCase().includes('SIN ASIGNAR'));
    const alimentadoras = data.filter(item => (item.tipo === 'alimentadora' || item.ruta.startsWith('RA') || item.ruta.startsWith('ORION')) && !item.ruta.toUpperCase().includes('SIN ASIGNAR'));

    const troncalOperacion     = troncales.reduce((s, r) => s + Number(r.en_operacion), 0);
    const troncalMantenimiento = totalsExtra?.troncalMantenimiento !== undefined 
        ? Number(totalsExtra.troncalMantenimiento) 
        : troncales.reduce((s, r) => s + Number(r.en_mantenimiento), 0);
    const troncalTotal         = totalsExtra?.troncalTotal ?? (troncalOperacion + troncalMantenimiento);

    const alimentadoraOperacion     = alimentadoras.reduce((s, r) => s + Number(r.en_operacion), 0);
    const alimentadoraMantenimiento = totalsExtra?.alimentadoraMantenimiento !== undefined 
        ? Number(totalsExtra.alimentadoraMantenimiento) 
        : alimentadoras.reduce((s, r) => s + Number(r.en_mantenimiento), 0);
    const alimentadoraTotal         = totalsExtra?.alimentadoraTotal ?? (alimentadoraOperacion + alimentadoraMantenimiento);

    const fecha = new Date().toLocaleDateString('es-MX', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).toUpperCase();

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    // 1. BANNER INSTITUCIONAL
    pdf.setFillColor(...COLOR_GUINDA);
    pdf.rect(0, 0, pw, 25, 'F');
    
    // Logo
    const logoImg = await loadImage('/images/sistema_de_tm.webp');
    if (logoImg && (logoImg.naturalWidth > 0 || logoImg.width > 0)) {
        const canvas = document.createElement('canvas');
        canvas.width  = logoImg.naturalWidth  || logoImg.width;
        canvas.height = logoImg.naturalHeight || logoImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(logoImg, 0, 0);
        const maxW = 50;
        const maxH = 15;
        const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
        const drawW = canvas.width * ratio;
        const drawH = canvas.height * ratio;
        if (drawW > 0 && drawH > 0) {
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 5, drawW, drawH);
        }
    }
    
    // Título Principal
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(...COLOR_WHITE);
    pdf.text('REPORTE DE OPERACIONES', pw - 10, 16, { align: 'right' });

    // DIBUJAR MARCO LATERAL GUINDA (debajo del header)
    pdf.setFillColor(...COLOR_GUINDA);
    pdf.roundedRect(5, 30, 15, ph - 40, 3, 3, 'F');
    
    // TEXTO LATERAL ROTADO
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('SISTEMA DE TRANSPORTE METROPOLITANO', 15, ph - 20, { angle: 90 });

    // FECHA CENTRADA ARRIBA DE LA TABLA
    const tableX = 98;
    const tableW = 171;
    const tableCenterX = tableX + (tableW / 2);
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text(fecha, tableCenterX, 31.5, { align: 'center' });

    // IMÁGENES A LA IZQUIERDA
    const urbanusImg  = await loadImage('/images/urbanu.webp');
    const zafiroImg   = await loadImage('/images/zafirofrenterealista.webp');
    const vagonetaImg = await loadImage('/images/vagoneta frente.webp');
    const orionImg    = await loadImage('/images/orionfrente.webp');

    const totalRows = troncales.length + alimentadoras.length;

    // Altura inicial y márgenes adaptativos según volumen de rutas
    const startY = totalRows > 20 ? 36.5 : 39;

    // Ajuste dinámico de tipografía y paddings según el número de filas totales
    let headPaddingY = 1.3;
    let headFontSize = 14;
    let troncalPaddingY = 1.6;
    let troncalFontSize = 11;
    let alimPaddingY = 1.0;
    let alimFontSize = 9.2;
    let spanOperacionFontSize = 24;
    let spanMantoFontSize = 9.5;
    let spanTotalFontSize = 28;

    if (totalRows > 26) {
        headPaddingY = 0.55;
        headFontSize = 12;
        troncalPaddingY = 0.65;
        troncalFontSize = 8.5;
        alimPaddingY = 0.32;
        alimFontSize = 6.8;
        spanOperacionFontSize = 17;
        spanMantoFontSize = 7.0;
        spanTotalFontSize = 19;
    } else if (totalRows > 20) {
        headPaddingY = 0.75;
        headFontSize = 13;
        troncalPaddingY = 0.9;
        troncalFontSize = 9.2;
        alimPaddingY = 0.45;
        alimFontSize = 7.5;
        spanOperacionFontSize = 19;
        spanMantoFontSize = 8.0;
        spanTotalFontSize = 22;
    } else if (totalRows > 15) {
        headPaddingY = 1.0;
        troncalPaddingY = 1.2;
        troncalFontSize = 10.0;
        alimPaddingY = 0.7;
        alimFontSize = 8.2;
        spanOperacionFontSize = 21;
        spanMantoFontSize = 8.5;
        spanTotalFontSize = 24;
    }

    // TABLA A LA DERECHA
    const head = [
        [
            { 
                content: troncales.length > 0 && alimentadoras.length > 0
                    ? `${troncales.length} SERVICIOS DE TRONCAL /\n${alimentadoras.length} RUTA ALIMENTADORA`
                    : troncales.length > 0
                    ? `${troncales.length} SERVICIOS DE TRONCAL`
                    : `${alimentadoras.length} RUTA ALIMENTADORA`, 
                rowSpan: 2, 
                styles: { halign: 'center', valign: 'middle', fontSize: totalRows > 24 ? 6.5 : 7, fillColor: COLOR_GUINDA, cellPadding: { top: headPaddingY, bottom: headPaddingY } } 
            },
            { content: `N° UNIDADES`, colSpan: 4, styles: { halign: 'center', fontSize: headFontSize, cellPadding: { top: headPaddingY, bottom: headPaddingY } } }
        ],
        [
            { content: 'EN OPERACIÓN', colSpan: 2, styles: { halign: 'center', fillColor: COLOR_GOLD, cellPadding: { top: headPaddingY, bottom: headPaddingY } } },
            { content: 'PATIO TERMINAL\nTÉLLEZ', styles: { halign: 'center', fillColor: COLOR_BEIGE, textColor: COLOR_GUINDA, cellPadding: { top: headPaddingY, bottom: headPaddingY } } },
            { content: 'TOTAL', styles: { halign: 'center', cellPadding: { top: headPaddingY, bottom: headPaddingY } } }
        ]
    ];

    const body = [];
    
    // TRONCALES
    troncales.forEach((item, i) => {
        const row = [
            { content: item.ruta, styles: { halign: 'center', fontStyle: 'bold', fontSize: troncalFontSize, textColor: [0,0,0], cellPadding: { top: troncalPaddingY, bottom: troncalPaddingY, left: 1.5, right: 1.5 } } },
            { content: item.en_operacion, styles: { halign: 'center', textColor: COLOR_GUINDA, fontSize: troncalFontSize, cellPadding: { top: troncalPaddingY, bottom: troncalPaddingY, left: 1.5, right: 1.5 } } }
        ];
        if (i === 0) {
            row.push({ 
                content: `${troncalOperacion}`, 
                rowSpan: Math.max(1, troncales.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: COLOR_GUINDA, fontSize: spanOperacionFontSize, cellPadding: { top: troncalPaddingY, bottom: troncalPaddingY, left: 1, right: 1 } } 
            });
            row.push({ 
                content: `${troncalMantenimiento}\nUNIDADES\nEN MANTENIMIENTO`, 
                rowSpan: Math.max(1, troncales.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: COLOR_GUINDA, fontSize: spanMantoFontSize, cellPadding: { top: troncalPaddingY, bottom: troncalPaddingY, left: 1, right: 1 } } 
            });
            row.push({ 
                content: `${troncalTotal}`, 
                rowSpan: Math.max(1, troncales.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: [0,0,0], fontSize: spanTotalFontSize, cellPadding: { top: troncalPaddingY, bottom: troncalPaddingY, left: 1, right: 1 } } 
            });
        }
        body.push(row);
    });

    // ALIMENTADORAS
    alimentadoras.forEach((item, i) => {
        const row = [
            { content: item.ruta, styles: { halign: 'center', fontStyle: 'bold', fontSize: alimFontSize, textColor: [0,0,0], cellPadding: { top: alimPaddingY, bottom: alimPaddingY, left: 1.5, right: 1.5 } } },
            { content: item.en_operacion, styles: { halign: 'center', textColor: COLOR_GUINDA, fontSize: alimFontSize, cellPadding: { top: alimPaddingY, bottom: alimPaddingY, left: 1.5, right: 1.5 } } }
        ];
        if (i === 0) {
            row.push({ 
                content: `${alimentadoraOperacion}`, 
                rowSpan: Math.max(1, alimentadoras.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: COLOR_GUINDA, fontSize: spanOperacionFontSize, cellPadding: { top: alimPaddingY, bottom: alimPaddingY, left: 1, right: 1 } } 
            });
            row.push({ 
                content: `${alimentadoraMantenimiento}\nUNIDADES\nEN MANTENIMIENTO`, 
                rowSpan: Math.max(1, alimentadoras.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: COLOR_GUINDA, fontSize: spanMantoFontSize, cellPadding: { top: alimPaddingY, bottom: alimPaddingY, left: 1, right: 1 } } 
            });
            row.push({ 
                content: `${alimentadoraTotal}`, 
                rowSpan: Math.max(1, alimentadoras.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: [0,0,0], fontSize: spanTotalFontSize, cellPadding: { top: alimPaddingY, bottom: alimPaddingY, left: 1, right: 1 } } 
            });
        }
        body.push(row);
    });

    let troncalEndY = 0;
    let alimStartY = 0;
    let alimEndY = 0;

    autoTable(pdf, {
        startY: startY,
        margin: { left: 98, right: 10.4, bottom: 6 },
        tableWidth: 171,
        pageBreak: 'avoid',
        head: head,
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: COLOR_GUINDA,
            textColor: COLOR_WHITE,
            fontStyle: 'bold',
            cellPadding: { top: headPaddingY, bottom: headPaddingY, left: 1, right: 1 }
        },
        columnStyles: {
            0: { cellWidth: 42 },
            1: { cellWidth: 16 },
            2: { cellWidth: 26 },
            3: { cellWidth: 54 },
            4: { cellWidth: 33 }
        },
        styles: {
            fontSize: alimFontSize,
            cellPadding: { top: alimPaddingY, bottom: alimPaddingY, left: 1, right: 1 },
            valign: 'middle',
            lineColor: [0, 0, 0],
            lineWidth: 0.5
        },
        alternateRowStyles: {
            fillColor: COLOR_WHITE
        },
        didDrawCell: (data) => {
            if (data.column.index === 0 && data.row.section === 'body') {
                if (data.row.index === troncales.length - 1) {
                    troncalEndY = data.cell.y + data.cell.height;
                }
                if (data.row.index === troncales.length) {
                    alimStartY = data.cell.y;
                }
                if (data.row.index === troncales.length + alimentadoras.length - 1) {
                    alimEndY = data.cell.y + data.cell.height;
                }
            }
        }
    });

    // Garantizar estrictamente 1 sola página: si se generase página extra, limpiarla
    if (pdf.internal.getNumberOfPages() > 1) {
        while (pdf.internal.getNumberOfPages() > 1) {
            pdf.deletePage(pdf.internal.getNumberOfPages());
        }
    }
    pdf.setPage(1);

    const finalTroncalEnd = troncalEndY || (startY + 30);
    const finalAlimStart  = alimStartY || finalTroncalEnd;
    const finalAlimEnd    = alimEndY || (pdf.lastAutoTable ? pdf.lastAutoTable.finalY : 175);

    // Caja 1 (Urbanus) - Alineada con la sección de Troncales
    const c1_x = 23;
    const c1_w = 70;
    const c1_y = startY;
    const c1_h = (finalTroncalEnd - c1_y) - 1.5;

    pdf.setFillColor(...COLOR_BEIGE);
    pdf.roundedRect(c1_x, c1_y, c1_w, c1_h, 5, 5, 'F');

    // Título "RUTA TRONCAL"
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.text('RUTA TRONCAL', c1_x + (c1_w / 2), c1_y + 8, { align: 'center' });

    // Imagen Urbanus
    const c1_imgY = c1_y + 10;
    const c1_imgH = Math.max(10, c1_h - 12);
    const c1_imgW = c1_w - 6;
    drawImageFitted(pdf, urbanusImg, c1_x + 3, c1_imgY, c1_imgW, c1_imgH);

    // Caja 2 (Alimentadoras) - Alineada con la sección de Alimentadoras
    const c2_x = 23;
    const c2_w = 70;
    const c2_y = finalAlimStart + 1.5;
    const c2_h = finalAlimEnd - c2_y;

    pdf.setFillColor(...COLOR_BEIGE);
    pdf.roundedRect(c2_x, c2_y, c2_w, c2_h, 5, 5, 'F');

    // Título "RUTA ALIMENTADORA"
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.text('RUTA ALIMENTADORA', c2_x + (c2_w / 2), c2_y + 8, { align: 'center' });

    // Imágenes Alimentadoras (Pirámide: Zafiro arriba; Vagoneta y Orión abajo lado a lado)
    const c2_availY = c2_y + 10;
    const c2_availH = Math.max(20, c2_h - 12);
    const c2_availW = c2_w - 6; // 64mm

    const gapY = 2.5;
    const rowH = (c2_availH - gapY) / 2;

    // Nivel 1: Zafiro centrado
    drawImageFitted(pdf, zafiroImg, c2_x + 3, c2_availY, c2_availW, rowH);

    // Nivel 2: Vagoneta a la izquierda, Orión a la derecha
    const gapX = 3;
    const colW = (c2_availW - gapX) / 2;
    const row2Y = c2_availY + rowH + gapY;

    drawImageFitted(pdf, vagonetaImg, c2_x + 3, row2Y, colW, rowH);
    drawImageFitted(pdf, orionImg, c2_x + 3 + colW + gapX, row2Y, colW, rowH);

    pdf.save(`Reporte_Rutas_${new Date().toISOString().slice(0,10)}.pdf`);
};
