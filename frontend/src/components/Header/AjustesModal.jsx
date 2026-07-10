import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import './AjustesModal.css';

const AjustesModal = ({ onClose }) => {
  const { fontSize, setFontSize, showClock, setShowClock } = useSettings();

  return (
    <div className="ajustes-modal-overlay" onClick={onClose}>
      <div className="ajustes-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ajustes-modal-header">
          <h2>Ajustes del Sistema</h2>
          <button className="ajustes-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="ajustes-modal-body">
          <div className="ajuste-section">
            <label className="ajuste-label">Tamaño de Letra</label>
            <p className="ajuste-desc">Selecciona el tamaño de letra para mejorar tu experiencia visual.</p>
            
            <div className="font-size-options">
              <button 
                className={`font-btn ${fontSize === 'normal' ? 'active' : ''}`}
                onClick={() => setFontSize('normal')}
              >
                Normal
              </button>
              <button 
                className={`font-btn ${fontSize === 'large' ? 'active' : ''}`}
                onClick={() => setFontSize('large')}
              >
                Grande
              </button>
              <button 
                className={`font-btn ${fontSize === 'xlarge' ? 'active' : ''}`}
                onClick={() => setFontSize('xlarge')}
              >
                Muy Grande
              </button>
            </div>
            
            <div className="font-size-preview">
              <p>Texto de prueba para el tamaño de letra.</p>
            </div>
          </div>

          <hr className="ajuste-divider" />

          <div className="ajuste-section">
            <label className="ajuste-label">Reloj Global</label>
            <p className="ajuste-desc">Muestra u oculta el reloj flotante en las pantallas del sistema.</p>
            
            <div className="font-size-options">
              <button 
                className={`font-btn ${showClock ? 'active' : ''}`}
                onClick={() => setShowClock(true)}
              >
                Activado
              </button>
              <button 
                className={`font-btn ${!showClock ? 'active' : ''}`}
                onClick={() => setShowClock(false)}
              >
                Desactivado
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjustesModal;
