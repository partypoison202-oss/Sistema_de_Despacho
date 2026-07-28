import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import Header from '../../components/Header/Header';
import '../Unidades/DetalleUnidad.css';
import { useNavigate, useLocation } from 'react-router-dom';
import CameraModal from '../../components/CameraModal';
import CONDUCTORES from '../../data/conductores';
import API_BASE from '../../config/api';
import Swal from 'sweetalert2';


const MAX_OBS = 250; // límite de caracteres para observaciones

// Caché local para evitar recargar unidades del backend en cada selección
const ecosCache = {};

// ─── Tipos de unidad ──────────────────────────────────────────────────────────
const TIPOS_UNIDAD = [
    { value: 'URBANUSS', label: 'URBANUSS' },
    { value: 'ZAFIRO', label: 'ZAFIRO' },
    { value: 'VAGONETA', label: 'VAGONETA' },
    { value: 'ORION', label: 'ORION' },
];

// ─── Catálogo de servicios ────────────────────────────────────────────────────
const SERVICIOS = [
    { value: '', label: '— Selecciona un servicio —' },
    { value: 'T01', label: 'T-01 EXPRÉS' },
    { value: 'T02', label: 'T-02 EXPRÉS' },
    { value: 'T04', label: 'T-04 EXPRÉS' },
    { value: 'T05', label: 'T-05 PARADOR' },
    { value: 'SE', label: 'SERVICIO ESPECIAL' },
    { value: 'TM', label: 'TRANSPORTE METROPOLITANO' },
    { value: 'HP', label: 'HIDALGO EN POTENCIA' },
    { value: 'TLM', label: 'TRANSFORMANDO LA MOVILIDAD' },
];

const RUTAS_RA = [
    { value: '', label: '— Selecciona una ruta —' },
    { value: 'RA-01I', label: 'RA-01I' },
    { value: 'RA-01R', label: 'RA-01R' },
    { value: 'RA-02A', label: 'RA-02A' },
    { value: 'RA-02B', label: 'RA-02B' },
    { value: 'RA-02D', label: 'RA-02D' },
    { value: 'RA-02E', label: 'RA-02E' },
    { value: 'RA-03', label: 'RA-03' },
    { value: 'RA-04', label: 'RA-04' },
    { value: 'RA-05', label: 'RA-05' },
    { value: 'RA-06', label: 'RA-06' },
    { value: 'RA-07', label: 'RA-07' },
    { value: 'RA-08', label: 'RA-08' },
    { value: 'RA-09', label: 'RA-09' },
    { value: 'RA-10', label: 'RA-10' },
    { value: 'RA-11', label: 'RA-11' },
    { value: 'RA-12', label: 'RA-12' },
    { value: 'RA-13', label: 'RA-13' },
    { value: 'RA-14', label: 'RA-14' },
    { value: 'RA-15A', label: 'RA-15A' },
    { value: 'RA-15B', label: 'RA-15B' },
    { value: 'RA-15C', label: 'RA-15C' },
    { value: 'RA-16', label: 'RA-16' },
    { value: 'RA-17', label: 'RA-17' },
    { value: 'RA-19', label: 'RA-19' },
    { value: 'RA-20B', label: 'RA-20B' },
];

// ─── Puntos de revisión técnica ───────────────────────────────────────────────
const PUNTOS = [
    { id: 'carroceria_exterior', label: 'Carrocería', desc: 'Revisar estado general de la carrocería (golpes y abolladuras).' },
    { id: 'mobitec', label: 'Mobitec', desc: 'Verificar que prenda, funcione correctamente y no esté dañado.' },
    { id: 'torreta', label: 'Torreta', desc: 'Verificar que prenda, funcione correctamente y no esté dañado.' },
    { id: 'pintura_vinil', label: 'Pintura y vinil', desc: 'Verificar estado de pintura y vinil (desgaste, rayones, desprendimiento).' },
    { id: 'parabrisas_cristales', label: 'Parabrisas y cristales', desc: 'Revisar limpiaparabrisas, fisuras o daños en parabrisas y ventanas.' },
    { id: 'luces_exteriores', label: 'Luces', desc: 'Verificar funcionamiento de luces exteriores y interiores.' },
    { id: 'puertas', label: 'Puertas', desc: 'Revisar apertura, cierre y funcionamiento correcto.' },
    { id: 'llantas', label: 'Llantas', desc: 'Verificar presión, desgaste y estado general de las llantas.' },
    { id: 'rines', label: 'Rines', desc: 'Revisar estado de rines (golpes, fisuras, corrosión).' },
    { id: 'retrovisores', label: 'Retrovisores', desc: 'Verificar estado, limpieza y ajuste de retrovisores.' },
    { id: 'limpieza', label: 'Limpieza', desc: 'Limpieza general del interior y exterior.' },
    { id: 'asientos', label: 'Asientos', desc: 'Verificar el estado del asiento (fijación, desgaste, limpieza).' },
    { id: 'extintor_seguridad', label: 'Extintor y seguridad', desc: 'Verificar existencia y vigencia del extintor y equipo de seguridad.' },
    { id: 'documentacion', label: 'Documentación', desc: 'Revisar documentación de la unidad (tarjeta de circulación, póliza de seguro).' },
    { id: 'tecnologia', label: 'Tecnología', desc: 'Verificar funcionamiento del monitor (Unidad Urbanuss), cámaras, pantallas y bocinas.' },
    { id: 'alerta_tablero', label: 'Alerta en tablero', desc: 'Verificar qué tipo de alerta está prendida en el tablero.' },
];

const buildEstadoInicial = () =>
    PUNTOS.reduce((acc, p) => {
        acc[p.id] = { estado: 'bien', observaciones: '', fotos: [] };
        return acc;
    }, {});

