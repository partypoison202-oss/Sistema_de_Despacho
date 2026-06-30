// src/pages/CargaExcel/ExcelVista/ExcelVista.jsx
import React, { useState } from 'react';
import './ExcelVIsta.css';

const HEADER_TRANSLATIONS = {
  TIPO_DE_UNIDAD: 'Tipo Unidad',
  RUTA: 'Ruta',
  ECONOMICO: 'Económico',
  TARJETON: 'Tarjetón',
  NOMBRE_CONDUCTOR: 'Conductor',
  ESTATUS: 'Estatus',
  CORRIDAS: 'Corridas',
  HORA_SALIDA: 'Hora Salida'
};

const EXCLUDED_KEYS = ['FALLA', 'CICLO', 'MOTIVO'];

export default function ExcelPreview({ 
  data, 
  onUpdate, 
  onSave,        
  hasChanges,    
  isSaving       
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!data || data.length === 0) return null;

  // Filtrar cabeceras excluyendo las que no se necesitan en esta vista
  const headers = Object.keys(data[0]).filter(h => !EXCLUDED_KEYS.includes(h));

  // Filtrar los datos en base al término de búsqueda
  const filteredData = data.filter(fila => {
    return Object.entries(fila).some(([key, val]) => {
      if (EXCLUDED_KEYS.includes(key)) return false;
      return String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  return (
    <div className="excel-table-card">
      <div className="excel-table-header">
        <div className="excel-table-header-left">
          <h3>Operación Diaria</h3>
          <p className="excel-table-subtitle">Edita cualquier celda directamente haciendo clic sobre ella</p>
        </div>
        <div className="excel-table-header-right">
          <div className="search-container">
            <svg className="search-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar unidad, conductor, ruta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <span className="registro-count-badge">
            {filteredData.length === data.length 
              ? `${data.length} registros`
              : `${filteredData.length} de ${data.length} encontrados`
            }
          </span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="excel-preview-table">
          <thead>
            <tr>
              {headers.map(h => (
                <th key={h} className={`col-${h.toLowerCase()}`}>
                  {HEADER_TRANSLATIONS[h] || h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((fila) => {
              const originalIndex = data.indexOf(fila);
              return (
                <tr key={originalIndex}>
                  {headers.map(h => (
                    <td key={h} className={`cell-${h.toLowerCase()}`}>
                      <input
                        type="text"
                        value={fila[h] ?? ''}
                        onChange={(e) => onUpdate(originalIndex, h, e.target.value)}
                        className="edit-input"
                        placeholder="-"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasChanges && (
        <div className="excel-actions-bottom">
          <div className="cambios-advertencia">
            <span className="pulsing-dot"></span>
            Tienes cambios sin guardar
          </div>
          <button 
            className="btn-excel-sincronizar save-changes-btn"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="spinner-mini"></span>
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar Cambios</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}


