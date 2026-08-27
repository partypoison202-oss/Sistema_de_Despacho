import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import '../Unidades/DetalleUnidad.css';
import Header from '../../components/Header/Header';
import CONDUCTORES from '../../data/conductores';
import API_BASE from '../../config/api';
import { generarPDFChecklist } from '../../utils/generarPDFChecklist';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';


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

const IconDaily = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-1.5 1.937V7A2.5 2.5 0 0 0 10 4.5H4.063A2 2 0 0 1 6 3h.014A2.25 2.25 0 0 1 8.25 1h3.5a2.25 2.25 0 0 1 2.236 2ZM10.5 4v-.75a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0-.75.75V4h5Z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M3 6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H3Zm6 8.75a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 1 .75.75Zm2.75-4a.75.75 0 0 0-.75-.75h-6.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 .75-.75Zm-2.75-4a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 1 .75.75Z" clipRule="evenodd" />
    </svg>
);

const IconWeekly = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M3 3a.75.75 0 0 1 .75.75v11.5h11.5a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75V3.75A.75.75 0 0 1 3 3ZM7 9a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-.75.75h-1.5A.75.75 0 0 1 7 14.5V9Zm4-5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V4Z" clipRule="evenodd" />
    </svg>
);

const IconMonthly = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 0 1 .919-.53l4.78 1.281a.75.75 0 0 1 .531.919l-1.281 4.78a.75.75 0 0 1-1.448-.387l.81-3.022a19.407 19.407 0 0 0-5.594 5.203.75.75 0 0 1-1.139.093L7 10.06l-4.72 4.72a.75.75 0 0 1-1.06-1.061l5.25-5.25a.75.75 0 0 1 1.058-.005l3.111 3.11 4.542-4.542-3.023.81a.75.75 0 0 1-.58-.964Z" clipRule="evenodd" />
    </svg>
);

// ── Tabs de periodo ───────────────────────────────────────────────────────────
const PERIODS = [
    { key: 'daily',   label: 'Diario',   icon: <IconDaily /> },
    { key: 'weekly',  label: 'Semanal',  icon: <IconWeekly /> },
    { key: 'monthly', label: 'Mensual',  icon: <IconMonthly /> },
    { key: 'yearly',  label: 'Anual',    icon: <IconCalendar /> },
];

const PUNTOS = [
    { id: 'carroceria_exterior', label: 'Carrocería' },
    { id: 'mobitec', label: 'Mobitec' },
    { id: 'torreta', label: 'Torreta' },
    { id: 'pintura_vinil', label: 'Pintura y vinil' },
    { id: 'parabrisas_cristales', label: 'Parabrisas y cristales' },
    { id: 'luces_exteriores', label: 'Luces' },
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

const loadImage = (url) => {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') {
            resolve(null);
            return;
        }

        const img = new Image();
        
        // Timeout de seguridad de 5 segundos para evitar que la promesa quede colgada
        const timer = setTimeout(() => {
            console.warn("loadImage timeout for URL:", url.substring(0, 100));
            resolve(null);
        }, 5000);

        if (url.startsWith('http') || url.startsWith('//')) {
            img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
            clearTimeout(timer);
            resolve(img);
        };
        img.onerror = () => {
            clearTimeout(timer);
            resolve(null);
        };
        img.src = url;
    });
};