// ─── Íconos ───────────────────────────────────────────────────────────────────
const IconCheck = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
);
const IconX = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
);
const IconClipboard = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M10.5 3A1.501 1.501 0 0 0 9 4.5h6A1.5 1.5 0 0 0 13.5 3h-3Zm-2.693.178A3 3 0 0 1 10.5 1.5h3a3 3 0 0 1 2.694 1.678c.497.042.992.092 1.486.15 1.497.173 2.57 1.46 2.57 2.929V19.5a3 3 0 0 1-3 3H6.75a3 3 0 0 1-3-3V6.257c0-1.47 1.073-2.756 2.57-2.93.493-.057.989-.107 1.487-.149Z" clipRule="evenodd" />
    </svg>
);
const Chevron = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);
const IconCamera = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
);

// ─── Reloj en tiempo real ─────────────────────────────────────────────────────
function RelojFecha() {
    const [ahora, setAhora] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setAhora(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    const fecha = ahora.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    const hora = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return (
        <div className="flex flex-col items-end text-right">
            <span className="text-xs font-semibold text-guinda-700">{fecha}</span>
            <span className="font-mono text-lg font-bold tabular-nums text-guinda-700">{hora}</span>
        </div>
    );
}

// ─── Select estilizado ────────────────────────────────────────────────────────
function SelectField({ id, label, value, onChange, options, disabled = false, required = false }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-guinda-700">
                {label}
            </label>
            <div className="relative">
                <select
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    required={required}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-4 pl-4 pr-10 text-base font-medium text-gray-800 transition focus:border-guinda-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-guinda-700/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value} disabled={o.disabled}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-guinda-700">
                    <Chevron />
                </span>
            </div>
        </div>
    );
}

