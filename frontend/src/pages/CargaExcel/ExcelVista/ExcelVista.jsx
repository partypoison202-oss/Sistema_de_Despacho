// src/pages/Unidades/ExcelVista/ExcelVista.jsx
import React from 'react';
import './ExcelVista.css';

export default function ExcelPreview({ 
  data, 
  onUpdate, 
  onSave,        
  hasChanges,    
  isSaving       
}) {
  if (!data || data.length === 0) return null;
  const headers = Object.keys(data[0]);

  return (
    <div className="excel-card preview-container">
      <h3>Datos cargados ({data.length} registros)</h3>
      <div className="table-wrapper">
        <table className="excel-preview-table">
          <thead>
            <tr>
              {headers.map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((fila, i) => (
              <tr key={i}>
                {headers.map(h => (
                  <td key={h}>
                    <input
                      type="text"
                      value={fila[h]}
                      onChange={(e) => onUpdate(i, h, e.target.value)}
                      className="edit-input"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasChanges && (
        <div className="excel-actions-bottom">
          <button 
            className="btn-excel-procesar"   // ← Cambio aquí
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}
