import React, { useState } from 'react';
import './ExcelVIsta.css';

const HEADER_TRANSLATIONS = {
  TIPO_DE_UNIDAD: 'Tipo Unidad',
  RUTA: 'Ruta',
  ECONOMICO: 'Económico',
  TARJETON: 'Tarjetón',
  NOMBRE_CONDUCTOR: 'Conductor',
  HORA_DE_ACOPLE: 'Hora de Acople',
  CORRIDAS: 'Corridas',
};

const EXCLUDED_KEYS = ['ESTATUS', 'FALLA', 'CICLO', 'MOTIVO', 'MOTIVO_ESTATUS', 'HORA_PROGRAMADA'];

export default function ExcelPreview({ 
  data = [], 
  catalogUnidades = [],
  catalogConductores = [],
  catalogRutas = [],
  onUpdate,
  onDelete, 
  onSave,        
  hasChanges,    
  isSaving       
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Las cabeceras del editor directo
  const headers = ['TIPO_DE_UNIDAD', 'ECONOMICO', 'TARJETON', 'NOMBRE_CONDUCTOR', 'RUTA', 'HORA_DE_ACOPLE', 'CORRIDAS'];

  // Filtrar los datos en base al término de búsqueda
  const filteredData = (data || []).filter(fila => {
    if (!fila) return false;
    return Object.entries(fila).some(([key, val]) => {
      if (EXCLUDED_KEYS.includes(key)) return false;
      return String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  return (
    <div className="excel-table-card">
      <div className="excel-table-header">
        <div className="excel-table-header-left">
          <h3>Programación Operativa Diaria</h3>
          <p className="excel-table-subtitle">Captura, edita y concilia las unidades en ruta para el día de hoy</p>
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
            {filteredData.length === (data || []).length 
              ? `${(data || []).length} registros`
              : `${filteredData.length} de ${(data || []).length} encontrados`
            }
          </span>
        </div>
      </div>

      {/* Datalists nativos HTML5 para autocompletado y selección súper rápida */}
      <datalist id="unidades-catalog">
        {(catalogUnidades || []).map(u => (
          <option key={u.id} value={u.numero_eco}>{(u.tipo || 'URBANUS').toUpperCase()}</option>
        ))}
      </datalist>

      <datalist id="conductores-catalog">
        {(catalogConductores || []).map(c => (
          <option key={c.id} value={c.tarjeton}>{c.nombre || ''}</option>
        ))}
      </datalist>

      <datalist id="rutas-catalog">
        {(catalogRutas || []).map((r, idx) => (
          <option key={idx} value={r}>{r}</option>
        ))}
      </datalist>

      <div className="table-wrapper">
        <table className="excel-preview-table">
          <thead>
            <tr>
              {headers.map(h => (
                <th key={h} className={`col-${h.toLowerCase()}`}>
                  {HEADER_TRANSLATIONS[h] || h}
                </th>
              ))}
              <th className="col-acciones" style={{ textAlign: 'center', width: '80px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  No hay registros. Haz clic en "+ Agregar Unidad" para iniciar.
                </td>
              </tr>
            ) : (
              filteredData.map((fila, index) => {
                const originalIndex = data.indexOf(fila);
                return (
                  <tr key={originalIndex !== -1 ? originalIndex : index}>
                    {headers.map(h => {
                      const isReadOnly = h === 'TIPO_DE_UNIDAD' || h === 'NOMBRE_CONDUCTOR';
                      
                      return (
                        <td key={h} className={`cell-${h.toLowerCase()}`}>
                          {isReadOnly ? (
                            <div style={{ padding: '0.45rem 0.6rem', fontSize: '0.875rem', color: '#4b5563', fontWeight: h === 'NOMBRE_CONDUCTOR' ? '600' : 'normal' }}>
                              {fila[h] || '-'}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={fila[h] ?? ''}
                              onChange={(e) => onUpdate && onUpdate(originalIndex !== -1 ? originalIndex : index, h, e.target.value)}
                              className="edit-input"
                              placeholder="-"
                              list={
                                h === 'ECONOMICO' ? 'unidades-catalog' :
                                h === 'TARJETON' ? 'conductores-catalog' :
                                h === 'RUTA' ? 'rutas-catalog' : undefined
                              }
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="cell-acciones" style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onDelete && onDelete(originalIndex !== -1 ? originalIndex : index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6b1d33',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(107, 29, 51, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Eliminar unidad"
                      >
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
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