// ─── Fila de revisión ─────────────────────────────────────────────────────────
function FilaPunto({ punto, datos, onChange, numero, onStartCamera }) {
    const { estado, observaciones: rawObservaciones, fotos: rawFotos } = datos || {};
    const observaciones = rawObservaciones || '';
    const fotos = Array.isArray(rawFotos) ? rawFotos : [];
    const [lightboxImage, setLightboxImage] = useState(null);
    const handleEstado = (valor) => onChange(punto.id, 'estado', estado === valor ? null : valor);
    const base = 'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-offset-1';
    const btnBien = [base, estado === 'bien'
        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 scale-105 focus:ring-emerald-400'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 focus:ring-emerald-300',
    ].join(' ');
    const btnMal = [base, estado === 'mal'
        ? 'bg-red-500 text-white shadow-md shadow-red-200 scale-105 focus:ring-red-400'
        : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 focus:ring-red-300',
    ].join(' ');

    return (
        <li id={`punto-${punto.id}`} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-guinda-700/10 text-base font-bold text-guinda-700">
                            {numero}
                        </span>
                        <span className="checklist-item-label text-lg font-bold text-gray-900 dark:text-white">{punto.label}</span>
                    </div>
                    <p className="checklist-item-desc mt-1 pl-10 text-base text-gray-600 dark:text-gray-300">{punto.desc}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <button type="button" onClick={() => handleEstado('bien')} className={btnBien} aria-pressed={estado === 'bien'}>
                        <IconCheck /> Bien
                    </button>
                    <button type="button" onClick={() => handleEstado('mal')} className={btnMal} aria-pressed={estado === 'mal'}>
                        <IconX /> Mal
                    </button>
                    {/* Botón de cámara (Evidencia) */}
                    <button
                        type="button"
                        title="Tomar foto de evidencia"
                        onClick={() => onStartCamera(punto.id)}
                        disabled={fotos.length >= 10}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-400 ${fotos.length > 0
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-200 hover:text-gray-700'
                            } ${fotos.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <IconCamera />
                        {fotos.length > 0 && (
                            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-sm">
                                {fotos.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Contenedor de observaciones y fotos */}
            <div className="mt-3 flex flex-col gap-3">
                <div className="w-full">
                    <textarea
                        id={`obs-${punto.id}`}
                        rows={2}
                        maxLength={MAX_OBS}
                        value={observaciones}
                        onChange={(e) => onChange(punto.id, 'observaciones', e.target.value.slice(0, MAX_OBS))}
                        placeholder="Observaciones (opcional)…"
                        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 transition focus:border-guinda-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-guinda-700/20"
                    />
                    <div className="mt-1 flex justify-end">
                        <span className={`text-[10px] font-medium ${observaciones.length >= MAX_OBS ? 'text-red-500' : 'text-gray-300'}`}>
                            {observaciones.length}/{MAX_OBS}
                        </span>
                    </div>
                </div>

                {/* Previews de fotos en miniatura */}
                {fotos && fotos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {fotos.map((fotoUrl, idx) => (
                            <div key={idx} className="relative flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-1 w-20 h-20">
                                <img
                                    src={fotoUrl}
                                    alt={`Foto ${idx + 1} de ${punto.label}`}
                                    className="h-full w-full rounded object-cover cursor-zoom-in"
                                    onClick={() => setLightboxImage(fotoUrl)}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nuevas = fotos.filter((_, i) => i !== idx);
                                        onChange(punto.id, 'fotos', nuevas);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition focus:outline-none"
                                    title="Eliminar foto"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal para previsualizar la foto en grande */}
            {lightboxImage && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-opacity"
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
        </li>
    );
}

// ─── Componentes: Pizarra de Dibujo ─────────────────────────────────────────────
const DrawingCanvas = forwardRef(function DrawingCanvas({ onSave, tipoUnidad }, ref) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const isDrawing = useRef(false);
    const pathsRef = useRef([]);
    const currentPathRef = useRef(null);
    const historyRef = useRef([]);
    const [color, setColor] = useState('#ef4444');
    const [brushSize, setBrushSize] = useState(3);
    const [mode, setMode] = useState('pencil'); // 'pencil' | 'eraser'
    const [canUndo, setCanUndo] = useState(false);

    const COLORS = [
        { value: '#ef4444', label: 'Rojo' },
        { value: '#f59e0b', label: 'Amarillo' },
        { value: '#3b82f6', label: 'Azul' },
        { value: '#10b981', label: 'Verde' },
        { value: '#1f2937', label: 'Negro' },
    ];

    // ── Inicializar canvas ──────────────────────────────────────────────
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    useEffect(() => {
        initCanvas();
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            initCanvas();
            renderAllPaths();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [initCanvas]);

    // ── Renderizado de todos los trazos ────────────────────────────────
    const renderAllPaths = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        pathsRef.current.forEach(path => {
            if (path.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        });

        if (currentPathRef.current && currentPathRef.current.points.length > 1) {
            const path = currentPathRef.current;
            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    }, []);

    // ── Guardar snapshot en historial ──────────────────────────────
    const saveSnapshot = useCallback(() => {
        const copy = JSON.parse(JSON.stringify(pathsRef.current));
        historyRef.current.push(copy);
        if (historyRef.current.length > 30) historyRef.current.shift();
        setCanUndo(true);
    }, []);

    // ── Obtener posición (mouse/touch) ──────────────────────────────
    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    };

    // ── Borrar trazo más cercano al punto ──────────────────────────────
    const eraseAt = useCallback((pos) => {
        const threshold = 20; // <--- solo una declaración
        let minDist = Infinity;
        let indexToRemove = -1;

        pathsRef.current.forEach((path, idx) => {
            for (let p of path.points) {
                const dx = p.x - pos.x;
                const dy = p.y - pos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < minDist) {
                    minDist = dist;
                    indexToRemove = idx;
                }
            }
        });

        if (indexToRemove !== -1 && minDist <= threshold) {
            pathsRef.current.splice(indexToRemove, 1);
            saveSnapshot();
            renderAllPaths();
            if (onSave) {
                const canvas = canvasRef.current;
                const dpr = window.devicePixelRatio || 1;
                const composite = document.createElement('canvas');
                composite.width = canvas.width;
                composite.height = canvas.height;
                const compCtx = composite.getContext('2d');
                const blueprintUrl = `/images/${(tipoUnidad || 'hero').toLowerCase()}${tipoUnidad ? '_blueprint' : ''}.webp`;
                const bgImg = new Image();
                bgImg.onload = () => {
                    compCtx.globalAlpha = 0.6;
                    compCtx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                    compCtx.globalAlpha = 1.0;
                    compCtx.drawImage(canvas, 0, 0);
                    onSave(composite.toDataURL('image/png'));
                };
                bgImg.onerror = () => {
                    compCtx.drawImage(canvas, 0, 0);
                    onSave(composite.toDataURL('image/png'));
                };
                bgImg.src = blueprintUrl;
            }
        }
    }, [onSave, renderAllPaths, saveSnapshot, tipoUnidad]);

    // ── Eventos de dibujo ──────────────────────────────────────────────
    const startDraw = (e) => {
        e.preventDefault();
        const pos = getPos(e);

        if (mode === 'eraser') {
            eraseAt(pos);
            return;
        }

        // Modo lápiz: iniciar nuevo trazo
        saveSnapshot();
        isDrawing.current = true;
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);


        if (color === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 20; // Tamaño de goma fijo y grande
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSize;
        }

        // Crear el trazo actual
        currentPathRef.current = {
            points: [{ ...pos }],
            color: color === 'eraser' ? '#ffffff' : color,
            size: brushSize,
        };
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing.current || mode === 'eraser') return;
        const pos = getPos(e);
        const path = currentPathRef.current;
        if (!path) return;
        path.points.push(pos);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const len = path.points.length;
        if (len >= 2) {
            ctx.beginPath();
            ctx.moveTo(path.points[len-2].x, path.points[len-2].y);
            ctx.lineTo(path.points[len-1].x, path.points[len-1].y);
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
        ctx.restore();
    };

    const stopDraw = (e) => {
        if (e) e.preventDefault();
        if (!isDrawing.current || mode === 'eraser') {
            isDrawing.current = false;
            return;
        }
        isDrawing.current = false;

        const path = currentPathRef.current;
        if (path && path.points.length > 1) {
            pathsRef.current.push(path);
        }
        currentPathRef.current = null;
        renderAllPaths();

        if (onSave) {
            const canvas = canvasRef.current;
            const dpr = window.devicePixelRatio || 1;
            const composite = document.createElement('canvas');
            composite.width = canvas.width;
            composite.height = canvas.height;
            const compCtx = composite.getContext('2d');
            const blueprintUrl = `/images/${(tipoUnidad || 'hero').toLowerCase()}${tipoUnidad ? '_blueprint' : ''}.webp`;
            const bgImg = new Image();
            bgImg.onload = () => {
                compCtx.globalAlpha = 0.6;
                compCtx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                compCtx.globalAlpha = 1.0;
                compCtx.drawImage(canvas, 0, 0);
                onSave(composite.toDataURL('image/png'));
            };
            bgImg.onerror = () => {
                compCtx.drawImage(canvas, 0, 0);
                onSave(composite.toDataURL('image/png'));
            };
            bgImg.src = blueprintUrl;
        }
    };

    // ── Deshacer ────────────────────────────────────────────────────────
    const handleUndo = () => {
        if (historyRef.current.length === 0) return;
        const prev = historyRef.current.pop();
        pathsRef.current = prev;
        currentPathRef.current = null;
        renderAllPaths();
        setCanUndo(historyRef.current.length > 0);
        if (onSave) {
            const canvas = canvasRef.current;
            const dpr = window.devicePixelRatio || 1;
            const composite = document.createElement('canvas');
            composite.width = canvas.width;
            composite.height = canvas.height;
            const compCtx = composite.getContext('2d');
            const blueprintUrl = `/images/${(tipoUnidad || 'hero').toLowerCase()}${tipoUnidad ? '_blueprint' : ''}.webp`;
            const bgImg = new Image();
            bgImg.onload = () => {
                compCtx.globalAlpha = 0.6;
                compCtx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                compCtx.globalAlpha = 1.0;
                compCtx.drawImage(canvas, 0, 0);
                onSave(composite.toDataURL('image/png'));
            };
            bgImg.onerror = () => {
                compCtx.drawImage(canvas, 0, 0);
                onSave(composite.toDataURL('image/png'));
            };
            bgImg.src = blueprintUrl;
        }
    };

    // ── Limpiar todo ─────────────────────────────────────────────────────
    const handleClear = () => {
        saveSnapshot();
        pathsRef.current = [];
        currentPathRef.current = null;
        renderAllPaths();
        if (onSave) onSave(null);
    };

    // ── Exponer método clear al padre ──────────────────────────────────
    useImperativeHandle(ref, () => ({
        clear: handleClear
    }));

    // ── Alternar modo ───────────────────────────────────────────────────
    const toggleMode = () => {
        setMode(prev => prev === 'pencil' ? 'eraser' : 'pencil');
        if (isDrawing.current) {
            isDrawing.current = false;
            currentPathRef.current = null;
            renderAllPaths();
        }
    };

    // ── Render ──────────────────────────────────────────────────────────
    return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
                {/* Colores */}
                <div className="flex items-center gap-1.5">
                    {COLORS.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            title={c.label}
                            onClick={() => setColor(c.value)}
                            className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c.value ? 'scale-110 border-gray-800 shadow' : 'border-transparent hover:scale-105'
                                }`}
                            style={{ backgroundColor: c.value }}
                        />
                    ))}
                    <div className="mx-1 h-5 w-px bg-gray-200" />
                    <button
                        type="button"
                        title="Borrador"
                        onClick={() => setColor('eraser')}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-all ${color === 'eraser' ? 'border-gray-800 bg-gray-100 shadow' : 'border-transparent bg-gray-50 hover:bg-gray-200 text-gray-500'}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16.5 14.5L10.5 8.5" />
                        </svg>
                    </button>
                </div>

                <div className="mx-1 h-5 w-px bg-gray-200" />

                {/* Tamaño de pincel (solo en modo lápiz) */}
                {mode === 'pencil' && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Grosor</span>
                        {[2, 4, 6].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setBrushSize(s)}
                                className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${brushSize === s
                                    ? 'bg-gray-800 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                <span className="rounded-full bg-current" style={{ width: s + 2, height: s + 2 }} />
                            </button>
                        ))}
                    </div>
                )}

                <div className="mx-1 h-5 w-px bg-gray-200" />

                {/* Botón modo goma */}
                <button
                    type="button"
                    onClick={toggleMode}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${mode === 'eraser'
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 4l6 6-8 8-6-6 8-8z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16" />
                    </svg>
                    {mode === 'eraser' ? 'Goma activa' : 'Goma'}
                </button>

                <div className="ml-auto flex gap-1.5">
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-30"
                    >
                        Deshacer
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                    >
                        Limpiar
                    </button>
                </div>
            </div>

            {/* Canvas con imagen de fondo */}
            <div
                ref={containerRef}
                className="relative w-full"
                style={{ 
                    aspectRatio: '5/3',
                    cursor: (() => {
                        const isEraser = color === 'eraser';
                        const scale = isEraser ? 2 : 1;
                        const size = Math.max(brushSize * scale * 2, 12); 
                        const radius = size / 2;
                        const strokeColor = isEraser ? '%234b5563' : color.replace('#', '%23');
                        const fill = isEraser ? 'rgba(255,255,255,0.4)' : 'none';
                        const center = (size + 4) / 2;
                        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size+4}" height="${size+4}" viewBox="0 0 ${size+4} ${size+4}"><circle cx="${center}" cy="${center}" r="${radius}" fill="${fill}" stroke="${strokeColor}" stroke-width="1.5"/></svg>`;
                        return `url('data:image/svg+xml;utf8,${svg}') ${center} ${center}, crosshair`;
                    })()
                }}
            >
                {/* Imagen de referencia como fondo según tipo de unidad */}
                <img
                    src={`/images/${(tipoUnidad || 'hero').toLowerCase()}${tipoUnidad ? '_blueprint' : ''}.webp`}
                    alt={`Blueprint de ${tipoUnidad}`}
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none opacity-60"
                    draggable={false}
                    onError={(e) => { e.target.src = '/images/hero.webp'; }}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full touch-none"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                    onTouchCancel={stopDraw}
                />
            </div>

            <p className="border-t border-gray-100 px-4 py-2.5 text-center text-[11px] text-gray-400">
                {mode === 'pencil'
                    ? 'Dibuja sobre la imagen para señalar los detalles o problemas encontrados'
                    : 'Toca sobre un trazo para borrarlo por completo'}
            </p>
        </div>
    );
});

