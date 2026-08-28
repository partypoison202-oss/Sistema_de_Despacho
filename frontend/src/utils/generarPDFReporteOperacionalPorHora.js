import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLOR_GUINDA     = [96, 26, 42]; 
const COLOR_GOLD       = [197, 160, 89];
const COLOR_BEIGE      = [224, 211, 187];
const COLOR_WHITE      = [255, 255, 255];
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

export const generarPDFReporteOperacionalPorHora = async (data) => {
    if (!data || !data.length) {
        throw new Error("No hay datos para generar el reporte.");
    }

    // Clasificar datos
    const getEstatus = (d) => (d.ESTATUS || '').toUpperCase().trim();
    const getTipo = (d) => (d.TIPO_DE_UNIDAD || '').toUpperCase().trim();

    const techNames = ['URBANUSS', 'ZAFIRO', 'VAGONETA', 'ORION'];
    const unidadesPorTecnologia = {
        'URBANUSS': { flota: 0, taller: [], reserva: [], desincorporada: [] },
        'ZAFIRO': { flota: 0, taller: [], reserva: [], desincorporada: [] },
        'VAGONETA': { flota: 0, taller: [], reserva: [], desincorporada: [] },
        'ORION': { flota: 0, taller: [], reserva: [], desincorporada: [] }
    };

    let totalFlota = 0;
    
    data.forEach(unit => {
        const tipo = getTipo(unit);
        let techKey = null;
        if (tipo.includes('URBANUS')) techKey = 'URBANUSS';
        else if (tipo.includes('ZAFIRO')) techKey = 'ZAFIRO';
        else if (tipo.includes('VAGONETA')) techKey = 'VAGONETA';
        else if (tipo.includes('ORION') || tipo.includes('ORIÓN')) techKey = 'ORION';

        if (techKey) {
            unidadesPorTecnologia[techKey].flota++;
            totalFlota++;

            const estatus = getEstatus(unit);
            if (estatus.includes('MANTENIMIENTO')) {
                unidadesPorTecnologia[techKey].taller.push(unit);
            } else if (estatus.includes('RESERVA')) {
                unidadesPorTecnologia[techKey].reserva.push(unit);
            } else if (estatus.includes('DESINCORPORADA')) {
                unidadesPorTecnologia[techKey].desincorporada.push(unit);
            }
        }
    });

    const now = new Date();
    const fechaStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).replace('.', '');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const pw = pdf.internal.pageSize.getWidth();
    
    // ==========================================
    // 1. BANNER INSTITUCIONAL Y ENCABEZADOS
    // ==========================================
    pdf.setFillColor(...COLOR_GUINDA);
    pdf.rect(0, 0, pw, 18, 'F');
    
    // Logo 1
    const logoImg = await loadImage('/images/sistema_de_tm.webp');
    if (logoImg) {
        const canvas = document.createElement('canvas');
        canvas.width = logoImg.width; canvas.height = logoImg.height;
        canvas.getContext('2d').drawImage(logoImg, 0, 0);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 5, 2, 40, 14);
    }
    
    // Logo 2 (Opcional - usamos los que suelen estar disponibles si existen)
    const sitmahImg = await loadImage('/images/sitmah-logo.png');
    if (sitmahImg) {
        const canvas = document.createElement('canvas');
        canvas.width = sitmahImg.width; canvas.height = sitmahImg.height;
        canvas.getContext('2d').drawImage(sitmahImg, 0, 0);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', pw - 70, 2, 25, 12);
    }

    const hgoImg = await loadImage('/images/stmhidalgo.png');
    if (hgoImg) {
        const canvas = document.createElement('canvas');
        canvas.width = hgoImg.width; canvas.height = hgoImg.height;
        canvas.getContext('2d').drawImage(hgoImg, 0, 0);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', pw - 40, 2, 35, 14);
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(...COLOR_WHITE);
    pdf.text('ESTATUS OPERATIVO POR HORA', 55, 12);

    // Barra dorada
    pdf.setFillColor(...COLOR_GOLD);
    pdf.rect(0, 18, pw, 6, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.text('Seguimiento de parque vehicular — Patio | Taller | Reserva | Desincorporadas', pw / 2, 22, { align: 'center' });

    // Barra de Fecha / Hora / Flota
    pdf.setFillColor(...COLOR_GUINDA);
    pdf.rect(0, 26, pw, 6, 'F');
    pdf.setTextColor(...COLOR_WHITE);
    pdf.text('FECHA', pw * 0.15, 30, { align: 'center' });
    pdf.text('HORA DE CORTE', pw * 0.5, 30, { align: 'center' });
    pdf.text('FLOTA TOTAL', pw * 0.85, 30, { align: 'center' });

    pdf.setFillColor(...COLOR_LIGHT_GRAY);
    pdf.rect(0, 32, pw, 8, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.text(fechaStr, pw * 0.15, 37, { align: 'center' });
    pdf.text(horaStr, pw * 0.5, 37, { align: 'center' });
    pdf.text(totalFlota.toString(), pw * 0.85, 37, { align: 'center' });

    // ==========================================
    // 2. TABLAS RESUMEN
    // ==========================================
    const startY = 44;
    
    // Calcular totales para las tablas resumen
    let totalPatio = 0, totalTaller = 0, totalReserva = 0, totalDesinc = 0;
    techNames.forEach(t => {
        const d = unidadesPorTecnologia[t];
        const patio = d.taller.length + d.reserva.length + d.desincorporada.length;
        totalPatio += patio;
        totalTaller += d.taller.length;
        totalReserva += d.reserva.length;
        totalDesinc += d.desincorporada.length;
    });

    // Helper for percentage
    const getPct = (val, tot) => tot > 0 ? ((val / tot) * 100).toFixed(1) + '%' : '0.0%';

    // Tabla 1: Patio
    const bodyPatio = techNames.map(t => {
        const d = unidadesPorTecnologia[t];
        const patio = d.taller.length + d.reserva.length + d.desincorporada.length;
        return [t, d.flota, patio, getPct(patio, d.flota)];
    });
    bodyPatio.push(['TOTAL', totalFlota, totalPatio, getPct(totalPatio, totalFlota)]);

    autoTable(pdf, {
        startY: startY,
        margin: { left: 5 },
        tableWidth: 80,
        head: [['UNIDADES EN PATIO POR TECNOLOGÍA'], ['Tecnología', 'Flota', 'En patio', '% Patio']],
        body: bodyPatio,
        theme: 'grid',
        styles: { fontSize: 8, halign: 'center' },
        headStyles: { fillColor: COLOR_GUINDA, textColor: COLOR_WHITE },
        didParseCell: (data) => {
            if (data.row.index === 0 && data.section === 'head') {
                data.cell.colSpan = 4;
            }
            if (data.row.index === bodyPatio.length - 1 && data.section === 'body') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = COLOR_BEIGE;
                data.cell.styles.textColor = COLOR_GUINDA;
            } else if (data.row.index >= 0 && data.section === 'body' && data.column.index === 3) {
                data.cell.styles.fillColor = COLOR_GUINDA;
                data.cell.styles.textColor = COLOR_WHITE;
            }
        }
    });

    // Tabla 2: Taller Clasificación
    // Como no tenemos clasificación explícita, asumimos todo como Correctivo por defecto
    const bodyTaller = [
        ['Preventivo', 0, '0.0%'],
        ['Correctivo', totalTaller, getPct(totalTaller, totalFlota)],
        ['En diagnóstico', 0, '0.0%'],
        ['TOTAL', totalTaller, getPct(totalTaller, totalFlota)]
    ];

    autoTable(pdf, {
        startY: startY,
        margin: { left: 88 },
        tableWidth: 55,
        head: [['UNIDADES EN TALLER'], ['Clasificación', 'Cantidad', '% Flota']],
        body: bodyTaller,
        theme: 'grid',
        styles: { fontSize: 8, halign: 'center' },
        headStyles: { fillColor: COLOR_GUINDA, textColor: COLOR_WHITE },
        didParseCell: (data) => {
            if (data.row.index === 0 && data.section === 'head') data.cell.colSpan = 3;
            if (data.row.index === bodyTaller.length - 1 && data.section === 'body') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = COLOR_BEIGE;
                data.cell.styles.textColor = COLOR_GUINDA;
            } else if (data.row.index >= 0 && data.section === 'body' && data.column.index === 2) {
                data.cell.styles.fillColor = COLOR_GUINDA;
                data.cell.styles.textColor = COLOR_WHITE;
            }
        }
    });

    // Tabla 3 y 4 combinadas visualmente (Reserva y Desincorporadas)
    const bodyReservaDesinc = techNames.map(t => {
        const d = unidadesPorTecnologia[t];
        return [t, d.reserva.length, getPct(d.reserva.length, d.flota), t, d.desincorporada.length, getPct(d.desincorporada.length, d.flota)];
    });
    bodyReservaDesinc.push(['TOTAL', totalReserva, getPct(totalReserva, totalFlota), 'TOTAL', totalDesinc, getPct(totalDesinc, totalFlota)]);

    autoTable(pdf, {
        startY: startY,
        margin: { left: 146 },
        tableWidth: pw - 151,
        head: [
            [{ content: 'UNIDADES DE RESERVA', colSpan: 3 }, { content: 'DESINCORPORADAS POR ITINERARIO', colSpan: 3 }],
            ['Tecnología', 'Cantidad', '% Flota', 'Tecnología', 'Cantidad', '% Flota']
        ],
        body: bodyReservaDesinc,
        theme: 'grid',
        styles: { fontSize: 8, halign: 'center' },
        headStyles: { fillColor: COLOR_GUINDA, textColor: COLOR_WHITE },
        didParseCell: (data) => {
            if (data.row.index === bodyReservaDesinc.length - 1 && data.section === 'body') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = COLOR_BEIGE;
                data.cell.styles.textColor = COLOR_GUINDA;
            } else if (data.row.index >= 0 && data.section === 'body' && (data.column.index === 2 || data.column.index === 5)) {
                data.cell.styles.fillColor = COLOR_GUINDA;
                data.cell.styles.textColor = COLOR_WHITE;
            }
        }
    });

    // ==========================================
    // 3. CAJAS DE INDICADORES GRANDES
    // ==========================================
    const boxesY = pdf.lastAutoTable.finalY + 4;
    const boxWidth = (pw - 20) / 4;
    const boxNames = ['UNIDADES EN PATIO', 'UNIDADES EN TALLER', 'RESERVA', 'DESINCORPORADAS'];
    const boxValues = [
        { count: totalPatio, pct: getPct(totalPatio, totalFlota) },
        { count: totalTaller, pct: getPct(totalTaller, totalFlota) },
        { count: totalReserva, pct: getPct(totalReserva, totalFlota) },
        { count: totalDesinc, pct: getPct(totalDesinc, totalFlota) }
    ];

    boxNames.forEach((name, i) => {
        const x = 5 + (i * (boxWidth + 3));
        pdf.setFillColor(...COLOR_GUINDA);
        pdf.rect(x, boxesY, boxWidth, 6, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(name, x + boxWidth / 2, boxesY + 4, { align: 'center' });

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, boxesY + 6, boxWidth, 12, 'FD');
        
        pdf.setTextColor(...COLOR_GUINDA);
        pdf.setFontSize(18);
        pdf.text(boxValues[i].count.toString(), x + boxWidth * 0.3, boxesY + 14, { align: 'center' });
        
        pdf.setTextColor(...COLOR_GOLD);
        pdf.setFontSize(16);
        pdf.text(boxValues[i].pct, x + boxWidth * 0.7, boxesY + 14, { align: 'center' });
    });

    // ==========================================
    // 4. TABLAS DE DETALLE (TALLER Y RESERVA)
    // ==========================================
    const detailStartY = boxesY + 22;

    // Helper para formatear falla
    const getFalla = (u) => (u.falla || u.motivo_estatus || u.motivo || 'SIN DETALLE').toUpperCase();

    // Tabla Detalles Taller
    const maxTallerRows = Math.max(...techNames.map(t => unidadesPorTecnologia[t].taller.length));
    const bodyDetalleTaller = [];
    for (let i = 0; i < maxTallerRows; i++) {
        const row = [];
        techNames.forEach(t => {
            const unit = unidadesPorTecnologia[t].taller[i];
            if (unit) {
                row.push(unit.numero_eco, getFalla(unit));
            } else {
                row.push('', '');
            }
        });
        bodyDetalleTaller.push(row);
    }
    if (bodyDetalleTaller.length === 0) {
        bodyDetalleTaller.push(['', '', '', '', '', '', '', '']);
    }

    autoTable(pdf, {
        startY: detailStartY,
        margin: { left: 5, right: 5 },
        head: [
            [{ content: 'UNIDADES EN TALLER', colSpan: 8, styles: { fillColor: COLOR_GUINDA, textColor: COLOR_WHITE, halign: 'center', fontSize: 10 } }],
            [
                { content: 'URBANUSS', colSpan: 2 },
                { content: 'ZAFIRO', colSpan: 2 },
                { content: 'VAGONETA', colSpan: 2 },
                { content: 'ORION', colSpan: 2 }
            ]
        ],
        body: bodyDetalleTaller,
        theme: 'grid',
        styles: { fontSize: 7, halign: 'center', cellPadding: 1, textColor: [0, 0, 0] },
        headStyles: { fillColor: COLOR_LIGHT_GRAY, textColor: [0, 0, 0], halign: 'center' },
        columnStyles: {
            0: { cellWidth: 15 }, 1: { cellWidth: 'auto' },
            2: { cellWidth: 15 }, 3: { cellWidth: 'auto' },
            4: { cellWidth: 15 }, 5: { cellWidth: 'auto' },
            6: { cellWidth: 15 }, 7: { cellWidth: 'auto' }
        }
    });

    // Tabla Detalles Reserva
    const maxReservaRows = Math.max(
        Math.ceil(unidadesPorTecnologia['URBANUSS'].reserva.length / 2),
        Math.ceil(unidadesPorTecnologia['ZAFIRO'].reserva.length / 2),
        Math.ceil(unidadesPorTecnologia['VAGONETA'].reserva.length / 2),
        Math.ceil(unidadesPorTecnologia['ORION'].reserva.length / 2)
    ) || 1;

    const bodyDetalleReserva = [];
    for (let i = 0; i < maxReservaRows; i++) {
        const row = [];
        techNames.forEach(t => {
            const u1 = unidadesPorTecnologia[t].reserva[i * 2];
            const u2 = unidadesPorTecnologia[t].reserva[i * 2 + 1];
            row.push(u1 ? u1.numero_eco : '', u2 ? u2.numero_eco : '');
        });
        bodyDetalleReserva.push(row);
    }

    autoTable(pdf, {
        startY: pdf.lastAutoTable.finalY,
        margin: { left: 5, right: 5 },
        head: [
            [{ content: 'UNIDADES EN RESERVA', colSpan: 8, styles: { fillColor: COLOR_GOLD, textColor: COLOR_WHITE, halign: 'center', fontSize: 10 } }]
        ],
        body: bodyDetalleReserva,
        theme: 'grid',
        styles: { fontSize: 8, halign: 'center', cellPadding: 1, textColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 'auto' }, 1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' }, 3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' }, 5: { cellWidth: 'auto' },
            6: { cellWidth: 'auto' }, 7: { cellWidth: 'auto' }
        }
    });

    pdf.save(`Reporte_Operacional_Hora_${fechaStr.replace(/\//g, '-')}_${horaStr}.pdf`);
};