const ChecklistPreviewInline = ({ previewChecklist, setPreviewId, setLightboxImage }) => {
    const conductorEncontrado = CONDUCTORES.find((c) => c.id === Number(previewChecklist.conductor_id));
    const conductorNombre = conductorEncontrado ? conductorEncontrado.nombre : '—';
    const conductorTarjeton = conductorEncontrado ? conductorEncontrado.tarjeton : '—';
    
    return (
        <div className="rounded-2xl border border-guinda-700/20 bg-white p-6 shadow-sm animate-in fade-in printable-section">
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
                                            {pd.fotos && pd.fotos.map((f, fIdx) => (
                                                <img 
                                                    key={fIdx}
                                                    src={f} 
                                                    alt={`Evidencia ${fIdx + 1} de ${punto.label}`} 
                                                    className="h-16 w-16 rounded-lg object-cover border border-gray-200 cursor-zoom-in hover:scale-105 transition-all shadow-sm"
                                                    onClick={() => setLightboxImage(f)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Evidencias fotográficas dedicadas */}
            {(() => {
                const fotosEvidencia = [];
                PUNTOS.forEach(punto => {
                    const pd = previewChecklist.puntos?.[punto.id];
                    if (pd) {
                        if (pd.foto) fotosEvidencia.push({ label: punto.label, url: pd.foto });
                        if (pd.fotos && pd.fotos.length > 0) {
                            pd.fotos.forEach(f => fotosEvidencia.push({ label: punto.label, url: f }));
                        }
                    }
                });

                if (fotosEvidencia.length === 0) return null;

                return (
                    <div className="mb-6 page-break-before">
                        <h5 className="mb-4 text-sm font-bold text-gray-800 border-b border-gray-150 pb-2">Evidencias Fotográficas</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {fotosEvidencia.map((foto, idx) => (
                                <div key={idx} className="flex flex-col items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                                    <img 
                                        src={foto.url} 
                                        alt={`Evidencia de ${foto.label}`} 
                                        className="w-full h-32 rounded-lg object-cover cursor-zoom-in hover:scale-[1.02] transition-all shadow-sm mb-2"
                                        onClick={() => setLightboxImage(foto.url)}
                                    />
                                    <span className="text-xs font-semibold text-guinda-700 text-center">{foto.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Dibujo de observaciones */}
            {previewChecklist.dibujo && (
                <div className="mb-6 page-break-before">
                    <h5 className="mb-3 text-sm font-bold text-gray-800">Referencia Visual (Marcas)</h5>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2 max-w-2xl mx-auto overflow-hidden shadow-sm">
                        <img 
                            src={previewChecklist.dibujo} 
                            alt="Marcas visuales" 
                            className="w-full object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                            style={{ aspectRatio: '5/3' }}
                            onClick={() => setLightboxImage(previewChecklist.dibujo)}
                            title="Clic para ampliar"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default function HistorialCheckList() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const filterTipo = queryParams.get('tipoTransporte');
    const filterEconomico = queryParams.get('economico');

    const [period, setPeriod] = useState('daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [checklists, setChecklists] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [previewId, setPreviewId] = useState(null);
    const previewRef = useRef(null);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterOrigen, setFilterOrigen] = useState('todos');

    const fetchChecklists = async () => {
        setCargando(true);
        try {
            const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
            let url = `${API_BASE}/api/checklists?period=${period}&date=${selectedDate}`;
            if (filterEconomico) {
                url += `&economico=${filterEconomico}`;
            }
            const res = await fetch(url, {
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
     
    }, [period, selectedDate, location.search]);

    // Buscar checklist para preview
    const previewChecklist = checklists?.find(c => c.id === previewId);

    const displayedChecklists = checklists.filter(c => {
        if (filterOrigen === 'todos') return true;
        if (filterOrigen === 'mesaControl') return c.origen === 'mesaControl' || c.origen === 'despacho';
        if (filterOrigen === 'mantenimiento') return c.origen === 'mantenimiento' || c.origen === 'encierro';
        return c.origen === filterOrigen;
    });

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
        // Quitar el foco (deseleccionar) inmediatamente después de elegir la fecha
        if (document.activeElement) {
            document.activeElement.blur();
        }
    };

    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
    };

    const handlePrintTable = async () => {
        setPreviewId(null);
        setIsGeneratingPdf(true);
        // Pequeña pausa para asegurar que el DOM (como cerrar el preview) esté actualizado
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
            const el = document.getElementById('reporte-pdf');
            if (!el) return;
            const canvas = await html2canvas(el, {
                scale: 1,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: el.scrollWidth,
                windowHeight: el.scrollHeight
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.6);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const margin = 8;
            const imgWidth = pdfWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = margin;

            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= (pdfHeight - (margin * 2));

            while (heightLeft > 2) {
                position -= (pdfHeight - (margin * 2));
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= (pdfHeight - (margin * 2));
            }

            pdf.save(`Historial_Checklist_${new Date().toISOString().slice(0, 10)}.pdf`);

            Swal.fire({
                icon: 'success',
                title: '¡Generado!',
                text: 'El reporte en PDF se ha generado y descargado correctamente.',
                confirmButtonColor: '#c29b53',
                timer: 2500
            });
        } catch (error) {
            console.error('Error al generar PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al generar el PDF.',
                confirmButtonColor: '#601a2a'
            });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const generarPDF = async (id, accion = 'download') => {
        const checklist = checklists?.find(c => c.id === id);
        if (!checklist) return;

        setDownloadingId(id);
        try {
            await generarPDFChecklist(checklist, accion);
        } catch (err) {
            console.error("Error al generar PDF:", err);
            alert(`Hubo un error al generar el PDF: ${err.message || err}`);
        } finally {
            setDownloadingId(null);
        }
    };

    // Estadísticas
    const totalChecklists = displayedChecklists?.length ?? 0;
    const unidadesBuenEstado = displayedChecklists?.filter(c => c.total_mal <= 3).length ?? 0;
    const unidadesConDanos = displayedChecklists?.filter(c => c.total_mal >= 4).length ?? 0;
    
    const periodLabel = PERIODS.find(p => p.key === period)?.label || 'Diario';

    return (
        <div className="layout-container">
            <Header hideBackButton={false} />
            
            <main className="main-content">
                <div id="reporte-pdf" className="bg-gray-50 p-1">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-semibold text-guinda-700">
                            <IconReport />
                            Historial de Check List
                        </h2>
                        {filterEconomico && (
                            <span className="mt-2 inline-block rounded-full bg-guinda-100 px-3 py-1 text-xs font-bold text-guinda-800">
                                Filtrando por Unidad: ECO {filterEconomico}
                            </span>
                        )}
                    </div>
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
                            <span>{p.icon}</span>
                            {p.label}
                        </button>
                    ))}

                    {/* Selector de fecha */}
                    <div className="ml-auto w-48">
                        <AppleDatePicker
                            value={selectedDate}
                            onChange={(val) => setSelectedDate(val)}
                        />
                    </div>
                </div>
                
                {/* ── Filtro por Origen ────────────────────────────────── */}
                <div className="mb-6 flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">Mostrar origen:</span>
                    <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200">
                        <button
                            onClick={() => setFilterOrigen('todos')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${filterOrigen === 'todos' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterOrigen('mesaControl')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${filterOrigen === 'mesaControl' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Mesa de Control
                        </button>
                        <button
                            onClick={() => setFilterOrigen('mantenimiento')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${filterOrigen === 'mantenimiento' ? 'bg-yellow-50 text-yellow-700 shadow-sm border border-yellow-200' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Mantenimiento P. V.
                        </button>
                    </div>
                </div>

                {/* ── Tarjetas de estadísticas ─────────────────────────── */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Checklists</p>
                        <p className="mt-1 text-3xl font-extrabold text-guinda-700">{cargando ? '-' : totalChecklists}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Unidad en buen estado</p>
                        <p className="mt-1 text-3xl font-extrabold text-emerald-600">{cargando ? '-' : unidadesBuenEstado}</p>
                    </div>
                    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Daños de unidad</p>
                        <p className="mt-1 text-3xl font-extrabold text-red-500">{cargando ? '-' : unidadesConDanos}</p>
                    </div>
                </div>

                {/* ── Tabla de checklists ──────────────────────────────── */}
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 px-5 py-4 gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">Checklists del periodo</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{displayedChecklists.length} registro{displayedChecklists.length !== 1 ? 's' : ''} mostrado{displayedChecklists.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrintTable}
                                disabled={displayedChecklists.length === 0 || isGeneratingPdf}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isGeneratingPdf ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <IconPrint />
                                        Imprimir Reporte
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {cargando ? (
                        <div className="p-10 text-center text-gray-500">Cargando registros...</div>
                    ) : totalChecklists > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80 sticky top-0 z-10 shadow-sm">
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
                                    {displayedChecklists.map((c, i) => {
                                        const fecha = new Date(c.fecha_hora);
                                        const fmtFecha = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                                        const fmtHora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <React.Fragment key={c.id}>
                                                <tr className="border-b border-gray-50 transition hover:bg-gray-50/50">
                                                {(() => {
                                                    const cond = CONDUCTORES.find(cd => cd.id === Number(c.conductor_id));
                                                    const condNombre = cond ? cond.nombre : (c.conductor_id || '—');
                                                    const condTarjeton = cond ? cond.tarjeton : '—';
                                                    return (
                                                        <>
                                                <td className="px-5 py-3 text-xs font-medium text-gray-400">
                                                    <div>#{c.id}</div>
                                                    {c.origen && (
                                                        <div className={`mt-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                                                            (c.origen === 'mesaControl' || c.origen === 'despacho')
                                                            ? 'bg-red-50 text-red-600' 
                                                            : 'bg-yellow-50 text-yellow-700'
                                                        }`}>
                                                            {(c.origen === 'mesaControl' || c.origen === 'despacho') ? 'Mesa de Control' : 'Mantenimiento'}
                                                        </div>
                                                    )}
                                                </td>
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
                                                <td className="px-5 py-3">
                                                    <p className="text-sm font-medium text-gray-800">{condNombre}</p>
                                                    {cond && <p className="text-[11px] text-gray-400">Tarjetón: {condTarjeton}</p>}
                                                </td>
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
                                                            onClick={() => setPreviewId(previewId === c.id ? null : c.id)}
                                                            className={`inline-flex items-center justify-center rounded-lg border p-1.5 shadow-sm transition active:scale-95 ${previewId === c.id ? 'bg-guinda-700 text-white border-guinda-700' : 'border-gray-200 bg-white text-guinda-600 hover:bg-guinda-50'}`}
                                                            title={previewId === c.id ? "Ocultar Detalle" : "Ver Detalle"}
                                                        >
                                                            <IconEye />
                                                        </button>
                                                        <button
                                                            onClick={() => generarPDF(c.id, 'download')}
                                                            disabled={downloadingId === c.id}
                                                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-blue-600 shadow-sm transition hover:bg-blue-50 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                                                            title="Descargar PDF"
                                                        >
                                                            {downloadingId === c.id ? (
                                                                <svg className="h-4 w-4 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                            ) : (
                                                                <IconDownload />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => generarPDF(c.id, 'print')}
                                                            disabled={downloadingId === c.id}
                                                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                                                            title="Imprimir"
                                                        >
                                                            <IconPrint />
                                                        </button>
                                                    </div>
                                                </td>
                                                        </>
                                                    );
                                                })()}
                                            </tr>
                                            {previewId === c.id && (
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan="9" className="p-0 border-b border-gray-200">
                                                        <div className="p-4 sm:p-6 animate-in slide-in-from-top-2">
                                                            <ChecklistPreviewInline 
                                                                previewChecklist={c}
                                                                setPreviewId={setPreviewId}
                                                                setLightboxImage={setLightboxImage}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center px-5 py-16 text-center animate-in fade-in zoom-in duration-300">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                                <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-300">
                                Intenta seleccionar otra fecha o periodo.
                            </p>
                        </div>
                    )}
                </div>
                </div>
            </main>

            {/* Modal para visualizar imágenes en grande */}
            {lightboxImage && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-opacity hide-on-print"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-full max-h-full flex items-center justify-center animate-in fade-in zoom-in duration-200">
                        <button 
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 font-bold text-base bg-black/50 px-4 py-2 rounded-full backdrop-blur-md"
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
                        >
                            Cerrar ✕
                        </button>
                        <img 
                            src={lightboxImage} 
                            alt="Vista ampliada" 
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" 
                        />
                    </div>
                </div>,
                document.body
            )}
            
            {/* Estilos para impresión */}
            <style>{`
                @media print {
                    .hide-on-print { display: none !important; }
                    .menu-page { background: white !important; padding: 0 !important; }
                    header, .menu-dashboard-grid, .bg-gray-50 { background: white !important; }
                    .printable-section { border: none !important; box-shadow: none !important; }
                    .page-break-before { page-break-before: always; }
                }
            `}</style>
        </div>
    );
}
