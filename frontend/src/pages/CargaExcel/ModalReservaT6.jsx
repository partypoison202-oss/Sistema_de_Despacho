import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

// URL de la API
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export default function ModalReservaT6({ isOpen, onClose, catalogConductores, tabActiva }) {
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarAutorizados();
    } else {
      setBusqueda('');
      setSeleccionados(new Set());
    }
  }, [isOpen, tabActiva]);

  const cargarAutorizados = async () => {
    try {
      setCargando(true);
      const res = await fetch(`${API_BASE}/api/reservas/autorizadas?fecha=${tabActiva}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSeleccionados(new Set(data));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  // Filtrar solo conductores del catálogo que están en estatus 'disponible'
  const conductoresDisponibles = (catalogConductores || [])
    .filter(c => String(c.estado_servicio || '').toLowerCase() === 'disponible')
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));

  // Buscador por Nombre y Tarjetón
  const filtrados = conductoresDisponibles.filter(c => {
    const term = busqueda.toLowerCase();
    const nombre = String(c.nombre || '').toLowerCase();
    const tarjeton = String(c.tarjeton || '').toLowerCase();
    
    return nombre.includes(term) || tarjeton.includes(term);
  });

  const toggleSeleccion = (tarjeton) => {
    const nuevos = new Set(seleccionados);
    if (nuevos.has(tarjeton)) {
      nuevos.delete(tarjeton);
    } else {
      nuevos.add(tarjeton);
    }
    setSeleccionados(nuevos);
  };

  const toggleTodos = () => {
    if (seleccionados.size === filtrados.length && filtrados.length > 0) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(filtrados.map(c => c.tarjeton)));
    }
  };

  const guardarAutorizados = async () => {
    try {
      setGuardando(true);
      const arr = Array.from(seleccionados);
      const res = await fetch(`${API_BASE}/api/reservas/autorizadas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fecha: tabActiva,
          tarjetones: arr
        })
      });
      
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Reservas Autorizadas',
          text: `Se han autorizado ${arr.length} conductor(es) para reserva en Mesa de Control.`,
          timer: 3000,
          showConfirmButton: false
        });
        onClose();
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      Swal.fire('Error', 'Hubo un problema al autorizar las reservas.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  // Obtener texto del día basado en tabActiva
  const getDiaTexto = () => {
    const tabs = {
      'HOY': 'Día Operativo (Actual)',
      'MANANA': 'Día Siguiente',
      'SABADO': 'Sábado',
      'DOMINGO': 'Domingo',
      'LUNES': 'Lunes',
      'FESTIVO': 'Días Festivos'
    };
    return tabs[tabActiva] || 'el día seleccionado';
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '8px',
        width: '600px', maxWidth: '95%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        <h2 style={{ color: '#c5a059', marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Guardar Reservas T6
        </h2>
        <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
          Selecciona a los conductores (actualmente disponibles) que aparecerán en la sección de Reservas T6 de la Mesa de Control para <strong>{getDiaTexto()}</strong>.
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </span>
            <input 
              type="text" 
              autoFocus
              placeholder="Buscar por Nombre o Tarjetón..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '4px',
                border: '1px solid #cbd5e0', fontSize: '1rem', outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
              }}
            />
          </div>
        </div>
        
        <div style={{ 
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '300px'
        }}>
          <div style={{ 
            display: 'flex', padding: '0.75rem 1rem', background: '#edf2f7', 
            borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '0.85rem', color: '#4a5568', alignItems: 'center'
          }}>
            <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={filtrados.length > 0 && seleccionados.size === filtrados.length}
                onChange={toggleTodos}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>
            <div style={{ flex: 3 }}>NOMBRE CONDUCTOR</div>
            <div style={{ flex: 1, textAlign: 'right' }}>TARJETÓN</div>
          </div>
          
          <ul style={{ overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0, flex: 1 }}>
            {cargando ? (
              <li style={{ padding: '2rem', color: '#a0aec0', textAlign: 'center' }}>Cargando autorizados...</li>
            ) : filtrados.length === 0 ? (
              <li style={{ padding: '2rem', color: '#a0aec0', textAlign: 'center', fontSize: '1rem' }}>
                No se encontraron conductores en reserva con esos criterios.
              </li>
            ) : (
              filtrados.map((c, idx) => {
                const isSelected = seleccionados.has(c.tarjeton);
                return (
                  <li 
                    key={idx} 
                    onClick={() => toggleSeleccion(c.tarjeton)}
                    style={{
                      padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#2d3748',
                      background: idx % 2 === 0 ? 'white' : '#f8fafc',
                      borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        readOnly
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ flex: 3, fontWeight: isSelected ? 'bold' : '500', color: isSelected ? '#2b6cb0' : 'inherit' }}>
                      {c.nombre}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#4a5568' }}>
                      {String(c.tarjeton).padStart(4, '0')}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
        
        <div style={{ 
          marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
        }}>
          <div style={{ color: '#4a5568', fontSize: '0.95rem' }}>
            <strong>{seleccionados.size}</strong> conductor(es) seleccionado(s)
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem', border: '1px solid #cbd5e0',
                background: 'white', color: '#4a5568', borderRadius: '4px',
                cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              Cancelar
            </button>
            <button 
              onClick={guardarAutorizados}
              disabled={guardando || cargando}
              style={{
                padding: '0.75rem 1.5rem', border: 'none',
                background: '#c5a059', color: 'white', borderRadius: '4px',
                cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem',
                opacity: (guardando || cargando) ? 0.7 : 1
              }}
            >
              {guardando ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                  </path>
                </svg>
              ) : '✓ '}
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