// Comprimir y redimensionar imagen en Base64 para optimizar almacenamiento
const compressImage = (dataUrl, maxWidth = 800, maxHeight = 600) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressed);
        };
        img.onerror = (err) => reject(err);
    });
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ChecklistForm({
    inline = false,
    prefillData = null,
    checklistId = null,
    onComplete = null,
    onClose = null,
    origen = 'despacho',
    editMode = false
}) {
    const navigate = useNavigate();
    const location = useLocation();
    // ── Paso 1: selección de unidad ───────────────────────────────────────────
    const [tipoUnidad, setTipoUnidad] = useState('');
    const [ecosList, setEcosList] = useState([]);
    const [loadingEcos, setLoadingEcos] = useState(false);
    const [isManualEco, setIsManualEco] = useState(false);

    // ── Datos del formulario ──────────────────────────────────────────────────
    // *** CORREGIDO: eliminadas las declaraciones duplicadas ***
    const [conductorId, setConductorId] = useState('');
    const [conductorTarjeton, setConductorTarjeton] = useState('');
    const [conductorNombre, setConductorNombre] = useState('');
    const [economico, setEconomico] = useState('');
    const [servicio, setServicio] = useState('');
    const [puntos, setPuntos] = useState(buildEstadoInicial);
    const [enviado, setEnviado] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedChecklist, setSavedChecklist] = useState(null);
    const [dibujo, setDibujo] = useState(null);
    const fechaHoraRef = useRef(new Date());
    const drawingCanvasRef = useRef(null);
    const hideTop = inline || (new URLSearchParams(location.search).get('hide_top') === 'true');

    // ── Cámara y Evidencias ───────────────────────────────────────────────────
    const [activePuntoId, setActivePuntoId] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const handleStartCamera = (puntoId) => {
        setActivePuntoId(puntoId);
        setShowCamera(true);
    };

    // Auto-cargar unidad si viene en la URL o prefillData
    useEffect(() => {
        let qEco, qTipoRaw, qServicio, qConductorNombre;

        if (inline && prefillData) {
            qEco = prefillData.numero_eco;
            qTipoRaw = prefillData.tipoTransporte;
            qServicio = prefillData.servicio;
            qConductorNombre = prefillData.conductorNombre;
            if (editMode && prefillData.puntos) {
                try {
                    const parsedPuntos = typeof prefillData.puntos === 'string' ? JSON.parse(prefillData.puntos) : prefillData.puntos;
                    if (parsedPuntos && typeof parsedPuntos === 'object') {
                        setPuntos(parsedPuntos);
                    }
                } catch (e) {
                    console.error("Error parsing puntos from prefillData:", e);
                }
            }
            if (editMode && prefillData.dibujo) {
                setDibujo(prefillData.dibujo);
            }
        } else {
            const queryParams = new URLSearchParams(location.search);
            qEco = queryParams.get('numero_eco');
            qTipoRaw = queryParams.get('tipoTransporte');
            qServicio = queryParams.get('servicio');
        }

        if (qTipoRaw) {
            let normalizedTipo = qTipoRaw.toUpperCase();
            if (normalizedTipo === 'URBANUS') normalizedTipo = 'URBANUSS';

            const loadUrlUnit = async () => {
                await handleTipoUnidad(normalizedTipo, true);
                if (qEco) {
                    setEconomico(qEco);
                }
                if (qServicio) {
                    setServicio(decodeURIComponent(qServicio));
                }
                if (qConductorNombre) {
                    const esNumero = !isNaN(qConductorNombre) && String(qConductorNombre).trim() !== '';
                    const conductorEncontrado = esNumero
                        ? CONDUCTORES.find(c => c.id === Number(qConductorNombre))
                        : CONDUCTORES.find(c => c.nombre.trim().toUpperCase() === String(qConductorNombre).trim().toUpperCase());

                    if (conductorEncontrado) {
                        setConductorNombre(conductorEncontrado.nombre);
                        setConductorId(String(conductorEncontrado.id));
                        setConductorTarjeton(conductorEncontrado.tarjeton);
                    } else {
                        setConductorNombre(qConductorNombre);
                    }
                }
            };
            loadUrlUnit();
        }

    }, [location.search, inline, prefillData?.numero_eco, prefillData?.tipoTransporte]);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (file && activePuntoId) {
            setShowCamera(false);
            // *** CORREGIDO: se eliminó la línea duplicada `setShowCamera(false);` ***
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const compressed = await compressImage(event.target.result);
                    setPuntos(prev => {
                        const currentFotos = prev[activePuntoId].fotos || [];
                        if (currentFotos.length >= 10) return prev;
                        return { ...prev, [activePuntoId]: { ...prev[activePuntoId], fotos: [...currentFotos, compressed] } };
                    });
                } catch (err) {
                    console.error("Error al comprimir imagen, usando original:", err);
                    setPuntos(prev => {
                        const currentFotos = prev[activePuntoId].fotos || [];
                        if (currentFotos.length >= 10) return prev;
                        return { ...prev, [activePuntoId]: { ...prev[activePuntoId], fotos: [...currentFotos, event.target.result] } };
                    });
                    setTimeout(() => {
                        document.getElementById(`punto-${activePuntoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCaptureCamera = async (dataUrl) => {
        if (activePuntoId) {
            try {
                const compressed = await compressImage(dataUrl);
                setPuntos(prev => {
                    const currentFotos = prev[activePuntoId].fotos || [];
                    if (currentFotos.length >= 10) return prev;
                    return { ...prev, [activePuntoId]: { ...prev[activePuntoId], fotos: [...currentFotos, compressed] } };
                });
                setTimeout(() => {
                    document.getElementById(`punto-${activePuntoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            } catch (err) {
                console.error("Error al comprimir foto capturada:", err);
                setPuntos(prev => {
                    const currentFotos = prev[activePuntoId].fotos || [];
                    if (currentFotos.length >= 10) return prev;
                    return { ...prev, [activePuntoId]: { ...prev[activePuntoId], fotos: [...currentFotos, dataUrl] } };
                });
            }
        }
    };

    // ── Lógica de control ─────────────────────────────────────────────────────
    const unidadSeleccionada = tipoUnidad !== '';

    const handleTipoUnidad = async (tipo, forceLoad = false) => {
        if (tipoUnidad !== tipo || forceLoad) {
            setTipoUnidad(tipo);
            setEconomico('');
            setEcosList([]);
            setConductorId('');
            setConductorTarjeton('');
            setConductorNombre('');
            setServicio('');

            if (!tipo) return;

            if (ecosCache[tipo] && !forceLoad) {
                setEcosList(ecosCache[tipo]);
                return;
            }

            setLoadingEcos(true);
            try {
                const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
                const res = await fetch(`${API_BASE}/api/unidades/listar/${tipo}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    let data = await res.json();

                    if ((!data || data.length === 0) && tipo === 'URBANUSS') {
                        data = Array.from({ length: 42 }, (_, i) => ({ numero_eco: String(i + 1) }));
                    }

                    ecosCache[tipo] = data || [];
                    setEcosList(ecosCache[tipo]);
                } else {
                    let fallback = [];
                    if (tipo === 'URBANUSS') fallback = Array.from({ length: 42 }, (_, i) => ({ numero_eco: String(i + 1) }));
                    ecosCache[tipo] = fallback;
                    setEcosList(fallback);
                }
            } catch (err) {
                console.error('Error obteniendo económicos:', err);
                let fallback = [];
                if (tipo === 'URBANUSS') fallback = Array.from({ length: 42 }, (_, i) => ({ numero_eco: String(i + 1) }));
                setEcosList(fallback);
            } finally {
                setLoadingEcos(false);
            }
        }
    };

    const handleEconomicoChange = (ecoValue) => {
        setEconomico(ecoValue);
    };

    const totalBien = Object.values(puntos || {}).filter((p) => p?.estado === 'bien').length;
    const totalMal = Object.values(puntos || {}).filter((p) => p?.estado === 'mal').length;
    const totalPendiente = PUNTOS.length - totalBien - totalMal;
    const progreso = Math.round(((totalBien + totalMal) / PUNTOS.length) * 100);

    const handleCambioPunto = (id, campo, valor) =>
        setPuntos((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));

    const handleConductorId = (e) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 10);
        setConductorId(v);

        if (v) {
            const numId = Number(v);
            const cond = CONDUCTORES.find((c) => c.id === numId);
            if (cond) {
                setConductorNombre(cond.nombre);
                setConductorTarjeton(cond.tarjeton);
            } else {
                setConductorNombre('');
                setConductorTarjeton('');
            }
        } else {
            setConductorNombre('');
            setConductorTarjeton('');
        }
    };

    const handleReset = () => {
        setTipoUnidad('');
        setConductorId('');
        setEconomico('');
        setDibujo(null);
        setServicio('');
        setPuntos(buildEstadoInicial());
        setEnviado(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        fechaHoraRef.current = new Date();
        fetch(editMode && checklistId ? `${API_BASE}/api/checklist/${checklistId}` : `${API_BASE}/api/checklist`, {
            method: editMode && checklistId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`
            },
            body: JSON.stringify({
                tipo_unidad: tipoUnidad,
                conductor_id: conductorId,
                economico,
                servicio: servicio || 'No especificado',
                puntos,
                dibujo,
                fecha_hora: fechaHoraRef.current.toISOString(),
                origen
            })
        })
            .then(async res => {
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    const msg = errData.message || JSON.stringify(errData.errors || 'Error al guardar');
                    throw new Error(msg);
                }
                return res.json();
            })
            .then(data => {
                setSavedChecklist(data.checklist);
                if (inline && onComplete) {
                    onComplete(data.checklist);
                } else {
                    setEnviado(true);
                    window.scrollTo(0, 0);
                }
            })
            .catch(err => {
                console.error('Error al guardar checklist:', err);
                alert('❌ No se pudo guardar el checklist:\n' + err.message);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };


    // ── Pantalla de confirmación ──────────────────────────────────────────────
    if (enviado) {
        const fmtFecha = fechaHoraRef.current.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
        const fmtHora = fechaHoraRef.current.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        return (
            <div className={inline ? "w-full" : "menu-page"}>
                {!hideTop && <Header hideBackButton={false} />}
                <main className={inline ? "w-full py-4" : "dashboard-main max-w-2xl mx-auto px-4 py-6"}>
                    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
                        <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-lg">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="mb-1 text-xl font-bold text-gray-900">¡Checklist guardado!</h3>
                            <p className="text-sm text-gray-500">
                                <span className="font-semibold text-guinda-700">{tipoUnidad}</span>
                                {conductorId && <> · ID Conductor: {conductorId}</>}
                            </p>
                            <p className="mb-1 text-sm text-gray-500">
                                {tipoUnidad === 'URBANUSS' ? 'Servicio:' : 'RA (Ruta):'}{' '}
                                <span className="font-semibold text-guinda-700">
                                    {tipoUnidad === 'URBANUSS'
                                        ? (SERVICIOS.find((s) => s.value === servicio)?.label ?? servicio)
                                        : (RUTAS_RA.find((s) => s.value === servicio)?.label ?? servicio)}
                                </span>
                            </p>
                            <p className="mb-2 text-xs text-gray-400">{fmtFecha} — {fmtHora}</p>
                            <div className="mb-6 flex flex-col items-center gap-2">
                                <p className="text-sm text-gray-400">{totalBien} bien · {totalMal} con fallas</p>
                                {totalMal <= 3 ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                        UNIDAD EN BUEN ESTADO
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                        DAÑOS DE UNIDAD
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-3">
                                {inline ? (
                                    <button
                                        type="button"
                                        onClick={() => onComplete ? onComplete(savedChecklist) : (onClose && onClose())}
                                        className="w-full rounded-xl border-none text-white shadow-lg transition-transform duration-100"
                                        style={{
                                            backgroundColor: '#c29b53',
                                            fontSize: '1.25rem',
                                            fontWeight: '800',
                                            padding: '1rem'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#a88344'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#c29b53'}
                                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        Cerrar Check List
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="w-full rounded-xl bg-guinda-700 py-3 text-sm font-bold text-white transition hover:bg-guinda-800 active:scale-95 focus:outline-none"
                                        >
                                            Nuevo Checklist
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/checklist/historial')}
                                            className="w-full rounded-xl border border-guinda-700 py-3 text-sm font-bold text-guinda-700 transition hover:bg-guinda-50 active:scale-95 focus:outline-none"
                                        >
                                            Revisar Check List
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ── Formulario ────────────────────────────────────────────────────────────
    return (
        <div className={inline ? "inline-checklist" : "layout-container"}>
            {!hideTop && <Header hideBackButton={false} />}
            <main className={inline ? "py-2" : "main-content relative"}>
                {!hideTop && (
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="flex items-center gap-2 text-xl font-semibold text-guinda-700 uppercase">
                            <IconClipboard />
                            Checklist de Unidades {tipoUnidad}
                        </h2>
                        <RelojFecha />
                    </div>
                )}

                <div className={inline ? "w-full" : "w-full"}>
                    {inline && (
                        <div className="flex justify-end mb-4">
                            <button
                                type="button"
                                onClick={() => onClose && onClose()}
                                className="group flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-600 shadow-sm transition-all hover:border-guinda-200 hover:bg-guinda-50 hover:text-guinda-700 active:scale-95"
                            >
                                <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                                Contraer Check List
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} noValidate>

                        {/* ══ PASO 1 — Económico ══════════════════════════════ */}
                        {!hideTop && (
                            <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                {tipoUnidad && (
                                    <>
                                        <div className="flex items-center justify-between mb-3 mt-2">
                                            <label htmlFor="economico" className="block text-xs font-bold uppercase tracking-widest text-guinda-700">
                                                1 · Económico (Eco)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsManualEco(!isManualEco);
                                                    setEconomico('');
                                                    setConductorNombre('');
                                                    setConductorTarjeton('');
                                                    setServicio('');
                                                    setConductorId('');
                                                }}
                                                className="text-[10px] font-bold uppercase tracking-wider text-blue-600 underline hover:text-blue-800"
                                            >
                                                {isManualEco ? 'Seleccionar de lista' : 'Ingresar manual'}
                                            </button>
                                        </div>

                                        {isManualEco ? (
                                            <input
                                                id="economico"
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={4}
                                                value={economico}
                                                onChange={(e) => handleEconomicoChange(e.target.value)}
                                                placeholder="Ej. 11"
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base font-medium text-gray-800 placeholder-gray-400 transition focus:border-guinda-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-guinda-700/20"
                                            />
                                        ) : (
                                            <div className="relative">
                                                <select
                                                    id="economico"
                                                    value={economico}
                                                    onChange={(e) => handleEconomicoChange(e.target.value)}
                                                    disabled={loadingEcos}
                                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 pr-10 text-base font-medium text-gray-800 transition focus:border-guinda-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-guinda-700/20 disabled:opacity-50"
                                                >
                                                    <option value="" disabled>
                                                        {loadingEcos ? 'Cargando unidades...' : '— Selecciona un ECO —'}
                                                    </option>
                                                    {ecosList.map((ecoItem) => {
                                                        const formattedNum = String(ecoItem.numero_eco).padStart(3, '0');
                                                        return (
                                                            <option key={ecoItem.numero_eco} value={ecoItem.numero_eco}>
                                                                {`ECO${formattedNum}`}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-guinda-700">
                                                    <Chevron />
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                                {!tipoUnidad && (
                                    <p className="text-center text-xs text-gray-400">
                                        Cargando tipo de unidad...
                                    </p>
                                )}
                            </section>
                        )}

                        {/* ══ PASO 2 — Datos de la unidad (bloqueado hasta elegir tipo) ══ */}
                        <div className={`transition-all duration-300 ${unidadSeleccionada ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>

                            {!hideTop && (
                                <>
                                    <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-guinda-700">
                                            2 · Identificación del Conductor
                                            {tipoUnidad && (
                                                <span className="ml-2 rounded-full bg-guinda-700/10 px-2 py-0.5 text-guinda-700">
                                                    {tipoUnidad}
                                                </span>
                                            )}
                                        </p>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                                            <div className="sm:col-span-3">
                                                <label htmlFor="conductor-id" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-guinda-700">
                                                    ID Conductor
                                                </label>
                                                <input
                                                    id="conductor-id"
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    maxLength={10}
                                                    value={conductorId}
                                                    onChange={handleConductorId}
                                                    placeholder="Ej. 104"
                                                    disabled={!unidadSeleccionada}
                                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base font-medium text-gray-800 placeholder-gray-400 transition focus:border-guinda-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-guinda-700/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="tarjeton" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-guinda-700">
                                                    Tarjetón
                                                </label>
                                                <input
                                                    id="tarjeton"
                                                    type="text"
                                                    value={conductorTarjeton}
                                                    onChange={(e) => setConductorTarjeton(e.target.value)}
                                                    placeholder="Ej. 12345"
                                                    disabled={!unidadSeleccionada}
                                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base font-medium text-gray-800 transition focus:border-guinda-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-guinda-700/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </div>

                                            <div className="sm:col-span-6 relative">
                                                <label htmlFor="nombre-conductor" className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-guinda-700 h-4">
                                                    Conductor Asignado
                                                    {conductorId && !CONDUCTORES.find((c) => c.id === Number(conductorId)) && (
                                                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 absolute -top-1 right-0">No encontrado</span>
                                                    )}
                                                </label>
                                                <input
                                                    id="nombre-conductor"
                                                    type="text"
                                                    value={conductorNombre}
                                                    onChange={(e) => setConductorNombre(e.target.value)}
                                                    placeholder="Ej. Juan Pérez"
                                                    disabled={!unidadSeleccionada}
                                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-base font-medium text-gray-800 transition focus:border-guinda-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-guinda-700/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </div>

                                        </div>
                                    </section>

                                    <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                                        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-guinda-700">
                                            3 · {tipoUnidad === 'URBANUSS' ? 'Servicio' : 'RA (Ruta)'}
                                        </p>
                                        {tipoUnidad === 'URBANUSS' ? (
                                            <SelectField
                                                id="servicio"
                                                label=""
                                                value={servicio}
                                                onChange={setServicio}
                                                disabled={!unidadSeleccionada || (!!servicio && hideTop)}
                                                required
                                                options={SERVICIOS.map((s) => ({ value: s.value, label: s.label, disabled: s.value === '' }))}
                                            />
                                        ) : (
                                            <SelectField
                                                id="servicio"
                                                label=""
                                                value={servicio}
                                                onChange={setServicio}
                                                disabled={!unidadSeleccionada || (!!servicio && hideTop)}
                                                required
                                                options={RUTAS_RA.map((s) => ({ value: s.value, label: s.label, disabled: s.value === '' }))}
                                            />
                                        )}
                                    </section>
                                </>
                            )}

                            <div className="mb-4 grid grid-cols-2 gap-3 text-center">
                                <div className="rounded-xl bg-emerald-50 py-3">
                                    <p className="text-2xl font-extrabold text-emerald-600">{totalBien}</p>
                                    <p className="text-xs font-semibold text-emerald-700">Bien</p>
                                </div>
                                <div className="rounded-xl bg-red-50 py-3">
                                    <p className="text-2xl font-extrabold text-red-500">{totalMal}</p>
                                    <p className="text-xs font-semibold text-red-700">Mal</p>
                                </div>
                            </div>

                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex-1 overflow-hidden rounded-full bg-gray-100" style={{ height: '6px' }}>
                                    <div
                                        className="h-full rounded-full bg-guinda-700 transition-all duration-500"
                                        style={{ width: `${progreso}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-guinda-700">{progreso}%</span>
                            </div>

                            <section className="mb-6">
                                <h3 className="mb-4 text-lg font-extrabold text-guinda-700 dark:text-red-400">
                                    {!hideTop && '4 · '}Puntos de Revisión Técnica — {PUNTOS.length} ítems
                                </h3>
                                <ul className="space-y-3">
                                    {PUNTOS.map((punto, idx) => (
                                        <FilaPunto
                                            key={punto.id}
                                            punto={punto}
                                            datos={puntos[punto.id]}
                                            onChange={handleCambioPunto}
                                            numero={idx + 1}
                                            onStartCamera={handleStartCamera}
                                        />
                                    ))}
                                </ul>
                            </section>

                            <section className="mb-6">
                                <h3 className="mb-4 text-lg font-extrabold text-[#6b1d33]">
                                    {!hideTop && '5 · '}Referencia visual — Marca los detalles
                                </h3>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
                                    <DrawingCanvas
                                        onSave={setDibujo}
                                        tipoUnidad={tipoUnidad}
                                        ref={drawingCanvasRef}
                                    />
                                </div>
                            </section>

                            <div className="pb-10">
                                <div className={`flex flex-col-reverse sm:flex-row gap-4 ${!inline ? 'justify-end' : ''}`}>
                                    {inline && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                Swal.fire({
                                                    title: '¿Limpiar todo?',
                                                    text: "Se borrarán todos los puntos evaluados y la evidencia visual. ¿Estás seguro?",
                                                    icon: 'warning',
                                                    showCancelButton: true,
                                                    confirmButtonColor: '#6b1d33',
                                                    cancelButtonColor: '#9ca3af',
                                                    confirmButtonText: 'Sí, limpiar todo',
                                                    cancelButtonText: 'Cancelar'
                                                }).then((result) => {
                                                    if (result.isConfirmed) {
                                                        setDibujo(null);
                                                        setPuntos(buildEstadoInicial());
                                                        drawingCanvasRef.current?.clear();
                                                    }
                                                });
                                            }}
                                            className="group w-full sm:w-1/3 flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-gray-600 shadow-sm transition-all duration-100 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-800 active:scale-95"
                                            style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '700',
                                                padding: '1rem'
                                            }}
                                        >
                                            <svg className="w-5 h-5 transition-transform group-hover:-rotate-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Limpiar todo
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={!unidadSeleccionada || (!hideTop && !servicio) || isSubmitting}
                                        className={`w-full ${inline ? 'sm:w-2/3' : ''} rounded-xl border-none text-white shadow-lg transition-transform duration-100 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110 active:scale-95 flex items-center justify-center gap-2`}
                                        style={{
                                            backgroundColor: '#6b1d33',
                                            fontSize: '1.25rem',
                                            fontWeight: '800',
                                            padding: '1rem'
                                        }}
                                    >
                                        {isSubmitting && (
                                            <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', margin: 0, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff', flexShrink: 0, aspectRatio: '1', boxSizing: 'border-box' }}></span>
                                        )}
                                        {isSubmitting ? 'Guardando...' : (editMode ? 'Actualizar Checklist' : 'Guardar Checklist')}
                                    </button>
                                </div>
                                {(!unidadSeleccionada || (!hideTop && !servicio)) && (
                                    <p className="mt-2 text-center text-xs text-gray-400">
                                        {!unidadSeleccionada
                                            ? 'Selecciona el tipo de unidad para continuar'
                                            : 'Selecciona un servicio para guardar'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                <input
                    id="camera-input-fallback"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                        handleFileChange(e);
                        setShowCamera(false);
                    }}
                />

                <input
                    id="gallery-input"
                    type="file"
                    accept="image/*"
                    ref={galleryInputRef}
                    className="hidden"
                    onChange={(e) => {
                        handleFileChange(e);
                        setShowCamera(false);
                    }}
                />

                <CameraModal
                    isOpen={showCamera}
                    onClose={() => setShowCamera(false)}
                    onCapture={handleCaptureCamera}
                    fallbackTrigger={() => fileInputRef.current?.click()}
                    galleryTrigger={() => galleryInputRef.current?.click()}
                />
            </main>
        </div>
    );
}