import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Header from '../../components/Header/Header';
import CONDUCTORES from '../../data/conductores';
import API_BASE from '../../config/api';


// ── Íconos ────────────────────────────────────────────────────────────────────
const IconDownload = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
    </svg>
);

const IconPrint = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0 1 18 8.653v4.097A2.25 2.25 0 0 1 15.75 15h-.75v.75c0 .966-.784 1.75-1.75 1.75h-6.5A1.75 1.75 0 0 1 5 15.75V15h-.75A2.25 2.25 0 0 1 2 12.75V8.653c0-1.082.775-2.034 1.874-2.198.374-.056.75-.107 1.126-.153V2.75ZM9.5 5.5h1V4a.5.5 0 0 0-.5-.5h-.001a.5.5 0 0 0-.499.5v1.5Zm-3 0V2.75a.25.25 0 0 1 .25-.25h6.5a.25.25 0 0 1 .25.25V5.5H6.5Zm0 9.25v1a.25.25 0 0 0 .25.25h6.5a.25.25 0 0 0 .25-.25v-4h-7v3Z" clipRule="evenodd" />
    </svg>
);

const IconEye = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
);

const IconCalendar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
    </svg>
);

const IconReport = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875Zm5.845 17.03a.75.75 0 0 0 1.06 0l3-3a.75.75 0 1 0-1.06-1.06l-1.72 1.72V12a.75.75 0 0 0-1.5 0v4.19l-1.72-1.72a.75.75 0 0 0-1.06 1.06l3 3Z" clipRule="evenodd" />
        <path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z" />
    </svg>
);

// ── Tabs de periodo ───────────────────────────────────────────────────────────
const PERIODS = [
    { key: 'daily',   label: 'Diario',   emoji: '📋' },
    { key: 'weekly',  label: 'Semanal',  emoji: '📊' },
    { key: 'monthly', label: 'Mensual',  emoji: '📈' },
    { key: 'yearly',  label: 'Anual',    emoji: '📅' },
];

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

export default function HistorialCheckList() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const filterTipo = queryParams.get('tipoTransporte');

    const [period, setPeriod] = useState('daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [checklists, setChecklists] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [previewId, setPreviewId] = useState(null);
    const previewRef = useRef(null);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchChecklists = async () => {
        setCargando(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/checklists?period=${period}&date=${selectedDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            if (res.ok) {
                const data = await res.json();
                let fetchedChecklists = data.checklists || [];
                
                // Si venimos de la selección de flota, filtramos localmente por tipo de transporte
                if (filterTipo) {
                    let normalizedTipo = filterTipo.toUpperCase();
                    if (normalizedTipo === 'URBANUS') normalizedTipo = 'URBANUSS';
                    fetchedChecklists = fetchedChecklists.filter(c => String(c.tipo_unidad) === String(normalizedTipo));
                }

                setChecklists(fetchedChecklists);
                setDateFrom(data.dateFrom);
                setDateTo(data.dateTo);
            }
        } catch (error) {
            console.error('Error fetching checklists', error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        fetchChecklists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, selectedDate, location.search]);

    // Buscar checklist para preview
    const previewChecklist = checklists?.find(c => c.id === previewId);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
    };

    const handlePrintTable = () => {
        setPreviewId(null);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const generarPDF = (id, accion = 'download') => {
        const checklist = checklists?.find(c => c.id === id);
        if (!checklist) return;

        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const margin = 15;
            let y = margin;

            const dateFormatted = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(checklist.created_at));

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
                headStyles: { fillColor: [136, 19, 55], textColor: 255, fontStyle: 'bold' }, // Color guinda (#881337)
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 105 },
                },
                didParseCell: function (data) {
                    if (data.column.index === 1 && data.row.index > 0) { // Si no es header y es la columna Estado
                        const estado = data.cell.raw;
                        if (estado === 'Bien') data.cell.styles.textColor = [5, 150, 105]; // text-emerald-600
                        else if (estado === 'Mal') data.cell.styles.textColor = [220, 38, 38]; // text-red-600
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
            });

<<<<<<< Updated upstream
=======
            let currentY = doc.lastAutoTable.finalY || y;

            // Dibujo de observaciones (si existe)
            if (checklist.dibujo) {
                const blueprintUrl = `/images/${(checklist.tipo_unidad || 'hero').toLowerCase()}.png`;
                const [blueprintImg, drawingImg] = await Promise.all([
                    loadImage(blueprintUrl),
                    loadImage(checklist.dibujo)
                ]);

                const pageHeight = doc.internal.pageSize.height;
                const neededHeight = 75; // 60mm image + 15mm text and padding

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
                const imgHeight = 60; // 5:3 Aspect ratio
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
                        return { label: foto.label, img };
                    })
                );
                const validPhotos = loadedPhotos.filter(p => p.img !== null);

                if (validPhotos.length > 0) {
                    const neededHeight = 55; // 38mm image + 17mm text and spacing
                    const pageHeight = doc.internal.pageSize.height;

                    if (pageHeight - currentY - margin < neededHeight) {
                        doc.addPage();
                        currentY = margin;
                    } else {
                        currentY += 10;
                    }

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Evidencias Fotográficas', margin, currentY);
                    currentY += 8;

                    const colWidth = 50;
                    const rowHeight = 38;
                    const colGap = 10;
                    const rowGap = 10;
                    const startX = 20; // Centrar de forma aproximada: (210 - (3 * 50 + 2 * 10)) / 2 = 20mm
                    
                    let currentCol = 0;

                    for (let idx = 0; idx < validPhotos.length; idx++) {
                        const photo = validPhotos[idx];

                        // Si excede el espacio de la página para la fila actual, agregamos página nueva
                        if (currentY + rowHeight > pageHeight - margin) {
                            doc.addPage();
                            currentY = margin + 10; // Dejar espacio arriba
                        }

                        const posX = startX + currentCol * (colWidth + colGap);
                        
                        // Dibujar la foto
                        try {
                            doc.addImage(photo.img, 'JPEG', posX, currentY, colWidth, rowHeight);
                        } catch (e) {
                            console.error("Error al añadir imagen al PDF:", e);
                        }

                        // Dibujar etiqueta debajo de la foto
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.text(photo.label, posX + colWidth / 2, currentY + rowHeight + 4, { align: 'center' });

                        currentCol++;
                        if (currentCol >= 3) {
                            currentCol = 0;
                            currentY += rowHeight + rowGap + 5; // Aumentar Y para la siguiente fila
                        }
                    }
                    
                    // Si la última fila no se completó (es decir, currentCol > 0), incrementamos Y
                    if (currentCol > 0) {
                        currentY += rowHeight + rowGap + 5;
                    }
                }
            }

