import jsPDF from 'jspdf';

// Colores institucionales
const COLOR_GUINDA     = [96, 26, 42]; 
const COLOR_GOLD       = [197, 160, 89];
const COLOR_BEIGE      = [234, 222, 203]; // Color de las cajas (beige)
const COLOR_BEIGE_LIGHT= [247, 241, 233]; 
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

const drawFooterIconToCanvas = (type) => {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');

        if (type === 'clipboard') {
            ctx.strokeStyle = '#FFFFFF';
            ctx.fillStyle = '#FFFFFF';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(24, 26, 52, 68, 6);
            else ctx.rect(24, 26, 52, 68);
            ctx.stroke();

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(40, 16, 20, 12, 3);
            else ctx.rect(40, 16, 20, 12);
            ctx.fill();

            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(32, 42); ctx.lineTo(36, 46); ctx.lineTo(44, 38);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(48, 42); ctx.lineTo(66, 42);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(32, 56); ctx.lineTo(36, 60); ctx.lineTo(44, 52);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(48, 56); ctx.lineTo(66, 56);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(32, 70); ctx.lineTo(36, 74); ctx.lineTo(44, 66);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(48, 70); ctx.lineTo(62, 70);
            ctx.stroke();

            ctx.fillStyle = '#601a2a';
            ctx.beginPath();
            ctx.arc(74, 76, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(74, 76, 16, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(65, 76);
            ctx.lineTo(71, 82);
            ctx.lineTo(83, 69);
            ctx.stroke();
        } else if (type === 'bus') {
            ctx.strokeStyle = '#FFFFFF';
            ctx.fillStyle = '#FFFFFF';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(24, 22, 72, 68, 12);
            else ctx.rect(24, 22, 72, 68);
            ctx.stroke();

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(40, 28, 40, 8, 3);
            else ctx.rect(40, 28, 40, 8);
            ctx.fill();

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(30, 40, 60, 24, 6);
            else ctx.rect(30, 40, 60, 24);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(60, 40); ctx.lineTo(60, 64);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(36, 76, 5, 0, Math.PI * 2);
            ctx.arc(84, 76, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(50, 72, 20, 8, 2);
            else ctx.rect(50, 72, 20, 8);
            ctx.stroke();

            ctx.fillRect(30, 90, 16, 10);
            ctx.fillRect(74, 90, 16, 10);

            ctx.fillRect(14, 42, 8, 16);
            ctx.fillRect(98, 42, 8, 16);
        }
        return canvas.toDataURL('image/png');
    } catch (e) {
        return null;
    }
};

export const generarPDFReporteUnidades = async (data) => {
    if (!data || !data.tipos) {
        throw new Error("No hay datos para generar el reporte de unidades.");
    }

    const { tipos, totales } = data;
    const fecha = new Date().toLocaleDateString('es-MX', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).toUpperCase();

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
    pdf.setFontSize(14);
    pdf.setTextColor(...COLOR_WHITE);
    pdf.text('INICIO DE OPERACIÓN', pw - 10, 12, { align: 'right' });
    pdf.setFontSize(12);
    pdf.text('TRANSPORTE METROPOLITANO', pw - 10, 18, { align: 'right' });

    // DIBUJAR MARCO LATERAL GUINDA (Ajustado debajo del header)
    pdf.setFillColor(...COLOR_GUINDA);
    pdf.roundedRect(10, 30, 15, ph - 45, 3, 3, 'F');
    
    // TEXTO LATERAL ROTADO
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('SISTEMA DE TRANSPORTE METROPOLITANO', 15, ph - 25, { angle: 90 });

    // ENCABEZADO FECHA
    pdf.setDrawColor(...COLOR_GOLD);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(50, 30, pw - 80, 15, 3, 3, 'FD');

    // Texto de fecha
    pdf.setTextColor(...COLOR_GUINDA);
    pdf.setFontSize(18);
    pdf.text(fecha, pw / 2 + 5, 40, { align: 'center' });

    let currentY = 55;

    // IMÁGENES A PRECARGAR (Perfiles laterales)
    const imgUrls = {
        'URBANUS': '/images/urbanu-lateral.webp',
        'ZAFIRO': '/images/zafiro lateral_.webp',
        'VAGONETA': '/images/vagoneta lateral.webp',
        'ORION': '/images/orionlateral.webp'
    };

    // DIBUJAR LAS FILAS
    for (let i = 0; i < tipos.length; i++) {
        const item = tipos[i];
        
        // Caja completa (borde dorado)
        pdf.setDrawColor(...COLOR_GOLD);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(30, currentY, pw - 40, 35, 2, 2, 'FD');

        // Imagen del transporte
        let tipoName = (item.tipo || '').toUpperCase();
        let url = imgUrls[tipoName] || imgUrls['URBANUS']; // Fallback
        const img = await loadImage(url);
        if (img && (img.naturalWidth > 0 || img.width > 0)) {
            const canvas = document.createElement('canvas');
            canvas.width  = img.naturalWidth  || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const maxW = 65;
            const maxH = 30;
            const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
            const drawW = canvas.width * ratio;
            const drawH = canvas.height * ratio;
            const x = 32 + (maxW - drawW) / 2;
            const y = currentY + 2.5 + (maxH - drawH) / 2;
            
            if (drawW > 0 && drawH > 0) {
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawW, drawH);
            }
        }

        // Subcaja de números
        const boxX = 100;
        const boxW = pw - 115;
        
        pdf.setFillColor(...COLOR_BEIGE);
        pdf.roundedRect(boxX, currentY + 2, boxW, 31, 3, 3, 'F');
        
        // Headers guindas de la subcaja
        pdf.setFillColor(...COLOR_GUINDA);
        pdf.roundedRect(boxX, currentY + 2, boxW, 8, 3, 3, 'F');
        // Quitar esquinas inferiores guindas dibujando un rect normal encima
        pdf.rect(boxX, currentY + 7, boxW, 3, 'F');

        // Separador vertical en los headers guindas
        pdf.setDrawColor(...COLOR_GOLD);
        pdf.line(boxX + boxW/2, currentY + 3, boxX + boxW/2, currentY + 9);

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.text('UNIDADES PROGRAMADAS', boxX + boxW/4, currentY + 7, { align: 'center' });
        pdf.text('UNIDADES EN SERVICIO', boxX + (boxW/4)*3, currentY + 7, { align: 'center' });

        // Números grandes
        pdf.setTextColor(...COLOR_GUINDA);
        pdf.setFontSize(30);
        pdf.text((item.programadas ?? 0).toString(), boxX + boxW/4, currentY + 26, { align: 'center' });
        pdf.text((item.en_servicio ?? 0).toString(), boxX + (boxW/4)*3, currentY + 26, { align: 'center' });

        currentY += 45; // Siguiente fila
    }

    // FOOTER (Totales)
    pdf.setFillColor(...COLOR_BEIGE_LIGHT);
    pdf.setDrawColor(...COLOR_GOLD);
    pdf.roundedRect(30, currentY, pw - 40, 35, 5, 5, 'FD');

    // Icono clipboard (caja e icono más pequeños y simétricos)
    pdf.setFillColor(...COLOR_GUINDA);
    pdf.roundedRect(35, currentY + 6, 21, 23, 3.5, 3.5, 'F');
    const clipIconData = drawFooterIconToCanvas('clipboard');
    if (clipIconData) {
        pdf.addImage(clipIconData, 'PNG', 36.5, currentY + 7.5, 18, 20);
    }

    pdf.setTextColor(...COLOR_GUINDA);
    pdf.setFontSize(10.5);
    pdf.text('TOTAL DE UNIDADES', 84, currentY + 11, { align: 'center' });
    pdf.text('PROGRAMADAS', 84, currentY + 15, { align: 'center' });
    pdf.setFontSize(32);
    pdf.text((totales?.programadas ?? 0).toString(), 84, currentY + 29, { align: 'center' });

    // Separador vertical total
    pdf.line(115, currentY + 5, 115, currentY + 30);

    // Icono bus (caja e icono más pequeños y simétricos)
    pdf.setFillColor(...COLOR_GUINDA);
    pdf.roundedRect(123, currentY + 6, 21, 23, 3.5, 3.5, 'F');
    const busIconData = drawFooterIconToCanvas('bus');
    if (busIconData) {
        pdf.addImage(busIconData, 'PNG', 124.5, currentY + 7.5, 18, 20);
    }

    pdf.setFontSize(10.5);
    pdf.text('TOTAL DE UNIDADES', 172, currentY + 11, { align: 'center' });
    pdf.text('EN SERVICIO', 172, currentY + 15, { align: 'center' });
    pdf.setFontSize(32);
    pdf.text((totales?.en_servicio ?? 0).toString(), 172, currentY + 29, { align: 'center' });

    pdf.save(`Reporte_Unidades_${new Date().toISOString().slice(0,10)}.pdf`);
};
