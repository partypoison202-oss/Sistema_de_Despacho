const fs = require('fs');
const path = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/pages/Encierro/DetalleUnidadEncierro.jsx';
let code = fs.readFileSync(path, 'utf8');

// ─────────────────────────────────────────────────────────────
// 1. Add new state refs after observacionesRef
// ─────────────────────────────────────────────────────────────
const stateAfterRef = `  const observacionesRef = useRef(null);`;
const stateReplacement = `  const observacionesRef = useRef(null);
  const observacionesInputRef = useRef(null);
  const [obsDropdownPos, setObsDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [observacionesCatalogo, setObservacionesCatalogo] = useState([]);
  const [dropdownObservacionesOpen, setDropdownObservacionesOpen] = useState(false);
  const [formObservaciones, setFormObservaciones] = useState('');`;

if (code.includes(stateAfterRef)) {
  code = code.replace(stateAfterRef, stateReplacement);
  console.log('✅ Step 1: State added');
} else {
  console.log('❌ Step 1: observacionesRef not found');
}

// ─────────────────────────────────────────────────────────────
// 2. Sync formObservaciones when datosOperativos changes
// ─────────────────────────────────────────────────────────────
const obsInitOld = `    setObservaciones(datosOperativos.observaciones || '');`;
const obsInitNew = `    setObservaciones(datosOperativos.observaciones || '');
    setFormObservaciones(datosOperativos.observaciones || '');`;
if (code.includes(obsInitOld)) {
  code = code.replace(obsInitOld, obsInitNew);
  console.log('✅ Step 2: formObservaciones sync added');
} else {
  console.log('❌ Step 2: setObservaciones line not found');
}

// ─────────────────────────────────────────────────────────────
// 3. Add fetchObservacionesCatalogo useEffect after fetchRutas
// ─────────────────────────────────────────────────────────────
const afterFetchRutas = `    fetchRutas();
  }, [tipoTransporte]);`;
const afterFetchRutasNew = `    fetchRutas();
  }, [tipoTransporte]);

  useEffect(() => {
    const fetchObservacionesCatalogo = async () => {
      try {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const res = await fetch(\`\${API_BASE}/api/observaciones-catalogo\`, {
          headers: { Authorization: \`Bearer \${token}\` }
        });
        if (res.ok) {
          const data = await res.json();
          setObservacionesCatalogo(data || []);
        }
      } catch (err) {
        console.error('Error fetching observaciones catalogo', err);
      }
    };
    fetchObservacionesCatalogo();
  }, []);`;

if (code.includes(afterFetchRutas)) {
  code = code.replace(afterFetchRutas, afterFetchRutasNew);
  console.log('✅ Step 3: fetchObservacionesCatalogo useEffect added');
} else {
  console.log('❌ Step 3: afterFetchRutas anchor not found');
}

// ─────────────────────────────────────────────────────────────
// 4. Disable editandoTarjeton & editandoRuta in Encierro
// ─────────────────────────────────────────────────────────────
// Count occurrences of {editandoTarjeton ? (
const tarjetonMatches = (code.match(/\{editandoTarjeton \? \(/g) || []).length;
const rutaMatches = (code.match(/\{editandoRuta \? \(/g) || []).length;
code = code.replace(/\{editandoTarjeton \? \(/g, '{false ? (');
code = code.replace(/\{editandoRuta \? \(/g, '{false ? (');
console.log(`✅ Step 4: Replaced ${tarjetonMatches} tarjeton + ${rutaMatches} ruta edit toggles`);

// ─────────────────────────────────────────────────────────────
// 5. Remove pencil button from Ruta Asignada (in the read-only branch)
//    The button has title="Modificar Ruta"
// ─────────────────────────────────────────────────────────────
const pencilBlock = `                            {!cargandoDatos && (
                              <button
                                onClick={() => {
                                  setFormRuta(datosOperativos.ruta || '');
                                  setEditandoRuta(true);
                                  setDropdownRutaOpen(true);
                                }}
                                title="Modificar Ruta"
                                style={{ background: 'transparent', color: '#c29b53', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                              >
                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}`;
if (code.includes(pencilBlock)) {
  code = code.replace(pencilBlock, '');
  console.log('✅ Step 5: Pencil button removed from Ruta Asignada');
} else {
  console.log('❌ Step 5: Pencil button block not found (may have CRLF differences)');
  // Try with \r\n
  const pencilBlockCRLF = pencilBlock.replace(/\n/g, '\r\n');
  if (code.includes(pencilBlockCRLF)) {
    code = code.replace(pencilBlockCRLF, '');
    console.log('✅ Step 5b: Pencil button removed (CRLF version)');
  } else {
    console.log('❌ Step 5b also failed — will use regex');
    code = code.replace(/\s*\{!cargandoDatos &&[\s\S]*?title="Modificar Ruta"[\s\S]*?<\/button>\s*\)}/m, '');
    console.log('✅ Step 5c: Pencil button removed via regex');
  }
}

// ─────────────────────────────────────────────────────────────
// 6. Replace the textarea observaciones with Portal dropdown
// ─────────────────────────────────────────────────────────────
// Find the textarea block
const textareaBlock = /<div className="info-card__item">\s*<span className="info-card__label">Observaciones<\/span>\s*<textarea[\s\S]*?<\/textarea>\s*<\/div>/;
const portalDropdown = `<div className="info-card__item" ref={observacionesRef} style={{ position: 'relative' }}>
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
                            opacity: (cargandoDatos || !selectedOption || !!acopleCongelado) ? 0.6 : 1,
                            pointerEvents: (cargandoDatos || !selectedOption || !!acopleCongelado) ? 'none' : 'auto'
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
                              maxHeight: '14rem',
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
                      </div>`;

if (textareaBlock.test(code)) {
  code = code.replace(textareaBlock, portalDropdown);
  console.log('✅ Step 6: textarea replaced with Portal dropdown');
} else {
  console.log('❌ Step 6: textarea block not found via regex');
}

fs.writeFileSync(path, code, 'utf8');
console.log('\n✅ Done. File saved.');
