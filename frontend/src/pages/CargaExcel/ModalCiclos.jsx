import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const parseCicloInput = (val) => {
  if (val === null || val === undefined) return Number.NaN;
  const str = String(val).trim();
  if (!str || str === '-' || str === '--') return Number.NaN;

  // Fracción simple: "1/2", "3/4"
  if (/^\d+\/\d+$/.test(str)) {
    const [n, d] = str.split('/').map(Number);
    return d !== 0 ? n / d : Number.NaN;
  }

  // Fracción mixta: "1 1/2", "20 1/2"
  const mixedMatch = /^(\d+)\s+(\d+)\/(\d+)$/.exec(str);
  if (mixedMatch) {
    const entero = Number(mixedMatch[1]);
    const n = Number(mixedMatch[2]);
    const d = Number(mixedMatch[3]);
    return d !== 0 ? entero + (n / d) : entero;
  }

  // Decimal directo: "20.5" o "20,5"
  const numDirecto = Number(str.replace(',', '.'));
  if (!Number.isNaN(numDirecto)) return numDirecto;

  return Number.NaN;
};

export const formatCicloDisplay = (num) => {
  if (num === null || num === undefined || Number.isNaN(num) || num < 0) return '0';
  const entero = Math.floor(num);
  const residuo = Math.round((num - entero) * 100) / 100;
  const enteroStr = entero.toLocaleString('es-MX');

  if (Math.abs(residuo - 0.5) < 0.05) {
    return entero === 0 ? '1/2' : `${enteroStr} 1/2`;
  }
  if (Math.abs(residuo) < 0.05) {
    return enteroStr;
  }
  if (Math.abs(residuo - 0.25) < 0.05) {
    return entero === 0 ? '1/4' : `${enteroStr} 1/4`;
  }
  if (Math.abs(residuo - 0.75) < 0.05) {
    return entero === 0 ? '3/4' : `${enteroStr} 3/4`;
  }
  return Number.isInteger(num) ? enteroStr : String(Number(num.toFixed(2)));
};

