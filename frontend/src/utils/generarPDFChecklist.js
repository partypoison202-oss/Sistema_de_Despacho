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

const loadImage = (src) => {
    return new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
};

export const generarPDFChecklist = async (checklist, accion = 'download') => {
    if (!checklist) return;

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        let y = margin;

        const dateFormatted = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(checklist.fecha_hora || checklist.created_at || new Date()));

        // Encabezado
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`Reporte de Checklist #${checklist.id}`, margin, y);
        y += 8;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tipo Unidad: ${checklist.tipo_unidad || '—'}`, margin, y);
        y += 6;
        doc.text(`Servicio/Ruta: ${checklist.servicio || '—'}`, margin, y);
        y += 6;
        doc.text(`Inspector: ${checklist.user_name || '—'}`, margin, y);
        y += 6;
        
        // Buscar conductor
        const conductorEncontrado = CONDUCTORES.find((c) => c.id === Number(checklist.conductor_id));
        const conductorNombre = conductorEncontrado ? conductorEncontrado.nombre : '—';
        doc.text(`Conductor: ${conductorNombre} (ID: ${checklist.conductor_id || '—'})`, margin, y);
        y += 6;
        doc.text(`Fecha y Hora: ${dateFormatted}`, margin, y);
        y += 10;

        // Puntos Evaluados
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Puntos Evaluados', margin, y);
        y += 6;

        const tableData = [];
        PUNTOS.forEach(punto => {
            const pd = checklist.puntos?.[punto.id];
            if (pd && pd.estado) {
                tableData.push([
                    punto.label,
                    pd.estado === 'bien' ? 'Bien' : 'Mal',
                    pd.observaciones || '—'
                ]);
            }
        });

        autoTable(doc, {
            startY: y,
            head: [['Punto Evaluado', 'Estado', 'Observaciones']],
            body: tableData,
            margin: { left: margin, right: margin },
            styles: { fontSize: 10, cellPadding: 3, font: 'helvetica' },
            headStyles: { fillColor: [136, 19, 55], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 25 },
                2: { cellWidth: 105 },
            },
            didParseCell: function (data) {
                if (data.column.index === 1 && data.row.index > 0) {
                    const estado = data.cell.raw;
                    if (estado === 'Bien') data.cell.styles.textColor = [5, 150, 105];
                    else if (estado === 'Mal') data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });
        let currentY = doc.lastAutoTable.finalY || y;

        // Dibujo de observaciones (si existe)
        if (checklist.dibujo) {
            const blueprintUrl = `/images/${(checklist.tipo_unidad || 'hero').toLowerCase()}.webp`;
            const [blueprintImg, drawingImg] = await Promise.all([
                loadImage(blueprintUrl),
                loadImage(checklist.dibujo)
            ]);

            const pageHeight = doc.internal.pageSize.height;
            const neededHeight = 75;

            if (pageHeight - currentY - margin < neededHeight) {
                doc.addPage();
                currentY = margin;
            } else {
                currentY += 10;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Referencia Visual (Marcas de Fallas)', margin, currentY);
            currentY += 6;

            const imgWidth = 100;
            const imgHeight = 60;
            const imgX = margin + (doc.internal.pageSize.width - margin * 2 - imgWidth) / 2;

            if (blueprintImg) {
                doc.addImage(blueprintImg, 'PNG', imgX, currentY, imgWidth, imgHeight);
            }
            if (drawingImg) {
                doc.addImage(drawingImg, 'PNG', imgX, currentY, imgWidth, imgHeight);
            }
            currentY += imgHeight + 10;
        }

        // Evidencias fotográficas (si existen)
        const fotosEvidencia = [];
        PUNTOS.forEach(punto => {
            const pd = checklist.puntos?.[punto.id];
            if (pd) {
                if (pd.foto) {
                    fotosEvidencia.push({ label: punto.label, url: pd.foto });
                }
                if (pd.fotos && pd.fotos.length > 0) {
                    pd.fotos.forEach(f => {
                        fotosEvidencia.push({ label: punto.label, url: f });
                    });
                }
            }
        });

        if (fotosEvidencia.length > 0) {
            const loadedPhotos = await Promise.all(
                fotosEvidencia.map(async (foto) => {
                    const img = await loadImage(foto.url);
                    return { ...foto, img };
                })
            );

            let firstPhoto = true;
            for (const { label, img } of loadedPhotos) {
                if (!img) continue;

                if (firstPhoto) {
                    if (doc.internal.pageSize.height - currentY - margin < 60) {
                        doc.addPage();
                        currentY = margin;
                    } else {
                        currentY += 10;
                    }
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Evidencias Fotográficas', margin, currentY);
                    currentY += 6;
                    firstPhoto = false;
                }

                if (doc.internal.pageSize.height - currentY - margin < 80) {
                    doc.addPage();
                    currentY = margin;
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text(`Evidencia: ${label}`, margin, currentY);
                currentY += 4;

                const imgProps = doc.getImageProperties(img);
                const pdfWidth = doc.internal.pageSize.width - margin * 2;
                let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                if (pdfHeight > 70) {
                    pdfHeight = 70;
                    const pdfW = (imgProps.width * pdfHeight) / imgProps.height;
                    const xOffset = margin + (pdfWidth - pdfW) / 2;
                    doc.addImage(img, 'JPEG', xOffset, currentY, pdfW, pdfHeight);
                } else {
                    doc.addImage(img, 'JPEG', margin, currentY, pdfWidth, pdfHeight);
                }
                currentY += pdfHeight + 8;
            }
        }

        if (accion === 'print') {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } else {
            doc.save(`Checklist_${checklist.id}.pdf`);
        }
    } catch (err) {
        console.error("Error al generar PDF:", err);
        alert(`Hubo un error al generar el PDF: ${err.message || err}`);
    }
};