>>>>>>> Stashed changes
            // Pie de página
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.text(
                    `Reporte generado automáticamente el ${new Date().toLocaleString()}`,
                    margin,
                    doc.internal.pageSize.height - 10
                );
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    doc.internal.pageSize.width - margin - 20,
                    doc.internal.pageSize.height - 10
                );
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

    // Estadísticas
    const totalChecklists = checklists?.length ?? 0;
    const totalBien = checklists?.reduce((sum, c) => sum + c.total_bien, 0) ?? 0;
    const totalMal  = checklists?.reduce((sum, c) => sum + c.total_mal, 0) ?? 0;
    
    const periodLabel = PERIODS.find(p => p.key === period)?.label || 'Diario';

    return (
        <div className="menu-page bg-gray-50 min-h-screen pb-10">
            <Header hideBackButton={false} />
            
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                
                <div className="flex items-center justify-between mb-6">
                    <h2 className="flex items-center gap-2 text-xl font-semibold text-guinda-700">
                        <IconReport />
                        Historial de Check List
                    </h2>
                </div>

                {/* ── Tabs de periodo ──────────────────────────────────── */}
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    {PERIODS.map(p => (
                        <button
                            key={p.key}
                            onClick={() => handlePeriodChange(p.key)}
                            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 ${
                                period === p.key
                                    ? 'bg-guinda-700 text-white shadow-md shadow-guinda-700/25'
                                    : 'border border-gray-200 bg-white text-gray-600 hover:border-guinda-700/30 hover:bg-guinda-700/5'
                            }`}
                        >
                            <span>{p.emoji}</span>
                            {p.label}
                        </button>
                    ))}

                    {/* Selector de fecha */}
                    <div className="ml-auto flex items-center gap-2">
                        <IconCalendar />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition focus:border-guinda-700 focus:outline-none focus:ring-2 focus:ring-guinda-700/20"
                        />
                    </div>
                </div>

                {/* ── Rango de fechas ──────────────────────────────────── */}
                <div className="mb-6 rounded-xl border border-dorado-600/20 bg-dorado-600/5 px-5 py-3">
                    <p className="text-xs font-semibold text-dorado-700">
                        Periodo: <span className="font-bold">{dateFrom || '...'}</span> al <span className="font-bold">{dateTo || '...'}</span>
                    </p>
                </div>

                {/* ── Tarjetas de estadísticas ─────────────────────────── */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Checklists</p>
                        <p className="mt-1 text-3xl font-extrabold text-guinda-700">{cargando ? '-' : totalChecklists}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Puntos Bien</p>
                        <p className="mt-1 text-3xl font-extrabold text-emerald-600">{cargando ? '-' : totalBien}</p>
                    </div>
                    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Puntos Mal</p>
                        <p className="mt-1 text-3xl font-extrabold text-red-500">{cargando ? '-' : totalMal}</p>
                    </div>
                </div>

                {/* ── Tabla de checklists ──────────────────────────────── */}
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 px-5 py-4 gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">Checklists del periodo</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{totalChecklists} registro{totalChecklists !== 1 ? 's' : ''} encontrado{totalChecklists !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrintTable}
                                disabled={totalChecklists === 0}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <IconPrint />
                                Imprimir Reporte
                            </button>
                        </div>
                    </div>

                    {cargando ? (
                        <div className="p-10 text-center text-gray-500">Cargando registros...</div>
                    ) : totalChecklists > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80">
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">#</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Fecha / Hora</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Inspector</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo Unidad</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Conductor</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Servicio / Ruta</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Bien</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Mal</th>
                                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checklists.map((c, i) => {
                                        const fecha = new Date(c.fecha_hora);
                                        const fmtFecha = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                                        const fmtHora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <tr key={c.id} className="border-b border-gray-50 transition hover:bg-gray-50/50">
                                                <td className="px-5 py-3 text-xs font-medium text-gray-400">{c.id}</td>
                                                <td className="px-5 py-3">
                                                    <p className="text-sm font-medium text-gray-800">{fmtFecha}</p>
                                                    <p className="text-[11px] text-gray-400">{fmtHora}</p>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-gray-700">{c.user_name}</td>
                                                <td className="px-5 py-3">
                                                    <span className="rounded-full bg-guinda-700/10 px-2.5 py-1 text-xs font-semibold text-guinda-700">
                                                        {c.tipo_unidad}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-gray-600">{c.conductor_id ?? '—'}</td>
                                                <td className="px-5 py-3 text-sm font-medium text-gray-700">{c.servicio}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className="inline-flex items-center justify-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                                                        {c.total_bien}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className="inline-flex items-center justify-center rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-500">
                                                        {c.total_mal}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setPreviewId(c.id)}
                                                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-guinda-600 shadow-sm transition hover:bg-guinda-50 active:scale-95"
                                                            title="Ver Detalle"
                                                        >
                                                            <IconEye />
                                                        </button>
                                                        <button
                                                            onClick={() => generarPDF(c.id, 'download')}
                                                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-blue-600 shadow-sm transition hover:bg-blue-50 active:scale-95"
                                                            title="Descargar PDF"
                                                        >
                                                            <IconDownload />
                                                        </button>
                                                        <button
                                                            onClick={() => generarPDF(c.id, 'print')}
                                                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-95"
                                                            title="Imprimir"
                                                        >
                                                            <IconPrint />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                                <IconReport />
                            </div>
                            <h4 className="text-base font-bold text-gray-500">Sin registros</h4>
                            <p className="mt-1 text-sm text-gray-400">
                                No se encontraron checklists en este periodo.
                            </p>
                            <p className="mt-0.5 text-xs text-gray-300">
                                Intenta seleccionar otra fecha o periodo.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Preview inline ──────────────────────────────────── */}
                {previewChecklist && (() => {
                    const conductorEncontrado = CONDUCTORES.find((c) => c.id === Number(previewChecklist.conductor_id));
                    const conductorNombre = conductorEncontrado ? conductorEncontrado.nombre : '—';
                    const conductorTarjeton = conductorEncontrado ? conductorEncontrado.tarjeton : '—';
                    
                    return (
                        <div ref={previewRef} className="mt-6 rounded-2xl border border-guinda-700/20 bg-white p-6 shadow-sm animate-in fade-in printable-section">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                                <h4 className="text-lg font-bold text-guinda-700">
                                    Detalle del Checklist #{previewChecklist.id}
                                </h4>
                                <button
                                    onClick={() => setPreviewId(null)}
                                    className="text-gray-400 hover:text-gray-600 transition hide-on-print"
                                    title="Cerrar detalle"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                    </svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-6 mb-6">
                                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo Unidad</p>
                                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{previewChecklist.tipo_unidad}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Servicio / Ruta</p>
                                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{previewChecklist.servicio}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Inspector</p>
                                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{previewChecklist.user_name}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ID Conductor</p>
                                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{previewChecklist.conductor_id ?? '—'}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tarjetón</p>
                                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{conductorTarjeton}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre Conductor</p>
                                    <p className="mt-0.5 text-sm font-semibold text-gray-800">{conductorNombre}</p>
                                </div>
                            </div>

                        <div className="mb-6 grid grid-cols-3 gap-3 text-center border-b border-gray-100 pb-6">
                            <div className="rounded-xl bg-emerald-50 py-3">
                                <p className="text-2xl font-extrabold text-emerald-600">{previewChecklist.total_bien}</p>
                                <p className="text-[10px] font-bold uppercase text-emerald-700">Bien</p>
                            </div>
                            <div className="rounded-xl bg-red-50 py-3">
                                <p className="text-2xl font-extrabold text-red-500">{previewChecklist.total_mal}</p>
                                <p className="text-[10px] font-bold uppercase text-red-700">Mal</p>
                            </div>
                            <div className="rounded-xl bg-gray-100 py-3">
                                <p className="text-2xl font-extrabold text-gray-500">{previewChecklist.total_puntos - previewChecklist.total_bien - previewChecklist.total_mal}</p>
                                <p className="text-[10px] font-bold uppercase text-gray-600">Pendiente</p>
                            </div>
                        </div>

                        {/* Detalles de puntos */}
                        <div className="mb-6">
                            <h5 className="mb-4 text-sm font-bold text-gray-800">Puntos Evaluados</h5>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {PUNTOS.map((punto, idx) => {
                                    const pd = previewChecklist.puntos?.[punto.id];
                                    if (!pd || pd.estado === null) return null; // Solo mostrar los evaluados
                                    
                                    const isBien = pd.estado === 'bien';
                                    return (
                                        <li key={punto.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-start gap-3">
                                            <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${isBien ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                {isBien ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-800">{punto.label}</p>
                                                {pd.observaciones ? (
                                                    <p className="mt-1 text-xs text-gray-600 break-all whitespace-pre-wrap">
                                                        <span className="font-semibold text-gray-500">Obs:</span> {pd.observaciones}
                                                    </p>
                                                ) : (
                                                    <p className="mt-1 text-xs italic text-gray-400">Sin observaciones</p>
                                                )}
                                                
                                                {/* Evidencias fotográficas debajo de las observaciones */}
                                                {(pd.foto || (pd.fotos && pd.fotos.length > 0)) && (
                                                    <div className="mt-3 flex flex-wrap gap-2 hide-on-print">
                                                        {pd.foto && (
                                                            <img 
                                                                src={pd.foto} 
                                                                alt={`Evidencia de ${punto.label}`} 
                                                                className="h-16 w-16 rounded-lg object-cover border border-gray-200 cursor-zoom-in hover:scale-105 transition-all shadow-sm"
                                                                onClick={() => setLightboxImage(pd.foto)}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Dibujo de observaciones */}
                        {previewChecklist.dibujo && (
                            <div className="mb-6 page-break-before">
                                <h5 className="mb-3 text-sm font-bold text-gray-800">Referencia Visual (Marcas)</h5>
                                <div className="rounded-xl border border-gray-100 bg-gray-50 p-2 max-w-2xl mx-auto overflow-hidden shadow-sm relative">
                                    <img
                                        src="/images/bus-blueprint.svg"
                                        alt="Blueprint"
                                        className="w-full object-contain opacity-60"
                                        style={{ aspectRatio: '5/3' }}
                                    />
                                    <img 
                                        src={previewChecklist.dibujo} 
                                        alt="Marcas visuales" 
                                        className="absolute inset-0 w-full h-full object-contain mix-blend-multiply" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    );
                })()}

            </div>

            {/* Modal para visualizar imágenes en grande */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity hide-on-print"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-full max-h-full flex items-center justify-center animate-in fade-in zoom-in duration-200">
                        <button 
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md"
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
                        >
                            Cerrar ✕
                        </button>
                        <img 
                            src={lightboxImage} 
                            alt="Vista ampliada" 
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
                        />
                    </div>
                </div>
            )}
            
            {/* Estilos para impresión */}
            <style>{`
                @media print {
                    .hide-on-print { display: none !important; }
                    .menu-page { background: white !important; padding: 0 !important; }
                    header, .dashboard-grid, .bg-gray-50 { background: white !important; }
                    .printable-section { border: none !important; box-shadow: none !important; }
                    .page-break-before { page-break-before: always; }
                }
            `}</style>
        </div>
    );
}
