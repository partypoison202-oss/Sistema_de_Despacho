const fs = require('fs');
const filePath = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace Tarjeton Block
const tarjetonRegex = /\{\/\* 2\. Número de Tarjetón \(Editable\) \*\/\}(.|\n)*?\{\/\* 3\. Corrida \*\/\}/m;
const tarjetonReplacement = `            {/* 2. Número de Tarjetón */}
            <div className="info-card__item">
              <span className="info-card__label">Número de Tarjetón</span>
              <div className="info-card__value-wrapper" style={{ justifyContent: 'space-between', opacity: isReservaOrMantenimiento ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.378-1.377 2.622-1.377 4 0" />
                  </svg>
                  <p className="info-card__value">
                    {cargandoDatos ? 'Buscando...' : (datosOperativos.tarjeton || 'No asignado')}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Corrida */}`;
content = content.replace(tarjetonRegex, tarjetonReplacement);

// Replace Ruta Block
const rutaRegex = /\{\/\* 4\. Ruta Asignada \*\/\}\n\s*<div className="info-card__item" style=\{\{ marginTop: '0\.85rem' \}\}>\n\s*<span className="info-card__label">Ruta Asignada<\/span>(.|\n)*?\{\/\* CARD 2: DETALLES DE DESPACHO \(EXCEL\) \*\/\}/m;
const rutaReplacement = `{/* 4. Ruta Asignada */}
            <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
              <span className="info-card__label">Ruta Asignada</span>
              <div className="info-card__value-wrapper" style={{ justifyContent: 'space-between', opacity: isReservaOrMantenimiento ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="info-card__value">
                    {cargandoDatos ? 'Buscando...' : (datosOperativos.ruta || 'Sin ruta')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: DETALLES DE DESPACHO (EXCEL) */}`;
content = content.replace(rutaRegex, rutaReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Blocks replaced.');
