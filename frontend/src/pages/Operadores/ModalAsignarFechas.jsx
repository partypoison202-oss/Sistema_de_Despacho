import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';

const colorStyles = {
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentStyle = colorStyles[value] || colorStyles.vacaciones;

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    <div className="space-y-1.5" ref={dropdownRef}>
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
        <div className="relative w-full">
          <input 
            type="text" 
            placeholder={placeholder || "Buscar por nombre o tarjetón..."} 
            value={busqueda}
            onFocus={() => setIsOpen(true)}
            onChange={e => {
              setBusqueda(e.target.value);
              setIsOpen(true);
            }}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b1d33] focus:border-transparent transition-all shadow-2xs"
          />
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

export default function ModalAsignarFechas({ 
  isOpen, 
  onClose, 
  conductores = [], 
  getAuthHeaders, 
  onSuccess, 
  initialConductorId = '', 
  initialEstado = 'vacaciones', 
  lockEstado = false 
}) {
  const [conductorId, setConductorId] = useState('');
  const [conductorRelacionadoId, setConductorRelacionadoId] = useState('');
  const [estado, setEstado] = useState('vacaciones');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConductorId(initialConductorId);
      setConductorRelacionadoId('');
      setEstado(initialEstado);
      setFecha(new Date().toISOString().split('T')[0]);
      setMotivo('');
    }
  }, [isOpen, initialConductorId, initialEstado]);

  if (!isOpen) return null;

  // Lógica de validación en vivo
  let errorMessage = '';
  const selectedConductorData = conductores.find(c => String(c.id) === String(conductorId));

  if (selectedConductorData && (estado === 'falta' || estado === 'retardo')) {
    const parseJson = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim() !== '') {
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
      }
      return [];
    };

    const faltas = parseJson(selectedConductorData.faltas_detalle);
    const retardos = parseJson(selectedConductorData.retardos_detalle);
    
    const yaTieneFaltaORetardo = faltas.some(f => f.fecha === fecha) || retardos.some(r => r.fecha === fecha);

    if (yaTieneFaltaORetardo) {
      errorMessage = `Este operador ya cuenta con una falta o retardo registrado para el día ${fecha}. No se puede duplicar.`;
    }
  }

  const isBotonDeshabilitado = enviando || (errorMessage !== '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!conductorId) {
      return Swal.fire('Atención', 'Por favor selecciona el conductor que descansa (DP)', 'warning');
    }

    if (estado === 'permuta') {
      if (!conductorRelacionadoId) {
        return Swal.fire('Atención', 'Para asignar una permuta debes seleccionar a ambos conductores (quien descansa y quien asiste en su lugar).', 'warning');
      }
      if (String(conductorId) === String(conductorRelacionadoId)) {
        return Swal.fire('Atención', 'No puedes hacer una permuta con el mismo conductor.', 'warning');
      }
    }

    setEnviando(true);
    try {
      const payload = {
        conductor_id: conductorId,
        estado,
        desde: fecha,
        hasta: fecha,
        motivo,
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
        showConfirmButton: false
      });
      onSuccess();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-[99999] p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-100 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#6b1d33] px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold m-0">Asignar Fechas al Itinerario</h2>
            <p className="text-slate-200 text-xs mt-0.5 m-0 font-medium">Agendar vacaciones, descansos, permutas, faltas o retardo.</p>
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

          {/* Selección de Conductores */}
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
            <div className="relative z-[50]">
              <SearchableConductorSelect 
                label="Conductor"
                sublabel="Selecciona a la persona conductora"
                selectedId={conductorId}
                onSelect={setConductorId}
                conductores={conductores}
                placeholder="Buscar por nombre o tarjetón..."
              />
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1 relative z-[40]">
            <label className="text-xs font-bold text-[#6b1d33] tracking-wide uppercase">FECHA</label>
            <AppleDatePicker value={fecha} onChange={setFecha} disableFuture={false} />
          </div>

          {/* Motivo (Opcional) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#6b1d33] tracking-wide uppercase">MOTIVO (OPCIONAL)</label>
            <input 
              type="text" 
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6b1d33] focus:border-transparent transition-all shadow-2xs" 
              value={motivo} 
              onChange={e => setMotivo(e.target.value.toUpperCase())}
              placeholder="EJ. VACACIONES PROGRAMADAS / ACUERDO ENTRE OPERADORES"
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
                className="px-4 py-2.5 rounded-xl border-none bg-[#6b1d33] text-white text-xs sm:text-sm font-bold hover:bg-[#831843] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {enviando ? 'Guardando...' : 'Asignar Fechas'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
