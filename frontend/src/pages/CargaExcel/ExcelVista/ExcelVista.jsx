import React, { useState } from 'react';
import IOSTimePicker from '../../Unidades/componentsdetalleunidad/IOSTimePicker';
import './ExcelVIsta.css';

const HEADER_TRANSLATIONS = {
  TIPO_DE_UNIDAD: 'Tipo Unidad',
  RUTA: 'Ruta',
  ECONOMICO: 'Económico',
  TARJETON: 'Tarjetón',
  NOMBRE_CONDUCTOR: 'Conductor',
  ESTATUS: 'Estatus',
  HORA_DE_ACOPLE: 'Hora de Acople',
  CORRIDAS: 'Corridas',
};

const EXCLUDED_KEYS = ['FALLA', 'CICLO', 'MOTIVO', 'MOTIVO_ESTATUS', 'HORA_PROGRAMADA'];

export default function ExcelPreview({ 
  data = [], 
  catalogUnidades = [],
  catalogConductores = [],
  catalogRutasObj = { troncales: [], alimentadoras: [] },
  onUpdate,
  onClear, 
  onSave,        
  hasChanges,    
  isSaving       
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTimePickerRow, setActiveTimePickerRow] = useState(null);
  const [tempTime, setTempTime] = useState('00:00');
  const [openDropdown, setOpenDropdown] = useState({ rowIndex: null, field: null });
  const [dropdownSearch, setDropdownSearch] = useState('');

  // Las cabeceras del editor directo
  const headers = ['TIPO_DE_UNIDAD', 'ECONOMICO', 'RUTA', 'TARJETON', 'NOMBRE_CONDUCTOR', 'ESTATUS', 'HORA_DE_ACOPLE', 'CORRIDAS'];

  // Orden personalizado solicitado
  const customSortOrder = ['URBANUS', 'URBANUSS', 'ZAFIRO', 'VAGONETA', 'ORION'];

  // Estatus traducciones para mostrar (alineados a las reglas de la BD)
  const estatusTranslations = {
    operacion: 'Operación',
    mantenimiento: 'Mantenimiento',
    reserva: 'Reserva'
  };

  // Colores asociados a cada estatus para badges y listados
  const estatusColors = {
    operacion: { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },       // Verde
    mantenimiento: { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },   // Rojo
    reserva: { bg: 'rgba(59, 130, 246, 0.08)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' }        // Azul
  };

  // 1. Ordenar los datos por tipo de unidad (según el orden de la lista) y luego por ECO numérico
  const sortedData = [...(data || [])].sort((a, b) => {
    const typeA = String(a.TIPO_DE_UNIDAD || '').toUpperCase();
    const typeB = String(b.TIPO_DE_UNIDAD || '').toUpperCase();

    let indexA = customSortOrder.indexOf(typeA);
    if (indexA === -1) indexA = 999;
    let indexB = customSortOrder.indexOf(typeB);
    if (indexB === -1) indexB = 999;

    if (indexA !== indexB) {
      return indexA - indexB;
    }

    const ecoA = parseInt(a.ECONOMICO || '0', 10);
    const ecoB = parseInt(b.ECONOMICO || '0', 10);
    return ecoA - ecoB;
  });

  // 2. Filtrar los datos en base al término de búsqueda
  const filteredData = sortedData.filter(fila => {
    if (!fila) return false;
    return Object.entries(fila).some(([key, val]) => {
      if (EXCLUDED_KEYS.includes(key)) return false;
      return String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  const handleOpenDropdown = (rowIndex, field) => {
    setDropdownSearch('');
    setOpenDropdown({ rowIndex, field });
  };

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
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} style={{ textAlign: 'center', padding: '2.5rem', color: '#9ca3af', fontWeight: '500' }}>
                  No hay registros operativos disponibles.
                </td>
              </tr>
            ) : (
              filteredData.map((fila, index) => {
                const originalIndex = data.indexOf(fila);
                const rawRowStatus = String(fila.ESTATUS || 'operacion').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const isRowDisabled = rawRowStatus.includes('mantenimiento') || rawRowStatus.includes('reserva');

                return (
                  <tr key={originalIndex !== -1 ? originalIndex : index}>
                    {headers.map(h => {
                      const isReadOnly = h === 'TIPO_DE_UNIDAD' || h === 'ECONOMICO' || h === 'NOMBRE_CONDUCTOR';

                      if (h === 'HORA_DE_ACOPLE') {
                        const isOpen = activeTimePickerRow === originalIndex;
                        return (
                          <td key={h} className={`cell-${h.toLowerCase()}`} style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isOpen) {
                                  setTempTime(fila[h] || '00:00');
                                  setActiveTimePickerRow(originalIndex);
                                  setOpenDropdown({ rowIndex: null, field: null });
                                } else {
                                  setActiveTimePickerRow(null);
                                }
                              }}
                              disabled={isRowDisabled}
                              className={`edit-input dropdown-trigger ${isOpen ? 'active-trigger' : ''}`}
                              style={{ 
                                textAlign: 'center', 
                                height: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                fontWeight: '600',
                                borderRadius: '6px',
                                cursor: isRowDisabled ? 'not-allowed' : 'pointer',
                                opacity: isRowDisabled ? 0.6 : 1
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '4px' }}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{fila[h] || '00:00'}</span>
                              </div>
                            </button>
                            {isOpen && (
                              <>
                                <div 
                                  style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                                  onClick={(e) => { e.stopPropagation(); setActiveTimePickerRow(null); }}
                                />
                                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 999, width: '220px' }}>
                                  <IOSTimePicker
                                    value={tempTime}
                                    onChange={setTempTime}
                                    onClose={() => setActiveTimePickerRow(null)}
                                    onSave={async () => {
                                      onUpdate && onUpdate(originalIndex !== -1 ? originalIndex : index, h, tempTime);
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </td>
                        );
                      }

                      if (h === 'RUTA') {
                        const isTroncal = fila.TIPO_DE_UNIDAD === 'URBANUS' || fila.TIPO_DE_UNIDAD === 'URBANUSS';
                        const availableRoutes = isTroncal ? (catalogRutasObj.troncales || []) : (catalogRutasObj.alimentadoras || []);
                        const isRutaOpen = openDropdown.rowIndex === originalIndex && openDropdown.field === 'RUTA';
                        
                        const filteredRoutes = availableRoutes.filter(r => 
                          r.toLowerCase().includes(dropdownSearch.toLowerCase())
                        );

                        return (
                          <td key={h} className={`cell-${h.toLowerCase()}`} style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (isRutaOpen) {
                                  setOpenDropdown({ rowIndex: null, field: null });
                                } else {
                                  setActiveTimePickerRow(null);
                                  handleOpenDropdown(originalIndex, 'RUTA');
                                }
                              }}
                              disabled={isRowDisabled}
                              className={`edit-input dropdown-trigger ${isRutaOpen ? 'active-trigger' : ''}`}
                              style={{ cursor: isRowDisabled ? 'not-allowed' : 'pointer', opacity: isRowDisabled ? 0.6 : 1 }}
                            >
                              <span>{fila[h] || 'Selecciona...'}</span>
                              <svg style={{ transform: isRutaOpen ? 'rotate(90deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                              </svg>
                            </button>
                            {isRutaOpen && (
                              <>
                                <div 
                                  style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                                  onClick={(e) => { e.stopPropagation(); setOpenDropdown({ rowIndex: null, field: null }); }}
                                />
                                <div className="dropdown-menu">
                                  <div className="dropdown-menu-search-container">
                                    <input
                                      type="text"
                                      placeholder="Buscar ruta..."
                                      value={dropdownSearch}
                                      onChange={(e) => setDropdownSearch(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="dropdown-menu-search-input"
                                    />
                                  </div>
                                  <div className="dropdown-menu__scroll">
                                    <button
                                      type="button"
                                      className="dropdown-menu__item dropdown-menu__item--none"
                                      onClick={() => {
                                        onUpdate && onUpdate(originalIndex !== -1 ? originalIndex : index, h, '');
                                        setOpenDropdown({ rowIndex: null, field: null });
                                      }}
                                    >
                                      NINGUNA
                                    </button>
                                    {filteredRoutes.length === 0 ? (
                                      <div className="dropdown-menu-no-results">Sin coincidencias</div>
                                    ) : (
                                      filteredRoutes.map((r, idx) => {
                                        const isSelected = fila[h] === r;
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            className={`dropdown-menu__item ${isSelected ? 'dropdown-menu__item--selected' : ''}`}
                                            onClick={() => {
                                              onUpdate && onUpdate(originalIndex !== -1 ? originalIndex : index, h, r);
                                              setOpenDropdown({ rowIndex: null, field: null });
                                            }}
                                          >
                                            <span>{r}</span>
                                            {isSelected && (
                                              <svg className="selected-check-icon" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </td>
                        );
                      }

                      if (h === 'TARJETON') {
                        const isTarjetonOpen = openDropdown.rowIndex === originalIndex && openDropdown.field === 'TARJETON';
                        
                        const isTroncal = fila.TIPO_DE_UNIDAD === 'URBANUS' || fila.TIPO_DE_UNIDAD === 'URBANUSS';
                        
                        const filteredDrivers = (catalogConductores || []).filter(c => {
                          if (isTroncal && String(c.tipo_tarjeton).toUpperCase() !== 'C') return false;
                          
                          return String(c.tarjeton).toLowerCase().includes(dropdownSearch.toLowerCase()) ||
                                 String(c.nombre).toLowerCase().includes(dropdownSearch.toLowerCase());
                        });

                        return (
                          <td key={h} className={`cell-${h.toLowerCase()}`} style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (isTarjetonOpen) {
                                  setOpenDropdown({ rowIndex: null, field: null });
                                } else {
                                  setActiveTimePickerRow(null);
                                  handleOpenDropdown(originalIndex, 'TARJETON');
                                }
                              }}
                              disabled={isRowDisabled}
                              className={`edit-input dropdown-trigger ${isTarjetonOpen ? 'active-trigger' : ''}`}
                              style={{ cursor: isRowDisabled ? 'not-allowed' : 'pointer', opacity: isRowDisabled ? 0.6 : 1 }}
                            >
                              <span>{fila[h] ? String(fila[h]) : 'Selecciona...'}</span>
                              <svg style={{ transform: isTarjetonOpen ? 'rotate(90deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                              </svg>
                            </button>
                            {isTarjetonOpen && (
                              <>
                                <div 
                                  style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                                  onClick={(e) => { e.stopPropagation(); setOpenDropdown({ rowIndex: null, field: null }); }}
                                />
                                <div className="dropdown-menu" style={{ width: '100%', minWidth: '130px' }}>
                                  <div className="dropdown-menu-search-container">
                                    <input
                                      type="text"
                                      placeholder="Buscar conductor o tarjetón..."
                                      value={dropdownSearch}
                                      onChange={(e) => setDropdownSearch(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="dropdown-menu-search-input"
                                    />
                                  </div>
                                  <div className="dropdown-menu__scroll">
                                    <button
                                      type="button"
                                      className="dropdown-menu__item dropdown-menu__item--none"
                                      onClick={() => {
                                        onUpdate && onUpdate(originalIndex !== -1 ? originalIndex : index, h, '');
                                        setOpenDropdown({ rowIndex: null, field: null });
                                      }}
                                    >
                                      NINGUNO
                                    </button>
                                    {filteredDrivers.length === 0 ? (
                                      <div className="dropdown-menu-no-results">Sin coincidencias</div>
                                    ) : (
                                      filteredDrivers.map((c, idx) => {
                                        const isSelected = String(fila[h]).trim() === String(c.tarjeton).trim();
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            className={`dropdown-menu__item ${isSelected ? 'dropdown-menu__item--selected' : ''}`}
                                            onClick={() => {
                                              onUpdate && onUpdate(originalIndex !== -1 ? originalIndex : index, h, String(c.tarjeton).trim());
                                              setOpenDropdown({ rowIndex: null, field: null });
                                            }}
                                          >
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
                                              <span>{c.tarjeton}</span>
                                              <span style={{
                                                fontSize: '0.65rem',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '1rem',
                                                backgroundColor: c.estado_servicio === 'en_servicio' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                                color: c.estado_servicio === 'en_servicio' ? '#ef4444' : '#22c55e',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.02em',
                                                lineHeight: '1'
                                              }}>
                                                {c.estado_servicio === 'en_servicio' ? 'Servicio' : 'Disponible'}
                                              </span>
                                            </span>
                                            {isSelected && (
                                              <svg className="selected-check-icon" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </td>
                        );
                      }

                      if (h === 'ESTATUS') {
                        const isEstatusOpen = openDropdown.rowIndex === originalIndex && openDropdown.field === 'ESTATUS';
                        const rawStatus = String(fila[h] || 'operacion').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const currentStatus = rawStatus.includes('mantenimiento') ? 'mantenimiento' : rawStatus.includes('reserva') ? 'reserva' : 'operacion';
                        const statusStyle = estatusColors[currentStatus] || estatusColors.operacion;

                        return (
                          <td key={h} className={`cell-${h.toLowerCase()}`} style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (isEstatusOpen) {
                                  setOpenDropdown({ rowIndex: null, field: null });
                                } else {
                                  setActiveTimePickerRow(null);
                                  handleOpenDropdown(originalIndex, 'ESTATUS');
                                }
                              }}
                              className={`edit-input dropdown-trigger ${isEstatusOpen ? 'active-trigger' : ''}`}
                              style={{ cursor: 'pointer' }}
                            >
                              <span>{estatusTranslations[currentStatus]}</span>
                              <svg style={{ transform: isEstatusOpen ? 'rotate(90deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                              </svg>
                            </button>
                            {isEstatusOpen && (
                              <>
                                <div 
                                  style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                                  onClick={(e) => { e.stopPropagation(); setOpenDropdown({ rowIndex: null, field: null }); }}
                                />
                                <div className="dropdown-menu" style={{ width: '100%', minWidth: '130px' }}>
                                  <div className="dropdown-menu__scroll">
                                    {Object.entries(estatusTranslations).map(([key, label], idx) => {
                                      const isSelected = currentStatus === key;
                                      const optStyle = estatusColors[key];
                                      return (
                                        <button
                                          key={idx}
                                          type="button"
                                          className={`dropdown-menu__item ${isSelected ? 'dropdown-menu__item--selected' : ''}`}
                                          style={{
                                            color: isSelected ? 'var(--brand-maroon-bg)' : optStyle.text,
                                            fontWeight: isSelected ? '700' : '600'
                                          }}
                                          onClick={() => {
                                            onUpdate && onUpdate(originalIndex !== -1 ? originalIndex : index, h, key);
                                            setOpenDropdown({ rowIndex: null, field: null });
                                          }}
                                        >
                                          <span>{label}</span>
                                          {isSelected && (
                                            <svg className="selected-check-icon" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            )}
                          </td>
                        );
                      }

                      return (
                        <td key={h} className={`cell-${h.toLowerCase()}`}>
                          {isReadOnly ? (
                            <div style={{ 
                              padding: '0.45rem 0.6rem', 
                              fontSize: '0.875rem', 
                              color: h === 'ECONOMICO' ? '#111827' : '#4b5563', 
                              fontWeight: (h === 'TIPO_DE_UNIDAD' || h === 'ECONOMICO') ? '700' : 'normal', 
                              textAlign: h === 'ECONOMICO' ? 'center' : 'left'
                            }}>
                              {fila[h] || ''}
                            </div>
                          ) : (
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: h === 'CORRIDAS' ? 'center' : 'flex-start', width: '100%' }}>
                              <input
                                type="text"
                                disabled={isRowDisabled}
                                value={fila[h] ?? ''}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (h === 'CORRIDAS') {
                                    val = val.replace(/\D/g, '').substring(0, 2);
                                  }
                                  onUpdate && onUpdate(originalIndex !== -1 ? originalIndex : index, h, val);
                                }}
                                className={`edit-input edit-text-input ${h === 'CORRIDAS' ? 'text-center' : ''}`}
                                placeholder=""
                                maxLength={h === 'CORRIDAS' ? 2 : undefined}
                                style={{ 
                                  paddingRight: h === 'CORRIDAS' ? '0' : '8px',
                                  cursor: isRowDisabled ? 'not-allowed' : 'text',
                                  opacity: isRowDisabled ? 0.6 : 1,
                                  width: h === 'CORRIDAS' ? '3.5rem' : '100%',
                                  margin: h === 'CORRIDAS' ? '0 auto' : '0',
                                  textAlign: h === 'CORRIDAS' ? 'center' : 'left'
                                }}
                              />
                            </div>
                          )}
                        </td>
                      );
                    })}
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
            Tienes cambios sin guardar en esta sesión
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
