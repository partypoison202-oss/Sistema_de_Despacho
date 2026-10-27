import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import { getFechaActualLocal, formatFechaLocal } from '../../utils/itinerarioUtils';

const colorStyles = {
  asistencia: { dot: '#16a34a', text: 'Asistencia (A)' },
  vacaciones: { dot: '#eab308', text: 'Vacaciones (V)' },
  incapacidad: { dot: '#3b82f6', text: 'Incapacidad (I)' },
  descanso: { dot: '#f97316', text: 'Descanso (D)' },
  falta: { dot: '#ef4444', text: 'Falta (F)' },
  permuta: { dot: '#8b5cf6', text: 'Permuta (DP / AP)' },
  retardo: { dot: '#ea580c', text: 'Retardo (R)' }
};

function CustomColorSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('pointerdown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, []);

  const currentStyle = colorStyles[value] || colorStyles.asistencia || colorStyles.vacaciones;

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white text-slate-800 px-3.5 py-2.5 rounded-xl font-semibold cursor-pointer flex justify-between items-center border border-slate-300 transition-colors shadow-2xs hover:border-slate-400"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: currentStyle.dot, boxShadow: '0 0 0 2px rgba(255,255,255,0.8)' }}></div>
          <span className="text-xs sm:text-sm">{currentStyle.text}</span>
        </div>
        <span className="text-slate-400 text-xs">▼</span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[1000] overflow-hidden divide-y divide-slate-100">
          {Object.entries(colorStyles).map(([key, style]) => (
            <div
              key={key}
              onClick={() => {
                onChange(key);
                setIsOpen(false);
              }}
              className={`px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer flex items-center gap-2.5 transition-colors ${value === key ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'}`}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: style.dot }}></div>
              <span>{style.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchableConductorSelect({ label, sublabel, selectedId, onSelect, conductores = [], excludeId = null, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('pointerdown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, []);

  const selectedConductor = conductores.find(c => String(c.id) === String(selectedId));

  const condFiltrados = conductores.filter(c => {
    if (c.estatus !== 'activo') return false;
    if (excludeId && String(c.id) === String(excludeId)) return false;
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    return (c.nombres || '').toLowerCase().includes(term) ||
      (c.apellidos || '').toLowerCase().includes(term) ||
      (c.tarjeton || '').toLowerCase().includes(term);
  }).sort((a, b) => (a.nombres || '').localeCompare(b.nombres || ''));

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col">
        <label className="text-xs font-bold text-[#6b1d33] tracking-wide uppercase">
          {label}
        </label>
        {sublabel && (
          <span className="text-[11px] text-slate-500 font-medium">
            {sublabel}
          </span>
        )}
      </div>

      {selectedConductor ? (
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all hover:bg-slate-100/80">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="font-mono font-black text-xs text-[#6b1d33] bg-[#6b1d33]/10 px-2 py-1 rounded-md shrink-0">
              {selectedConductor.tarjeton}
            </span>
            <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
              {selectedConductor.nombres} {selectedConductor.apellidos}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect('');
              setIsOpen(true);
            }}
            className="text-xs font-extrabold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors shrink-0"
          >
            ✕ Cambiar
          </button>
        </div>
      ) : (
        <div className="relative w-full" ref={dropdownRef}>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder || "Buscar por nombre o tarjetón..."}
              value={busqueda}
              onFocus={() => setIsOpen(true)}
              onClick={() => setIsOpen(true)}
              onChange={e => {
                setBusqueda(e.target.value);
                setIsOpen(true);
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b1d33] focus:border-transparent transition-all shadow-2xs"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(prev => !prev);
              }}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
              title={isOpen ? "Cerrar lista" : "Abrir lista"}
            >
              <span className="text-[10px]">
                {isOpen ? '▲' : '▼'}
              </span>
            </button>
          </div>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[1050] max-h-48 overflow-y-auto divide-y divide-slate-100">
              {condFiltrados.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center font-medium">
                  No se encontraron conductores
                </div>
              ) : (
                condFiltrados.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelect(c.id);
                      setIsOpen(false);
                      setBusqueda('');
                    }}
                    className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-2.5 transition-colors"
                  >
                    <span className="font-mono font-bold text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      {c.tarjeton}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {c.nombres} {c.apellidos}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BatchConductorSelect({
  conductores = [],
  selectedIds = [],
  onChangeSelectedIds,
  placeholder = "Buscar conductores para agregar al grupo..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('pointerdown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, []);

  const condFiltrados = conductores.filter(c => {
    if (c.estatus !== 'activo') return false;
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    return (c.nombres || '').toLowerCase().includes(term) ||
      (c.apellidos || '').toLowerCase().includes(term) ||
      (c.tarjeton || '').toLowerCase().includes(term);
  }).sort((a, b) => (a.nombres || '').localeCompare(b.nombres || ''));

  const toggleConductor = (id) => {
    const idStr = String(id);
    const exists = selectedIds.some(x => String(x) === idStr);
    if (exists) {
      onChangeSelectedIds(selectedIds.filter(x => String(x) !== idStr));
    } else {
      onChangeSelectedIds([...selectedIds, id]);
    }
  };

  const seleccionarTodosFiltrados = () => {
    const idsVisibles = condFiltrados.map(c => c.id);
    const set = new Set([...selectedIds.map(String), ...idsVisibles.map(String)]);
    const todos = conductores.filter(c => set.has(String(c.id))).map(c => c.id);
    onChangeSelectedIds(todos);
  };

  const quitarTodos = () => {
    onChangeSelectedIds([]);
  };

  const conductoresSeleccionadosData = conductores.filter(c =>
    selectedIds.some(id => String(id) === String(c.id))
  );

  return (
    <div className="space-y-2">
      {/* Chips de conductores seleccionados en cuadrícula compacta */}
      {conductoresSeleccionadosData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#6b1d33] flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#6b1d33]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.999-3.199a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span>{conductoresSeleccionadosData.length} en el grupo:</span>
            </span>
            <button
              type="button"
              onClick={quitarTodos}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
            >
              Vaciar grupo
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 p-1 bg-slate-50/50 rounded-lg border border-slate-100">
            {conductoresSeleccionadosData.map(c => (
              <div
                key={c.id}
                title={`${c.nombres} ${c.apellidos}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-[#6b1d33]/40 transition-colors"
              >
                <span className="font-mono font-bold text-[10px] text-[#6b1d33] bg-[#6b1d33]/10 px-1.5 py-0.5 rounded shrink-0">
                  {c.tarjeton}
                </span>
                <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                  {c.nombres} {c.apellidos}
                </span>
                <button
                  type="button"
                  onClick={() => toggleConductor(c.id)}
                  className="text-slate-400 hover:text-red-600 p-0.5 text-xs font-black cursor-pointer rounded shrink-0 transition-colors ml-0.5"
                  title="Quitar del grupo"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input de búsqueda y lista desplegable con checkboxes */}
      <div className="relative w-full" ref={dropdownRef}>
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={busqueda}
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            onChange={e => {
              setBusqueda(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') setIsOpen(false);
            }}
            className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b1d33] focus:border-transparent transition-all shadow-2xs"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(prev => !prev);
            }}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
            title={isOpen ? "Cerrar lista" : "Abrir lista"}
          >
            <span className="text-[10px]">
              {isOpen ? '▲' : '▼'}
            </span>
          </button>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[1050] max-h-56 overflow-y-auto divide-y divide-slate-100">
            <div className="p-2 bg-slate-50 flex items-center justify-between text-xs border-b border-slate-200 sticky top-0 z-10">
              <span className="text-slate-500 font-medium">
                {condFiltrados.length} conductores encontrados
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={seleccionarTodosFiltrados}
                  className="font-bold text-[#6b1d33] hover:underline cursor-pointer"
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>

            {condFiltrados.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center font-medium">
                No se encontraron conductores
              </div>
            ) : (
              condFiltrados.map(c => {
                const estaSeleccionado = selectedIds.some(id => String(id) === String(c.id));
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleConductor(c.id)}
                    className={`p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors ${estaSeleccionado ? 'bg-amber-50/60' : ''
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={estaSeleccionado}
                        onChange={() => { }}
                        className="w-4 h-4 rounded text-[#6b1d33] border-slate-300 focus:ring-[#6b1d33] cursor-pointer"
                      />
                      <span className="font-mono font-bold text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        {c.tarjeton}
                      </span>
                      <span className={`text-xs truncate ${estaSeleccionado ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {c.nombres} {c.apellidos}
                      </span>
                    </div>
                    {estaSeleccionado && (
                      <span className="text-[11px] font-black text-[#6b1d33] shrink-0">
                        ✓ En el grupo
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ModalAsignarFechas({
  isOpen,
  onClose,
  conductores = [],
  getAuthHeaders,
  onSuccess,
  initialConductorId = '',
  initialEstado = 'asistencia',
  lockEstado = false,
  origen = 'Itinerario de Asistencias'
}) {
  const [esGrupal, setEsGrupal] = useState(false);
  const [conductorId, setConductorId] = useState('');
  const [selectedConductorIds, setSelectedConductorIds] = useState([]);
  const [conductorRelacionadoId, setConductorRelacionadoId] = useState('');
  const [estado, setEstado] = useState('asistencia');
  const [fechaDesde, setFechaDesde] = useState(() => getFechaActualLocal());
  const [fechaHasta, setFechaHasta] = useState(() => getFechaActualLocal());
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setConductorId(initialConductorId);
      setSelectedConductorIds(initialConductorId ? [initialConductorId] : []);
      setEsGrupal(false);
      setConductorRelacionadoId('');
      setEstado(initialEstado);
      const hoy = getFechaActualLocal();
      setFechaDesde(hoy);
      setFechaHasta(hoy);
      setMotivo('');

      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, initialConductorId, initialEstado]);

  if (!isOpen) return null;

  const esRangoPermitido = estado === 'vacaciones' || estado === 'incapacidad' || estado === 'descanso';

  const calcularDias = (f1, f2) => {
    if (!f1 || !f2) return 0;
    const d1 = new Date(f1 + 'T00:00:00');
    const d2 = new Date(f2 + 'T00:00:00');
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const calcularMaxHasta = (f1) => {
    if (!f1) return undefined;
    const partes = f1.split('-');
    if (partes.length !== 3) return undefined;
    const d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
    d.setDate(d.getDate() + 4); // Permite hasta 5 días en total (desde inclusive)
    return formatFechaLocal(d);
  };

  const maxHasta = calcularMaxHasta(fechaDesde);
  const diasSeleccionados = esRangoPermitido ? calcularDias(fechaDesde, fechaHasta) : 1;

  const handleFechaDesdeChange = (nuevaDesde) => {
    setFechaDesde(nuevaDesde);
    const d1 = new Date(nuevaDesde + 'T00:00:00');
    const d2 = new Date(fechaHasta + 'T00:00:00');
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    if (diff < 1 || diff > 5) {
      setFechaHasta(nuevaDesde);
    }
  };

  const handleFechaHastaChange = (nuevaHasta) => {
    const d1 = new Date(fechaDesde + 'T00:00:00');
    const d2 = new Date(nuevaHasta + 'T00:00:00');
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 5) {
      setFechaHasta(calcularMaxHasta(fechaDesde));
    } else if (diff < 1) {
      setFechaHasta(fechaDesde);
    } else {
      setFechaHasta(nuevaHasta);
    }
  };

  // Lógica de validación en vivo
  let errorMessage = '';
  const selectedConductorData = conductores.find(c => String(c.id) === String(conductorId));

  if (esRangoPermitido) {
    if (diasSeleccionados > 5) {
      errorMessage = `El periodo máximo permitido para ${estado} es de 5 días (has seleccionado ${diasSeleccionados} días).`;
    } else if (diasSeleccionados < 1) {
      errorMessage = 'La fecha final (hasta) no puede ser anterior a la fecha inicial (desde).';
    }
  }

  if (!esGrupal && selectedConductorData && (estado === 'falta' || estado === 'retardo')) {
    const parseJson = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim() !== '') {
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
      }
      return [];
    };

    const faltas = parseJson(selectedConductorData.faltas_detalle);
    const retardos = parseJson(selectedConductorData.retardos_detalle);

    const yaTieneFaltaORetardo = faltas.some(f => f.fecha === fechaDesde) || retardos.some(r => r.fecha === fechaDesde);

    if (yaTieneFaltaORetardo) {
      errorMessage = `Ya existe una falta o retardo para el ${fechaDesde}.`;
    }

    if (estado === 'falta' && fechaDesde > getFechaActualLocal()) {
      errorMessage = 'No se puede registrar una falta con fecha futura.';
    }
  }

  const isBotonDeshabilitado = enviando || (errorMessage !== '');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (estado === 'permuta') {
      if (!conductorId) {
        return Swal.fire({
          title: 'Atención',
          text: 'Por favor selecciona al conductor que descansa.',
          icon: 'warning',
          confirmButtonColor: '#6b1d33',
          customClass: { container: '!z-[1000000]' }
        });
      }
      if (!conductorRelacionadoId) {
        return Swal.fire({
          title: 'Atención',
          text: 'Para asignar una permuta debes seleccionar a ambos conductores (quien descansa y quien asiste en su lugar).',
          icon: 'warning',
          confirmButtonColor: '#6b1d33',
          customClass: { container: '!z-[1000000]' }
        });
      }
      if (String(conductorId) === String(conductorRelacionadoId)) {
        return Swal.fire({
          title: 'Atención',
          text: 'No puedes hacer una permuta con el mismo conductor.',
          icon: 'warning',
          confirmButtonColor: '#6b1d33',
          customClass: { container: '!z-[1000000]' }
        });
      }
    } else if (esGrupal) {
      if (!selectedConductorIds || selectedConductorIds.length === 0) {
        return Swal.fire({
          title: 'Atención',
          text: 'Por favor selecciona al menos una persona conductora para la asignación grupal.',
          icon: 'warning',
          confirmButtonColor: '#6b1d33',
          customClass: { container: '!z-[1000000]' }
        });
      }
    } else {
      if (!conductorId) {
        return Swal.fire({
          title: 'Atención',
          text: 'Por favor selecciona la persona conductora',
          icon: 'warning',
          confirmButtonColor: '#6b1d33',
          customClass: { container: '!z-[1000000]' }
        });
      }
    }

    if (esRangoPermitido) {
      const dias = calcularDias(fechaDesde, fechaHasta);
      if (dias < 1) {
        return Swal.fire({
          title: 'Atención',
          text: 'La fecha final no puede ser anterior a la fecha inicial.',
          icon: 'warning',
          confirmButtonColor: '#6b1d33',
          customClass: { container: '!z-[1000000]' }
        });
      }
      if (dias > 5) {
        return Swal.fire({
          title: 'Atención',
          text: `El periodo máximo permitido para ${estado} es de 5 días (has seleccionado ${dias} días).`,
          icon: 'warning',
          confirmButtonColor: '#6b1d33',
          customClass: { container: '!z-[1000000]' }
        });
      }
    }

    const defaultMotivos = {
      asistencia: `Asistencia registrada desde ${origen}`,
      falta: `Falta registrada desde ${origen}`,
      retardo: `Retardo registrado desde ${origen}`,
      descanso: `Descanso registrado desde ${origen}`,
      vacaciones: `Vacaciones registradas desde ${origen}`,
      incapacidad: `Incapacidad registrada desde ${origen}`,
      permuta: `Permuta registrada desde ${origen}`
    };
    const motivoFinal = motivo.trim() || defaultMotivos[estado] || `Registrado desde ${origen}`;

    setEnviando(true);
    try {
      const payload = {
        conductor_id: !esGrupal ? conductorId : null,
        conductor_ids: esGrupal ? selectedConductorIds : (conductorId ? [conductorId] : []),
        estado,
        desde: fechaDesde,
        hasta: esRangoPermitido ? fechaHasta : fechaDesde,
        motivo: motivoFinal,
        origen,
        conductor_relacionado_id: estado === 'permuta' ? conductorRelacionadoId : null
      };

      const res = await fetch(`${API_BASE}/api/operadores/itinerario/asignar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al guardar asignación');

      Swal.fire({
        icon: 'success',
        title: 'Asignado',
        text: json.message || 'Asignación registrada correctamente',
        timer: 2000,
        showConfirmButton: false,
        customClass: { container: '!z-[1000000]' }
      });
      onSuccess();
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        confirmButtonColor: '#6b1d33',
        customClass: { container: '!z-[1000000]' }
      });
    } finally {
      setEnviando(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-[99999] p-3 sm:p-4 overflow-y-auto overscroll-contain" onClick={onClose}>
      <div
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-100 max-h-[92vh] flex flex-col overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#6b1d33] px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold m-0">Asignar Fechas al Itinerario</h2>
            <p className="text-slate-200 text-xs mt-0.5 m-0 font-medium">Agendar asistencia, vacaciones, descansos, permutas, faltas o retardo.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-slate-200 text-2xl font-light leading-none p-1 transition-opacity opacity-80 hover:opacity-100 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto shrink grow">

          {/* Tipo de asignación (Si no está bloqueado) */}
          {!lockEstado && (
            <div className="space-y-1 relative z-[60]">
              <label className="text-xs font-bold text-[#6b1d33] tracking-wide uppercase">TIPO DE ASIGNACIÓN</label>
              <CustomColorSelect value={estado} onChange={setEstado} />
            </div>
          )}

          {/* Selección de Conductores (Individual o Grupal) */}
          {estado === 'permuta' ? (
            <div className="space-y-3.5 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200 relative z-[50]">
              <SearchableConductorSelect
                label="1. Conductor que Descansa (DP)"
                sublabel="Persona que tomará el día de descanso por permuta"
                selectedId={conductorId}
                onSelect={setConductorId}
                conductores={conductores}
                placeholder="Buscar al primer conductor (que descansa)..."
              />

              <SearchableConductorSelect
                label="2. Conductor que Asiste en su lugar (AP)"
                sublabel="Persona que cubrirá la asistencia por permuta"
                selectedId={conductorRelacionadoId}
                onSelect={setConductorRelacionadoId}
                conductores={conductores}
                excludeId={conductorId}
                placeholder="Buscar al segundo conductor (que asiste)..."
              />
            </div>
          ) : (
            <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 relative z-[50]">
              {/* Switch / Segmented control de Carga Individual vs Grupal */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-[#6b1d33] tracking-wide uppercase">
                    {esGrupal ? 'CONDUCTORES (GRUPAL)' : 'CONDUCTOR'}
                  </label>
                  <p className="text-[11px] text-slate-500 m-0 font-medium">
                    {esGrupal
                      ? 'Selecciona varios operadores para asignar al mismo tiempo'
                      : 'Selecciona a una sola persona conductora'}
                  </p>
                </div>

                <div className="inline-flex items-center bg-slate-200/90 p-0.5 rounded-xl border border-slate-300 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setEsGrupal(false)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${!esGrupal
                        ? 'bg-white text-[#6b1d33] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEsGrupal(true);
                      if (conductorId && !selectedConductorIds.includes(conductorId)) {
                        setSelectedConductorIds([conductorId]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${esGrupal
                        ? 'bg-[#6b1d33] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <span>Grupal</span>
                    {selectedConductorIds.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${esGrupal ? 'bg-white text-[#6b1d33]' : 'bg-[#6b1d33] text-white'
                        }`}>
                        {selectedConductorIds.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {esGrupal ? (
                <BatchConductorSelect
                  conductores={conductores}
                  selectedIds={selectedConductorIds}
                  onChangeSelectedIds={setSelectedConductorIds}
                  placeholder="Buscar conductores para agregar al grupo..."
                />
              ) : (
                <SearchableConductorSelect
                  label=""
                  sublabel=""
                  selectedId={conductorId}
                  onSelect={setConductorId}
                  conductores={conductores}
                  placeholder="Buscar por nombre o tarjetón..."
                />
              )}
            </div>
          )}

          {/* Selector de Fechas (Rango de hasta 5 días para Vacaciones, Incapacidades o Descansos, o Fecha única) */}
          {esRangoPermitido ? (
            <div className="space-y-2.5 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 relative z-[40]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#6b1d33] tracking-wide uppercase">
                  PERIODO DE {estado.toUpperCase()}
                </label>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#6b1d33]/10 text-[#6b1d33] border border-[#6b1d33]/20">
                  {diasSeleccionados} {diasSeleccionados === 1 ? 'DÍA' : 'DÍAS'} (MÁX. 5)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block tracking-wide">
                    DE QUÉ DÍA (INICIO):
                  </label>
                  <AppleDatePicker
                    value={fechaDesde}
                    onChange={handleFechaDesdeChange}
                    disableFuture={estado === 'falta'}
                    showIcon={false}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block tracking-wide">
                    A QUÉ DÍA (FIN):
                  </label>
                  <AppleDatePicker
                    value={fechaHasta}
                    onChange={handleFechaHastaChange}
                    minDate={fechaDesde}
                    maxDate={maxHasta}
                    disableFuture={false}
                    showIcon={false}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 m-0 font-medium">
                Periodo seleccionado: del <span className="font-bold text-slate-800">{fechaDesde}</span> al <span className="font-bold text-slate-800">{fechaHasta}</span> ({diasSeleccionados} {diasSeleccionados === 1 ? 'día' : 'días'}).
              </p>
            </div>
          ) : (
            <div className="space-y-1 relative z-[40]">
              <label className="text-xs font-bold text-[#6b1d33] tracking-wide uppercase">FECHA</label>
              <AppleDatePicker value={fechaDesde} onChange={setFechaDesde} disableFuture={false} showIcon={false} />
            </div>
          )}

          {/* Motivo (Opcional) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#6b1d33] tracking-wide uppercase">MOTIVO (OPCIONAL)</label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b1d33] focus:border-transparent transition-all shadow-2xs"
              value={motivo}
              onChange={e => setMotivo(e.target.value.toUpperCase())}
              placeholder={`EJ. ${estado === 'asistencia' ? 'ASISTENCIA REGISTRADA DESDE ' + origen.toUpperCase() : estado === 'retardo' ? 'RETARDO REGISTRADO DESDE ' + origen.toUpperCase() : estado === 'falta' ? 'FALTA REGISTRADA DESDE ' + origen.toUpperCase() : 'VACACIONES / ACUERDO ENTRE OPERADORES'}`}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 shrink-0">
            {errorMessage && (
              <div className="bg-red-50 text-red-600 text-xs font-semibold p-2 rounded-lg border border-red-200 text-center">
                {errorMessage}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isBotonDeshabilitado}
                className="px-4 py-2.5 rounded-xl border-none bg-[#6b1d33] text-white text-xs sm:text-sm font-bold hover:bg-[#831843] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {enviando ? (
                  'Guardando...'
                ) : esGrupal && selectedConductorIds.length > 1 ? (
                  `Asignar a ${selectedConductorIds.length} Conductores`
                ) : (
                  'Asignar Fechas'
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