export default function ModalCiclos({ isOpen, onClose, tabActiva = 'MANANA', fechaTexto = '' }) {
  const [ciclos, setCiclos] = useState('');
  const [ciclosGuardados, setCiclosGuardados] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void cargarCiclos();
    } else {
      setCiclos('');
      setCiclosGuardados(null);
    }
  }, [isOpen, tabActiva]);

  const cargarCiclos = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_BASE}/api/despacho/ciclos?fecha=${tabActiva}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ciclos !== null && data.ciclos !== undefined) {
          const num = Number(data.ciclos);
          setCiclosGuardados(num);
          setCiclos(formatCicloDisplay(num));
        } else {
          setCiclos('');
          setCiclosGuardados(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar ciclos:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleInputChange = (e) => {
    // Permitir dígitos, puntos, comas, diagonales y espacios para soportar enteros, decimales y fracciones
    const valorLimpio = e.target.value.replace(/[^0-9.,/\s]/g, '');
    setCiclos(valorLimpio);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleGuardar();
    }
  };

  const handleGuardar = async () => {
    const valorTrim = String(ciclos).trim();
    if (!valorTrim) {
      void Swal.fire({
        icon: 'warning',
        title: 'Campo Requerido',
        text: 'Por favor ingresa un número de ciclos válido.',
        confirmButtonColor: '#6b1d33'
      });
      return;
    }

    const numeroCiclos = parseCicloInput(valorTrim);
    if (Number.isNaN(numeroCiclos) || numeroCiclos < 0) {
      void Swal.fire({
        icon: 'warning',
        title: 'Número Inválido',
        text: 'El número de ciclos debe ser mayor o igual a cero (ej. 20, 20.5 o 1/2).',
        confirmButtonColor: '#6b1d33'
      });
      return;
    }

    const numeroRedondeado = Math.round(numeroCiclos * 100) / 100;
    setGuardando(true);
    try {
      const res = await fetch(`${API_BASE}/api/despacho/ciclos`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fecha: tabActiva,
          ciclos: numeroRedondeado
        })
      });

      const data = await res.json();

      if (res.ok) {
        setCiclosGuardados(numeroRedondeado);
        setCiclos(formatCicloDisplay(numeroRedondeado));
        const textoCiclo = formatCicloDisplay(numeroRedondeado);
        const subtexto = Number.isInteger(numeroRedondeado) ? '' : ` (${numeroRedondeado})`;
        void Swal.fire({
          icon: 'success',
          title: '¡Ciclos Guardados!',
          html: `Se ha registrado el número de ciclos programados: <strong>${textoCiclo}</strong>${subtexto} para la operación.`,
          confirmButtonColor: '#6b1d33',
          timer: 2200
        });
        onClose();
      } else {
        void Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: data.message || 'No se pudo guardar el número de ciclos.',
          confirmButtonColor: '#6b1d33'
        });
      }
    } catch (err) {
      console.error('Error al guardar ciclos:', err);
      void Swal.fire({
        icon: 'error',
        title: 'Error de Red',
        text: 'Ocurrió un error al comunicarse con el servidor.',
        confirmButtonColor: '#6b1d33'
      });
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  const esManana = tabActiva === 'MANANA';
  const labelModulo = esManana ? 'Pestaña Día Siguiente' : 'Día Operativo (Actual)';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: 'white',
        padding: '1.75rem',
        borderRadius: '14px',
        width: '470px',
        maxWidth: '92%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(107, 29, 51, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(107, 29, 51, 0.2)'
            }}>
              <svg width="22" height="22" fill="none" stroke="#6b1d33" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 style={{ color: '#6b1d33', margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>
                Programación de Ciclos
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                {labelModulo}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: '1',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
            title="Cerrar ventana"
          >
            ×
          </button>
        </div>

        {/* Subtítulo / Fecha de Operación */}
        {fechaTexto && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            color: '#334155'
          }}>
            <svg width="16" height="16" fill="none" stroke="#c5a059" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Fecha asignada: <strong>{fechaTexto}</strong></span>
          </div>
        )}

        {/* Contenido / Formulario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#1e293b', fontSize: '0.9rem', fontWeight: '600' }}>
            <span>Número de Ciclos:</span>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={cargando ? 'Cargando ciclos...' : 'Ej. 240, 20.5 o 20 1/2'}
                value={ciclos}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={cargando || guardando}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  backgroundColor: cargando ? '#f1f5f9' : 'white'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6b1d33';
                  e.target.style.boxShadow = '0 0 0 3px rgba(107, 29, 51, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {cargando && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid #cbd5e1',
                    borderTopColor: '#6b1d33',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>
              Puedes ingresar enteros (ej. 20), decimales (ej. 20.5) o fracciones (ej. 1/2, 20 1/2).
            </span>
          </label>

          {/* Indicador de valor registrado previamente */}
          {ciclosGuardados !== null && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.82rem',
              color: '#065f46'
            }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>
                Valor registrado actualmente en el sistema:{' '}
                <strong>{formatCicloDisplay(ciclosGuardados)}</strong>
                {!Number.isInteger(ciclosGuardados) ? ` (${ciclosGuardados})` : ''} ciclos
              </span>
            </div>
          )}
        </div>

        {/* Footer / Botones */}
        <div style={{
          marginTop: '1.75rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            style={{
              padding: '0.65rem 1.25rem',
              border: '1px solid #cbd5e1',
              background: 'white',
              color: '#475569',
              borderRadius: '6px',
              cursor: guardando ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'background 0.15s ease'
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              void handleGuardar();
            }}
            disabled={guardando || cargando || !ciclos.trim()}
            style={{
              padding: '0.65rem 1.5rem',
              border: 'none',
              background: '#6b1d33',
              color: 'white',
              borderRadius: '6px',
              cursor: (guardando || cargando || !ciclos.trim()) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: (guardando || cargando || !ciclos.trim()) ? 0.6 : 1,
              boxShadow: '0 2px 4px rgba(107, 29, 51, 0.25)',
              transition: 'background 0.15s ease, opacity 0.15s ease'
            }}
          >
            {guardando ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Guardar Ciclos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
