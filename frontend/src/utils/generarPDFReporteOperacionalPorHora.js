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
            const estatus = getEstatus(unit);
            const isNoProgramada = estatus === 'NO_PROGRAMADA' || estatus === 'NO PROGRAMADA' || estatus.includes('ENCIERRO OPERATIVO') || estatus.includes('INTERMEDIA');

            // No contemplamos las que no están programadas (o encierros que no cuentan como flota real del día)
            if (isNoProgramada) return;

            // Se suma a la flota total
            unidadesPorTecnologia[techKey].flota++;
            totalFlota++;

            // Clasificación dentro de patio
            const isMantenimiento = estatus.includes('MANTENIMIENTO');
            const isItinerario = estatus.includes('ITINERARIO') || estatus.includes('DESINCORPORADA') || estatus.includes('PERCANCE');
            const isReserva = estatus.includes('RESERVA') && !estatus.includes('INTERMEDIA');

            if (isMantenimiento) {
                unidadesPorTecnologia[techKey].taller.push(unit);
            } else if (isItinerario) {
                unidadesPorTecnologia[techKey].desincorporada.push(unit);
            } else if (isReserva) {
                unidadesPorTecnologia[techKey].reserva.push(unit);
            }
        }
    });

    let totalPatio = 0, totalTaller = 0, totalReserva = 0, totalDesinc = 0;
    techNames.forEach(t => {
        const d = unidadesPorTecnologia[t];
        const patio = d.taller.length + d.reserva.length + d.desincorporada.length;
        totalPatio += patio;
        totalTaller += d.taller.length;
        totalReserva += d.reserva.length;
        totalDesinc += d.desincorporada.length;
    });

    const now = new Date();
    const fechaStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const pw = pdf.internal.pageSize.getWidth();
    
    // ==========================================
    // 1. BANNER INSTITUCIONAL Y ENCABEZADOS
    // ==========================================
    pdf.setFillColor(...COLOR_GUINDA);
    pdf.rect(0, 0, pw, 22, 'F');
    
    // Logo STM (Izquierda)
    try {
        const logoImg = await loadImage('/images/sistema_de_tm.webp');
        if (logoImg) {
            const canvas = document.createElement('canvas');
            canvas.width = logoImg.width; canvas.height = logoImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(logoImg, 0, 0);
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 5, 2, 45, 18);
        }
    } catch(e) {}
    
    // Logo Hidalgo (Derecha)
    try {
        const hgoImg = await loadImage('/images/escudo_hidalgo.png');
        if (hgoImg) {
            const canvas = document.createElement('canvas');
            canvas.width = hgoImg.width; canvas.height = hgoImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(hgoImg, 0, 0);
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', pw - 25, 2, 20, 20);
        }
    } catch(e) {}

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...COLOR_WHITE);
    pdf.text('ESTATUS OPERATIVO POR HORA', pw / 2, 8, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text('SEGUIMIENTO A PARQUE VEHICULAR - PATIO | MANTENIMIENTO | RESERVA | ITINERARIO', pw / 2, 16, { align: 'center' });

    // Barra Beige de Fecha
    pdf.setFillColor(...COLOR_BEIGE);
    pdf.rect(0, 22, pw, 10, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.text(`FECHA: ${fechaStr}`, pw - 5, 26, { align: 'right' });
    pdf.text(`HORA DE CORTE:`, pw - 45, 30, { align: 'right' });
    pdf.text(`${horaStr}`, pw - 15, 30, { align: 'right' });

    // ==========================================
    // 2. TARJETAS DE INDICADORES (4 COLUMNAS)
    // ==========================================
    const margin = 10;
    const gap = 5;
    const colW = (pw - (margin * 2) - (gap * 3)) / 4;
    let startY = 36;

    const cards = [
        { title: 'UNIDADES EN PATIO', count: totalPatio, pctDenominator: totalFlota },
        { title: 'MANTENIMIENTO', count: totalTaller, pctDenominator: totalPatio },
        { title: 'RESERVA', count: totalReserva, pctDenominator: totalPatio },
        { title: 'ITINERARIO', count: totalDesinc, pctDenominator: totalPatio }
    ];

    const getPct = (val, den) => den > 0 ? ((val / den) * 100).toFixed(1) + '%' : '0.0%';

    cards.forEach((c, i) => {
        const x = margin + (colW + gap) * i;
        
        pdf.setFillColor(...COLOR_GUINDA);
        pdf.rect(x, startY, colW, 7, 'F');
        pdf.setTextColor(...COLOR_WHITE);
        pdf.setFontSize(11);
        pdf.text(c.title, x + colW / 2, startY + 5, { align: 'center' });

        pdf.setFillColor(...COLOR_WHITE);
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, startY + 7, colW, 14, 'FD');

        pdf.setTextColor(...COLOR_GUINDA);
        pdf.setFontSize(22);
        pdf.text(c.count.toString(), x + colW * 0.3, startY + 17.5, { align: 'center' });

        pdf.setTextColor(...COLOR_GOLD);
        pdf.setFontSize(20);
        pdf.text(getPct(c.count, c.pctDenominator), x + colW * 0.75, startY + 17.5, { align: 'center' });
    });

    // ==========================================
    // 3. TABLAS PEQUEÑAS DE TECNOLOGÍA
    // ==========================================
    startY += 24;

    const tableHeaders = [
        { title: 'UNIDADES EN PATIO', col2: 'EN PATIO' },
        { title: 'UNIDADES EN MANTENIMIENTO', col2: 'CANTIDAD' },
        { title: 'UNIDADES EN RESERVA', col2: 'CANTIDAD' },
        { title: 'ITINERARIO', col2: 'CANTIDAD' }
    ];

    const didDrawCellSmallTable = (data, denominator) => {
        if (data.section === 'body' && data.column.index === 2) {
            const rowData = data.row.raw;
            const val = parseFloat(rowData[2]); 
            const p = isNaN(val) ? 0 : val;
            
            const w = data.cell.width;
            const h = data.cell.height;
            const x = data.cell.x;
            const y = data.cell.y;

            if (p > 0) {
                const fillW = (p / 100) * (w - 12);
                pdf.setFillColor(156, 30, 63); 
                pdf.rect(x + 1, y + 1, fillW, h - 2, 'F');
            }

            pdf.setTextColor(0, 0, 0); 
            pdf.setFontSize(7);
            pdf.text(rowData[2], x + w - 2, y + h / 2 + 1, { align: 'right' });
        }
    };

    [0, 1, 2, 3].forEach(i => {
        const x = margin + (colW + gap) * i;
        
        let bodyData = [];
        let denominator = totalPatio;

        if (i === 0) {
            denominator = totalFlota;
            bodyData = techNames.map(t => {
                const p = unidadesPorTecnologia[t].taller.length + unidadesPorTecnologia[t].reserva.length + unidadesPorTecnologia[t].desincorporada.length;
                return [t, p, getPct(p, denominator)];
            });
        } else if (i === 1) {
            bodyData = techNames.map(t => [t, unidadesPorTecnologia[t].taller.length, getPct(unidadesPorTecnologia[t].taller.length, denominator)]);
        } else if (i === 2) {
            bodyData = techNames.map(t => [t, unidadesPorTecnologia[t].reserva.length, getPct(unidadesPorTecnologia[t].reserva.length, denominator)]);
        } else if (i === 3) {
            bodyData = techNames.map(t => [t, unidadesPorTecnologia[t].desincorporada.length, getPct(unidadesPorTecnologia[t].desincorporada.length, denominator)]);
        }

        autoTable(pdf, {
            startY: startY,
            margin: { left: x },
            tableWidth: colW,
            head: [
                [{ content: tableHeaders[i].title, colSpan: 3, styles: { fillColor: COLOR_GUINDA, textColor: COLOR_WHITE, halign: 'center', fontSize: 8 } }],
                [{ content: 'TECNOLOGÍA', styles: { fillColor: COLOR_BEIGE, textColor: [0,0,0] } }, 
                 { content: tableHeaders[i].col2, styles: { fillColor: COLOR_BEIGE, textColor: [0,0,0] } }, 
                 { content: '% FLOTA', styles: { fillColor: COLOR_BEIGE, textColor: [0,0,0] } }]
            ],
            body: bodyData,
            theme: 'grid',
            styles: { fontSize: 7, halign: 'center', cellPadding: 1, lineColor: [220, 220, 220] },
            columnStyles: { 0: { cellWidth: colW * 0.4 }, 1: { cellWidth: colW * 0.3 }, 2: { cellWidth: colW * 0.3 } },
            didDrawCell: (data) => didDrawCellSmallTable(data, denominator),
            willDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 2) {
                    data.doc.setTextColor(255, 255, 255); 
                }
            }
        });
    });

    // ==========================================
    // 4. TABLA UNIDADES EN MANTENIMIENTO
    // ==========================================
    const detailStartY = pdf.lastAutoTable.finalY + 8;
    
    const getFalla = (u) => {
        const val = u.FALLA_REPORTADA || u.FALLA || u.MOTIVO_ESTATUS || u.MOTIVO || '';
        return val ? val.toUpperCase() : '';
    };
    const getEco = (u) => u.ECONOMICO || u.numero_eco || '';

    const maxTallerRows = Math.max(...techNames.map(t => unidadesPorTecnologia[t].taller.length), 5); // min 5 rows
    const bodyTaller = [];
    for (let r = 0; r < maxTallerRows; r++) {
        const row = [];
        techNames.forEach(t => {
            const unit = unidadesPorTecnologia[t].taller[r];
            row.push(unit ? getEco(unit) : '', unit ? getFalla(unit) : '');
        });
        bodyTaller.push(row);
    }

    autoTable(pdf, {
        startY: detailStartY,
        margin: { left: margin, right: margin },
        head: [
            [{ content: 'UNIDADES EN MANTENIMIENTO', colSpan: 8, styles: { fillColor: COLOR_GUINDA, textColor: COLOR_WHITE, halign: 'center', fontSize: 10 } }],
            [
                { content: 'URBANUSS', colSpan: 2 },
                { content: 'ZAFIRO', colSpan: 2 },
                { content: 'VAGONETA', colSpan: 2 },
                { content: 'ORIÓN', colSpan: 2 }
            ]
        ],
        body: bodyTaller,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, lineColor: [220, 220, 220] },
        headStyles: { fillColor: COLOR_BEIGE, textColor: [0, 0, 0], halign: 'center' },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 'auto', halign: 'left' },
            4: { cellWidth: 15, halign: 'center' }, 5: { cellWidth: 'auto', halign: 'left' },
            6: { cellWidth: 15, halign: 'center' }, 7: { cellWidth: 'auto', halign: 'left' }
        },
        willDrawCell: (data) => {
            if (data.section === 'body') {
                if (data.column.index % 2 === 1) {
                    data.cell.styles.lineWidth = { top: 0.1, bottom: 0.1, right: 0.1, left: 0 };
                } else {
                    data.cell.styles.lineWidth = { top: 0.1, bottom: 0.1, left: 0.1, right: 0 };
                }
            }
        }
    });

    // ==========================================
    // 5. TABLA UNIDADES EN PATIO RESERVA
    // ==========================================
    const detailReservaStartY = pdf.lastAutoTable.finalY + 8;
    
    const maxReservaRows = Math.max(...techNames.map(t => unidadesPorTecnologia[t].reserva.length), 5); // min 5 rows
    const bodyReserva = [];
    for (let r = 0; r < maxReservaRows; r++) {
        const row = [];
        techNames.forEach(t => {
            const unit = unidadesPorTecnologia[t].reserva[r];
            row.push(unit ? getEco(unit) : '');
        });
        bodyReserva.push(row);
    }

    autoTable(pdf, {
        startY: detailReservaStartY,
        margin: { left: margin, right: margin },
        head: [
            [{ content: 'UNIDADES EN PATIO RESERVA', colSpan: 4, styles: { fillColor: COLOR_GUINDA, textColor: COLOR_WHITE, halign: 'center', fontSize: 10 } }],
            [ 'URBANUSS', 'ZAFIRO', 'VAGONETA', 'ORIÓN' ]
        ],
        body: bodyReserva,
        theme: 'grid',
        styles: { fontSize: 8, halign: 'left', cellPadding: 1.5, lineColor: [220, 220, 220] },
        headStyles: { fillColor: COLOR_BEIGE, textColor: [0, 0, 0], halign: 'center' },
        columnStyles: {
            0: { cellWidth: '25%' }, 1: { cellWidth: '25%' },
            2: { cellWidth: '25%' }, 3: { cellWidth: '25%' }
        }
    });

    pdf.save(`Reporte_Operacional_Hora_${fechaStr.replace(/\//g, '-')}_${horaStr.replace(/:/g, '-')}.pdf`);
};
