// components/PatioStatusBadge.js
import React from 'react';

const PatioStatusBadge = ({ loading, onSync }) => (
  <div className="floating-status-badge">
    <span className="online-badge pulse-green-dot">Monitoreo en Vivo</span>
    <button className="sync-btn-icon" onClick={onSync} disabled={loading}>
      {/* icono */}
    </button>
  </div>
);

export default PatioStatusBadge;