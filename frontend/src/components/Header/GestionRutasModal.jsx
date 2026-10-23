import React from 'react';
import GestionRutasAjustes from './GestionRutasAjustes';
import './GestionRutasModal.css';

export default function GestionRutasModal({ onClose }) {
  return (
    <div className="rutas-modal-overlay" onClick={onClose}>
      <div className="rutas-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="rutas-modal-header">
          <h2>Gestión de Rutas</h2>
          <button className="rutas-modal-close" onClick={onClose} title="Cerrar ventana">
            ×
          </button>
        </div>

        <div className="rutas-modal-body">
          <GestionRutasAjustes />
        </div>
      </div>
    </div>
  );
}
