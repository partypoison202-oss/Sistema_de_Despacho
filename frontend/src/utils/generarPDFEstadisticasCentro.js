import jsPDF from 'jspdf';

const COLOR_GUINDA = [96, 26, 42]; 
const COLOR_WHITE  = [255, 255, 255];
const COLOR_GREEN  = [22, 163, 74];
const COLOR_GOLD   = [180, 83, 9];
const COLOR_RED    = [220, 38, 38];
const COLOR_BLUE   = [37, 99, 235];
const COLOR_GRAY   = [107, 114, 128];
const COLOR_LIGHT_GRAY = [243, 244, 246];

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

const getModelColor = (modelId) => {
    switch(modelId?.toUpperCase()) {
        case 'URBANUS': return COLOR_GUINDA;
        case 'ZAFIRO': return COLOR_GOLD;
        case 'VAGONETA': return COLOR_GREEN;
        case 'ORION': return COLOR_BLUE;
        default: return COLOR_GRAY;
    }
};

export const generarPDFEstadisticasCentro = async (totales, modelData, eficienciaGlobal) => {
    if (!totales || !modelData) {
        throw new Error("No hay datos para generar el reporte.");
    }

    const fecha = new Date().toLocaleDateString('es-MX', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).toUpperCase();

    // Portrait to match standard Letter size sheet
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
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
    pdf.text('ESTADÍSTICAS DEL CENTRO DE CONTROL', pw - 10, 16, { align: 'right' });

    // FECHA ARRIBA A LA DERECHA
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.setFontSize(12);
    pdf.text(fecha, pw - 10, 32, { align: 'right' });

    // 2. KPIs GLOBALES (6 Cajas)
    let currentY = 38;
    const marginX = 10;
    const totalW = pw - marginX * 2;
    const gap = 3;
    const boxWidth = (totalW - (gap * 5)) / 6;
    const boxHeight = 24;
    
    const kpis = [
        { label: 'TOTAL PROGRAMADAS', value: totales.programadas, color: COLOR_GUINDA },
        { label: 'EN OPERACIÓN', value: totales.circulando ?? totales.operacion, color: COLOR_GREEN },
        { label: 'EN RESERVA', value: totales.reserva, color: COLOR_GOLD },
        { label: 'EN MANTENIMIENTO', value: totales.mantenimiento, color: COLOR_RED },
        { label: 'EN PERCANCE', value: totales.percance ?? 0, color: [225, 29, 72] },
        { label: 'EFICIENCIA OPERATIVA', value: `${eficienciaGlobal}%`, color: COLOR_GOLD, bg: [254, 243, 199] }
    ];

    kpis.forEach((kpi, i) => {
        const x = marginX + (boxWidth + gap) * i;
        
        // Sombra / Borde de la tarjeta
        pdf.setDrawColor(229, 231, 235); // gray-200
        pdf.setFillColor(...(kpi.bg || [255, 255, 255]));
        pdf.roundedRect(x, currentY, boxWidth, boxHeight, 3, 3, kpi.bg ? 'FD' : 'D');
        
        // Franja lateral de color
        pdf.setFillColor(...kpi.color);
        pdf.roundedRect(x - 0.5, currentY + 1, 2.5, boxHeight - 2, 1, 1, 'F');
        
        // Valor
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(...kpi.color);
        pdf.text(String(kpi.value), x + (boxWidth / 2) + 1, currentY + 12, { align: 'center' });

        // Etiqueta
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(5.2);
        pdf.setTextColor(...(kpi.bg ? kpi.color : COLOR_GRAY));
        pdf.text(kpi.label, x + (boxWidth / 2) + 1, currentY + 19, { align: 'center' });
    });

    currentY += 32;

    // Título sección
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.text('|', marginX, currentY);
    pdf.setTextColor(31, 41, 55); // gray-800
    pdf.text('Desglose por tipo de unidad', marginX + 4, currentY);

    currentY += 6;

    // 3. DESGLOSE POR TIPO DE UNIDAD (Grid 2x2)
    const cardGapX = 8;
    const cardGapY = 10;
    const cardWidth = (totalW - cardGapX) / 2;
    const cardHeight = 72;

    // Cargar las imágenes de los modelos concurrentemente
    const images = {};
    for (const m of modelData) {
        images[m.id] = await loadImage(m.image);
    }

    modelData.forEach((m, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = marginX + (cardWidth + cardGapX) * col;
        const y = currentY + (cardHeight + cardGapY) * row;
        
        const mainColor = getModelColor(m.id);

        // Card Outline
        pdf.setDrawColor(229, 231, 235);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

        // Top Color Border (Thick, rounded top corners)
        pdf.setFillColor(...mainColor);
        pdf.roundedRect(x, y, cardWidth, 4, 3, 3, 'F');
        pdf.rect(x, y + 2, cardWidth, 2, 'F'); // Square off bottom corners

        // Image (preservando relación de aspecto)
        const img = images[m.id];
        if (img && (img.naturalWidth > 0 || img.width > 0)) {
            const canvas = document.createElement('canvas');
            canvas.width  = img.naturalWidth  || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const maxW = 16;
            const maxH = 12;
            const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
            const drawW = canvas.width * ratio;
            const drawH = canvas.height * ratio;
            
            const imgX = x + 6 + (maxW - drawW) / 2;
            const imgY = y + 4 + (maxH - drawH) / 2;
            
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', imgX, imgY, drawW, drawH);
        }

        // Title and Subtitle
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(17, 24, 39); // gray-900
        pdf.text(m.label, x + 26, y + 9);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...COLOR_GRAY);
        pdf.text(`${m.total ?? m.units?.length ?? m.programadas} unidades`, x + 26, y + 14);

        // Segmented Bar (Operacion, Reserva, Mantenimiento, Percance)
        const barY = y + 20;
        const barX = x + 8;
        const barW = cardWidth - 16;
        const barH = 4;
        
        pdf.setFillColor(229, 231, 235); // fondo gris por si falta
        pdf.roundedRect(barX, barY, barW, barH, 2, 2, 'F');

        let currentBarX = barX;
        const activeSegments = [];
        if (m.operacion > 0) activeSegments.push({ val: m.operacion, color: COLOR_GREEN });
        if (m.reserva > 0) activeSegments.push({ val: m.reserva, color: COLOR_GOLD });
        if (m.mantenimiento > 0) activeSegments.push({ val: m.mantenimiento, color: COLOR_RED });
        if ((m.percance || 0) > 0) activeSegments.push({ val: m.percance, color: [225, 29, 72] });

        // Calculamos el divisor seguro
        const divisor = (m.total || m.programadas) > 0 ? (m.total || m.programadas) : (m.operacion + m.reserva + m.mantenimiento + (m.percance || 0));

        activeSegments.forEach((seg, i) => {
            const segW = divisor > 0 ? (seg.val / divisor) * barW : 0;
            
            if (segW > 0) {
                const isFirst = i === 0;
                const isLast = i === activeSegments.length - 1;
                
                pdf.setFillColor(...seg.color);
                pdf.roundedRect(currentBarX, barY, segW, barH, 2, 2, 'F');
                
                if (!isFirst) pdf.rect(currentBarX, barY, 2, barH, 'F');
                if (!isLast) pdf.rect(currentBarX + segW - 2, barY, 2, barH, 'F');
                
                currentBarX += segW;
            }
        });

        // List Rows
        const pct = (val) => (m.total || m.programadas) > 0 ? Math.round((val / (m.total || m.programadas)) * 100) : 0;
        const eficiencia = (m.operacion || m.programadas) > 0 ? Math.min(100, Math.round(((m.circulando || 0) / (m.operacion || m.programadas)) * 100)) : 0;

        const rows = [
            { label: 'Operación', val: m.operacion, p: pct(m.operacion), color: COLOR_GREEN, bg: [220, 252, 231] },
            { label: 'Reserva', val: m.reserva, p: pct(m.reserva), color: COLOR_GOLD, bg: [254, 243, 199] },
            { label: 'Mantenimiento', val: m.mantenimiento, p: pct(m.mantenimiento), color: COLOR_RED, bg: [254, 226, 226] },
            { label: 'Percance', val: m.percance || 0, p: pct(m.percance || 0), color: [225, 29, 72], bg: [255, 228, 230] },
            { label: 'Eficiencia', val: null, p: eficiencia, color: COLOR_GOLD, bg: [254, 243, 199], isEficiencia: true }
        ];

        let rowY = y + 31;
        rows.forEach(r => {
            pdf.setDrawColor(243, 244, 246);
            pdf.line(x + 8, rowY - 3.5, x + cardWidth - 8, rowY - 3.5);

            // Dot
            pdf.setFillColor(...r.color);
            pdf.circle(x + 10, rowY - 1, 1.3, 'F');

            // Label
            pdf.setFont('helvetica', r.isEficiencia ? 'bold' : 'normal');
            pdf.setFontSize(7.5);
            pdf.setTextColor(...(r.isEficiencia ? r.color : COLOR_GRAY));
            pdf.text(r.label, x + 14, rowY);

            // Badge %
            const badgeW = 10;
            const badgeH = 4;
            pdf.setFillColor(...r.bg);
            pdf.roundedRect(x + cardWidth - 28, rowY - 3.2, badgeW, badgeH, 2, 2, 'F');
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6);
            pdf.setTextColor(...r.color);
            pdf.text(`${r.p}%`, x + cardWidth - 23, rowY - 0.3, { align: 'center' });

            // Value
            if (r.val !== null) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(8.5);
                pdf.setTextColor(17, 24, 39);
                pdf.text(String(r.val), x + cardWidth - 10, rowY, { align: 'right' });
            }

            rowY += 7.5;
        });
    });

    pdf.save(`Reporte_Estadisticas_Centro_${new Date().toISOString().slice(0,10)}.pdf`);
};
