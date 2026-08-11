const fs = require('fs');
const path = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx';
let code = fs.readFileSync(path, 'utf8');

// Normlize line endings for consistent matching
code = code.replace(/\r\n/g, '\n');

// 1. Add states
const stateOld = '  const [guardandoSalida, setGuardandoSalida] = useState(false);\n\n  const isReservaOrMantenimiento = datosOperativos.estatus === \'RESERVA\' || datosOperativos.estatus === \'MANTENIMIENTO\';';
const stateNew = '  const [guardandoSalida, setGuardandoSalida] = useState(false);\n\n  const observacionesRef = useRef(null);\n  const observacionesInputRef = useRef(null);\n  const [obsDropdownPos, setObsDropdownPos] = useState({ top: 0, left: 0, width: 0 });\n  const [observacionesCatalogo, setObservacionesCatalogo] = useState([]);\n  const [dropdownObservacionesOpen, setDropdownObservacionesOpen] = useState(false);\n  const [formObservaciones, setFormObservaciones] = useState(\'\');\n\n  const isReservaOrMantenimiento = datosOperativos.estatus === \'RESERVA\' || datosOperativos.estatus === \'MANTENIMIENTO\';';
code = code.replace(stateOld, stateNew);

// 2. Add useEffects
const effectOld = '  // Inicializar hora programada y observaciones desde datosOperativos\n  useEffect(() => {\n    if (datosOperativos.horaProgramada) setFormHoraProgramada(datosOperativos.horaProgramada);\n    setObservaciones(datosOperativos.observaciones || \'\');\n  }, [datosOperativos]);';
const effectNew = '  // Inicializar hora programada y observaciones desde datosOperativos\n  useEffect(() => {\n    if (datosOperativos.horaProgramada) setFormHoraProgramada(datosOperativos.horaProgramada);\n    setObservaciones(datosOperativos.observaciones || \'\');\n    setFormObservaciones(datosOperativos.observaciones || \'\');\n  }, [datosOperativos]);\n\n  useEffect(() => {\n    const fetchObservacionesCatalogo = async () => {\n      try {\n        const token = (localStorage.getItem(\'token\') || sessionStorage.getItem(\'token\'));\n        const res = await fetch(`${API_BASE}/api/observaciones-catalogo`, {\n          headers: { Authorization: `Bearer ${token}` }\n        });\n        if (res.ok) {\n          const data = await res.json();\n          setObservacionesCatalogo(data || []);\n        }\n      } catch (err) {\n        console.error(\'Error fetching observaciones catalogo\', err);\n      }\n    };\n    fetchObservacionesCatalogo();\n  }, []);';
code = code.replace(effectOld, effectNew);

// 3. Replace textarea
const textAreaStart = '            {/* Observaciones (Replaces Corridas Perdidas) */}\n            {!isPlataforma && (\n              <div className="info-card__item">\n                <span className="info-card__label">Observaciones</span>\n                <textarea\n                  className="interactive-input"\n                  maxLength={120}\n                  rows={2}\n                  value={observaciones}\n                  onChange={(e) => setObservaciones(e.target.value)}\n                  disabled={isPlataforma || isReservaOrMantenimiento || !!salidaCongelada}\n                  style={{\n                    width: \'100%\',\n                    padding: \'0.5rem\',\n                    fontSize: \'0.85rem\',\n                    marginTop: \'0.25rem\',\n                    resize: \'none\',\n                    borderRadius: \'0.5rem\',\n                    border: \'1px solid #e5e7eb\',\n                  }}\n                  placeholder="Escribe alguna observación (opcional)..."\n                />\n              </div>\n            )}';
const portalCode = `            {/* Observaciones (Replaces Corridas Perdidas) */}
            {!isPlataforma && (
              <div className="info-card__item" ref={observacionesRef} style={{ position: 'relative' }}>
                <span className="info-card__label">Observaciones</span>
                <div
                  ref={observacionesInputRef}
                  className="interactive-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 0.85rem',
                    background: 'var(--tw-color-white)',
                    height: '2.3rem',
                    width: '100%',
                    marginTop: '0.25rem',
                    fontWeight: 'normal',
                    borderColor: dropdownObservacionesOpen ? 'var(--brand-maroon-text)' : undefined,
                    opacity: (isPlataforma || isReservaOrMantenimiento || !!salidaCongelada) ? 0.6 : 1,
                    pointerEvents: (isPlataforma || isReservaOrMantenimiento || !!salidaCongelada) ? 'none' : 'auto'
                  }}
                >
                  <input
                    type="text"
                    placeholder="Buscar observación..."
                    value={formObservaciones}
                    onChange={(e) => {
                      setFormObservaciones(e.target.value);
                      setObservaciones(e.target.value);
                      const rect = observacionesInputRef.current?.getBoundingClientRect();
                      if (rect) setObsDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
                      setDropdownObservacionesOpen(true);
                    }}
                    onFocus={() => {
                      const rect = observacionesInputRef.current?.getBoundingClientRect();
                      if (rect) setObsDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
                      setDropdownObservacionesOpen(true);
                    }}
                    onBlur={() => setTimeout(() => setDropdownObservacionesOpen(false), 150)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      width: '100%',
                      fontSize: '0.85rem',
                      color: dropdownObservacionesOpen ? 'var(--brand-maroon-text)' : 'inherit',
                    }}
                  />
                  <svg
                    onClick={() => {
                      const next = !dropdownObservacionesOpen;
                      if (next) {
                        const rect = observacionesInputRef.current?.getBoundingClientRect();
                        if (rect) setObsDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
                      }
                      setDropdownObservacionesOpen(next);
                    }}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: dropdownObservacionesOpen ? 'rotate(180deg)' : 'none', width: '1.2rem', height: '1.2rem', padding: '0.2rem', color: dropdownObservacionesOpen ? 'var(--brand-maroon-text)' : 'inherit', flexShrink: 0, marginLeft: '0.5rem' }}
                    fill="currentColor" viewBox="0 0 24 24"
                  >
                    <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                  </svg>
                </div>
                {dropdownObservacionesOpen && createPortal(
                  <div
                    style={{
                      position: 'absolute',
                      top: obsDropdownPos.top,
                      left: obsDropdownPos.left,
                      width: obsDropdownPos.width,
                      background: 'white',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      borderRadius: '0.875rem',
                      boxShadow: '0 12px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                      zIndex: 9999,
                      overflow: 'hidden',
                      maxHeight: '8rem',
                      overflowY: 'auto',
                    }}
                  >
                    {observacionesCatalogo
                      .filter(obs => \`\${obs.clave} - \${obs.descripcion}\`.toLowerCase().includes(formObservaciones.toLowerCase()))
                      .map(obs => {
                        const label = \`\${obs.clave} - \${obs.descripcion}\`;
                        return (
                          <button
                            key={obs.clave}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormObservaciones(label);
                              setObservaciones(label);
                              setDropdownObservacionesOpen(false);
                            }}
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '0.6rem 1rem',
                              fontSize: '0.85rem',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#374151',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {label}
                          </button>
                        );
                      })}
                    {observacionesCatalogo.filter(obs => \`\${obs.clave} - \${obs.descripcion}\`.toLowerCase().includes(formObservaciones.toLowerCase())).length === 0 && (
                      <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center' }}>Sin resultados</div>
                    )}
                  </div>,
                  document.body
                )}
              </div>
            )}`;
            
code = code.replace(textAreaStart, portalCode);

// Optional formatting for CRLF
code = code.replace(/\n/g, '\r\n');

fs.writeFileSync(path, code, 'utf8');
console.log('Done.');
