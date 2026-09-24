import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';

const colorStyles = {
  vacaciones: { dot: '#eab308', text: 'Vacaciones (V)' },
  incapacidad: { dot: '#3b82f6', text: 'Incapacidad (I)' },
  descanso: { dot: '#f97316', text: 'Descanso (D)' },
  falta: { dot: '#ef4444', text: 'Falta (F)' },
  permuta: { dot: '#8b5cf6', text: 'Permuta (P)' },
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
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: 'white',
          color: '#1e293b',
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #cbd5e1',
          transition: 'border-color 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: currentStyle.dot, boxShadow: '0 0 0 2px rgba(255,255,255,0.8)' }}></div>
          <span>{currentStyle.text}</span>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>▼</span>
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {Object.entries(colorStyles).map(([key, style]) => (
            <div 
              key={key}
              onClick={() => {
                onChange(key);
                setIsOpen(false);
              }}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: value === key ? '#f8fafc' : 'white',
                color: value === key ? '#0f172a' : '#334155',
                fontWeight: value === key ? '700' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === key ? '#f8fafc' : 'white'}
            >
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: style.dot }}></div>
              <span>{style.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ModalAsignarFechas({ isOpen, onClose, conductores, getAuthHeaders, onSuccess, initialConductorId = '', initialEstado = 'vacaciones', lockEstado = false }) {
  const [conductorId, setConductorId] = useState('');
  const [estado, setEstado] = useState('vacaciones');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Limpiar form al abrir
  useEffect(() => {
    if (isOpen) {
      setConductorId(initialConductorId);
      setEstado(initialEstado);
      setFecha(new Date().toISOString().split('T')[0]);
      setMotivo('');
      setBusqueda('');
    }
  }, [isOpen, initialConductorId, initialEstado]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!conductorId) {
      return Swal.fire('Atención', 'Selecciona un conductor', 'warning');
    }
    // No need to validate final date < initial date because it's a single date.

    setEnviando(true);
    try {
      const res = await fetch(`${API_BASE}/api/operadores/itinerario/asignar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conductor_id: conductorId,
          estado,
          desde: fecha,
          hasta: fecha,
          motivo
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al guardar');
      
      Swal.fire({
        icon: 'success',
        title: 'Asignado',
        text: 'Bloque de fechas asignado correctamente',
        timer: 1500,
        showConfirmButton: false
      });
      onSuccess();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  const condFiltrados = conductores.filter(c => {
    if (c.estatus !== 'activo') return false;
    const term = busqueda.toLowerCase();
    return c.nombres.toLowerCase().includes(term) || 
           c.apellidos.toLowerCase().includes(term) || 
           c.tarjeton.toLowerCase().includes(term);
  }).sort((a, b) => a.nombres.localeCompare(b.nombres));

  const modalContent = (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', padding: 0, overflow: 'hidden' }}>
        
        <div style={{ background: '#6b1d33', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Asignar Fechas al Itinerario</h2>
            <p style={{ color: '#e2e8f0', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Selecciona un conductor para agendar vacaciones, incapacidades o faltas.</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.8 }}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          
          <div className="form-group">
            <label className="form-label" style={{ color: '#6b1d33', fontWeight: 'bold' }}>CONDUCTOR</label>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Buscar por nombre o tarjetón..." 
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ marginBottom: '0.5rem' }}
            />
            <div style={{ 
              maxHeight: '160px', 
              overflowY: 'auto', 
              border: '1px solid #cbd5e1', 
              borderRadius: '8px',
              backgroundColor: 'white',
              boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
            }}>
              {condFiltrados.length === 0 && (
                <div style={{ padding: '1rem', color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>
                  No se encontraron conductores
                </div>
              )}
              {condFiltrados.map(c => (
                <div 
                  key={c.id}
                  onClick={() => setConductorId(c.id)}
                  style={{ 
                    padding: '0.6rem 1rem', 
                    cursor: 'pointer',
                    backgroundColor: conductorId === c.id ? '#f1f5f9' : 'white',
                    color: conductorId === c.id ? '#0f172a' : '#475569',
                    fontWeight: conductorId === c.id ? '700' : '500',
                    borderBottom: '1px solid #f8fafc',
                    borderLeft: conductorId === c.id ? '4px solid #6b1d33' : '4px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (conductorId !== c.id) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (conductorId !== c.id) e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <span style={{ fontFamily: 'monospace', color: '#64748b', marginRight: '0.5rem' }}>{c.tarjeton}</span>
                  {c.nombres} {c.apellidos}
                </div>
              ))}
            </div>
          </div>

          {!lockEstado && (
            <div className="form-group">
              <label className="form-label" style={{ color: '#6b1d33', fontWeight: 'bold' }}>TIPO DE ASIGNACIÓN</label>
              <CustomColorSelect value={estado} onChange={setEstado} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ color: '#6b1d33', fontWeight: 'bold' }}>FECHA</label>
            <AppleDatePicker value={fecha} onChange={setFecha} />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#6b1d33', fontWeight: 'bold' }}>MOTIVO (OPCIONAL)</label>
            <input 
              type="text" 
              className="modal-input" 
              value={motivo} 
              onChange={e => setMotivo(e.target.value.toUpperCase())}
              placeholder="EJ. VACACIONES PROGRAMADAS"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn-cancel" onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" className="btn-save" disabled={enviando} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: '#6b1d33', color: 'white', fontWeight: '600', cursor: enviando ? 'wait' : 'pointer' }}>
              {enviando ? 'Guardando...' : 'Asignar Fechas'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
