import React, { useState, useEffect, useRef } from 'react';

const IOSPickerWheel = ({ options, value, onChange }) => {
  const containerRef = useRef(null);
  const itemHeight = 40;

  useEffect(() => {
    if (containerRef.current) {
      const index = options.indexOf(value);
      if (index !== -1) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = (e) => {
    const st = e.target.scrollTop;
    const index = Math.round(st / itemHeight);
    if (options[index] && options[index] !== value) {
      onChange(options[index]);
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: `${itemHeight * 3}px`,
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        position: 'relative',
        flex: 1,
        overscrollBehaviorY: 'contain'
      }}
      className="ios-wheel-container"
    >
      <style>{`
        .ios-wheel-container::-webkit-scrollbar { display: none; }
        @keyframes ios-spin { to { transform: rotate(360deg); } }
        .ios-animate-spin { animation: ios-spin 1s linear infinite; }
      `}</style>
      <div style={{ height: itemHeight }} />
      {options.map((opt, i) => (
        <div
          key={i}
          style={{
            height: itemHeight,
            scrollSnapAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: value === opt ? '1.25rem' : '1rem',
            fontWeight: value === opt ? 'bold' : 'normal',
            color: value === opt ? '#6b1d33' : '#9ca3af',
            transition: 'all 0.15s ease-out',
            cursor: 'pointer'
          }}
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = i * itemHeight;
            }
            onChange(opt);
          }}
        >
          {opt}
        </div>
      ))}
      <div style={{ height: itemHeight }} />
    </div>
  );
};

export default function IOSTimePicker({ value, onChange, onClose, onSave }) {
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [isSaving, setIsSaving] = useState(false);

  const hourOptions = React.useMemo(
    () => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')),
    []
  );
  const minuteOptions = React.useMemo(
    () => Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')),
    []
  );

  // Inicializa el picker con el valor recibido SOLO al montar (al abrirse).
  // No sincronizamos en cada cambio de "value" para no crear un ida-y-vuelta
  // con el padre mientras el usuario edita.
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      if (h) setHours(h);
      if (m) setMinutes(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ya NO propagamos onChange en cada cambio de hours/minutes.
  // El valor solo se confirma hacia el padre al presionar "Guardar",
  // así el formulario padre no se re-renderiza mientras el usuario edita
  // (eso era lo que causaba el parpadeo).

  const handleGuardar = async (e) => {
    e.stopPropagation();
    const nuevoValor = `${hours}:${minutes}`;
    onChange(nuevoValor);

    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(nuevoValor);
        onClose();
      } catch (error) {
        setIsSaving(false);
        // Si falla, el usuario puede intentar de nuevo
      }
    } else {
      onClose();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      width: '100%',
      minWidth: '220px',
      background: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      zIndex: 1000,
      marginTop: '0.5rem',
      padding: '1rem',
      boxSizing: 'border-box',
      border: '1px solid #e5e7eb'
    }} onClick={(e) => e.stopPropagation()}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {/* Selector Overlay */}
        <div style={{
          position: 'absolute',
          top: '40px',
          height: '40px',
          width: '100%',
          borderTop: '2px solid #f3f4f6',
          borderBottom: '2px solid #f3f4f6',
          pointerEvents: 'none',
          backgroundColor: 'rgba(243, 244, 246, 0.3)',
          borderRadius: '4px'
        }}></div>

        <IOSPickerWheel options={hourOptions} value={hours} onChange={setHours} />
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#6b1d33', margin: '0 0.5rem' }}>:</span>
        <IOSPickerWheel options={minuteOptions} value={minutes} onChange={setMinutes} />
      </div>

      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          disabled={isSaving}
          style={{
            background: 'var(--tw-color-gray-100)',
            color: 'var(--tw-color-gray-600)',
            border: 'none',
            padding: '0.4rem 1rem',
            borderRadius: '0.5rem',
            fontWeight: '600',
            fontSize: '0.8rem',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            flex: 1,
            transition: 'background 0.2s',
            opacity: isSaving ? 0.5 : 1
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={handleGuardar}
          style={{
            background: '#6b1d33',
            color: 'white',
            border: 'none',
            padding: '0.4rem 1rem',
            borderRadius: '0.5rem',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: isSaving ? 'wait' : 'pointer',
            flex: 1,
            boxShadow: '0 2px 4px rgba(107, 29, 51, 0.2)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isSaving ? 0.8 : 1
          }}
        >
          {isSaving ? (
            <svg className="ios-animate-spin" style={{ width: '1rem', height: '1rem', color: 'white' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            'Guardar'
          )}
        </button>
      </div>
    </div>
  );
}