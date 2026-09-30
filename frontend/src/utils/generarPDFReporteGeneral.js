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

export const generarPDFReporteGeneral = async (data) => {
    if (!data || !data.length) {
        throw new Error("No hay datos para generar el reporte.");
    }

    const troncales = data.filter(item => ['T-01', 'T-02', 'T-04', 'T-05', 'T-SIN ASIGNAR'].includes(item.ruta) && (item.en_operacion > 0 || item.en_mantenimiento > 0 || item.ruta !== 'T-SIN ASIGNAR'));
    const alimentadoras = data.filter(item => (item.ruta.startsWith('RA') || item.ruta.startsWith('ORION')) && (item.en_operacion > 0 || item.en_mantenimiento > 0 || item.ruta !== 'RA-SIN ASIGNAR'));

    const troncalOperacion     = troncales.reduce((s, r) => s + Number(r.en_operacion), 0);
    const troncalMantenimiento = troncales.reduce((s, r) => s + Number(r.en_mantenimiento), 0);
    const troncalTotal         = troncalOperacion + troncalMantenimiento;

    const alimentadoraOperacion     = alimentadoras.reduce((s, r) => s + Number(r.en_operacion), 0);
    const alimentadoraMantenimiento = alimentadoras.reduce((s, r) => s + Number(r.en_mantenimiento), 0);
    const alimentadoraTotal         = alimentadoraOperacion + alimentadoraMantenimiento;

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

    // FECHA ARRIBA A LA DERECHA
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.setFontSize(16);
    pdf.text(fecha, pw - 10, 35, { align: 'right' });

    // IMÁGENES A LA IZQUIERDA (Perfiles laterales)
    const urbanusImg = await loadImage('/images/urbanu.webp');
    const zafiroImg = await loadImage('/images/alimentadora.webp');

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
                styles: { halign: 'center', valign: 'middle', fontSize: 7, fillColor: COLOR_GUINDA } 
            },
            { content: `N° UNIDADES`, colSpan: 4, styles: { halign: 'center', fontSize: 15 } }
        ],
        [
            { content: 'EN OPERACIÓN', colSpan: 2, styles: { halign: 'center', fillColor: COLOR_GOLD } },
            { content: 'PATIO TERMINAL\nTÉLLEZ', styles: { halign: 'center', fillColor: COLOR_BEIGE, textColor: COLOR_GUINDA } },
            { content: 'TOTAL', styles: { halign: 'center' } }
        ]
    ];

    const body = [];
    
    // TRONCALES
    troncales.forEach((item, i) => {
        const row = [
            { content: item.ruta, styles: { halign: 'center', fontStyle: 'bold', fontSize: 11.5, textColor: [0,0,0], cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 } } },
            { content: item.en_operacion, styles: { halign: 'center', textColor: COLOR_GUINDA, fontSize: 11, cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 } } }
        ];
        if (i === 0) {
            row.push({ 
                content: `${troncalOperacion}`, 
                rowSpan: Math.max(1, troncales.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: COLOR_GUINDA, fontSize: 24 } 
            });
            row.push({ 
                content: `${troncalMantenimiento}\nUNIDADES\nEN MANTENIMIENTO`, 
                rowSpan: Math.max(1, troncales.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: COLOR_GUINDA, fontSize: 9.5 } 
            });
            row.push({ 
                content: `${troncalTotal}`, 
                rowSpan: Math.max(1, troncales.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: [0,0,0], fontSize: 28 } 
            });
        }
        body.push(row);
    });

    const alimPaddingY = alimentadoras.length > 12 ? 0.8 : 1.1;
    const alimFontSize = alimentadoras.length > 12 ? 8.5 : 9.5;

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
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: COLOR_GUINDA, fontSize: 24 } 
            });
            row.push({ 
                content: `${alimentadoraMantenimiento}\nUNIDADES\nEN MANTENIMIENTO`, 
                rowSpan: Math.max(1, alimentadoras.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: COLOR_GUINDA, fontSize: 9.5 } 
            });
            row.push({ 
                content: `${alimentadoraTotal}`, 
                rowSpan: Math.max(1, alimentadoras.length), 
                styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', textColor: [0,0,0], fontSize: 28 } 
            });
        }
        body.push(row);
    });

    let troncalEndY = 0;
    let alimStartY = 0;
    let alimEndY = 0;

    autoTable(pdf, {
        startY: 40,
        margin: { left: 98, right: 10.4, bottom: 8 },
        tableWidth: 171,
        pageBreak: 'avoid',
        head: head,
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: COLOR_GUINDA,
            textColor: COLOR_WHITE,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 42 },
            1: { cellWidth: 16 },
            2: { cellWidth: 26 },
            3: { cellWidth: 54 },
            4: { cellWidth: 33 }
        },
        styles: {
            fontSize: 9,
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

    const finalTroncalEnd = troncalEndY || 102;
    const finalAlimStart  = alimStartY || finalTroncalEnd;
    const finalAlimEnd    = alimEndY || (pdf.lastAutoTable ? pdf.lastAutoTable.finalY : 175);

    // Caja 1 (Urbanus) - Alineada con la sección de Troncales
    const c1_x = 23;
    const c1_w = 70;
    const c1_y = 40;
    const c1_h = (finalTroncalEnd - c1_y) - 1.5;

    pdf.setFillColor(...COLOR_BEIGE);
    pdf.roundedRect(c1_x, c1_y, c1_w, c1_h, 5, 5, 'F');
    if (urbanusImg && (urbanusImg.naturalWidth > 0 || urbanusImg.width > 0)) {
        const canvas = document.createElement('canvas');
        canvas.width  = urbanusImg.naturalWidth  || urbanusImg.width;
        canvas.height = urbanusImg.naturalHeight || urbanusImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(urbanusImg, 0, 0);
        
        const maxW = c1_w - 6;
        const maxH = Math.max(10, c1_h - 10);
        const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
        const drawW = canvas.width * ratio;
        const drawH = canvas.height * ratio;
        const x = c1_x + (c1_w - drawW) / 2;
        const y = c1_y + (c1_h - drawH) / 2;
        
        if (drawW > 0 && drawH > 0) {
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawW, drawH);
        }
    }

    // Caja 2 (Alimentadoras) - Alineada con la sección de Alimentadoras
    const c2_x = 23;
    const c2_w = 70;
    const c2_y = finalAlimStart + 1.5;
    const c2_h = finalAlimEnd - c2_y;

    pdf.roundedRect(c2_x, c2_y, c2_w, c2_h, 5, 5, 'F');
    if (zafiroImg && (zafiroImg.naturalWidth > 0 || zafiroImg.width > 0)) {
        const canvas = document.createElement('canvas');
        canvas.width  = zafiroImg.naturalWidth  || zafiroImg.width;
        canvas.height = zafiroImg.naturalHeight || zafiroImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(zafiroImg, 0, 0);
        
        const maxW = c2_w - 6;
        const maxH = Math.max(10, c2_h - 10);
        const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
        const drawW = canvas.width * ratio;
        const drawH = canvas.height * ratio;
        const x = c2_x + (c2_w - drawW) / 2;
        const y = c2_y + (c2_h - drawH) / 2;
        
        if (drawW > 0 && drawH > 0) {
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawW, drawH);
        }
    }

    pdf.save(`Reporte_Rutas_${new Date().toISOString().slice(0,10)}.pdf`);
};
