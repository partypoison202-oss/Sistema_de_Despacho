const fs = require('fs');

const frontendPath = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/pages/Infraccion/InfraccionDashboard.jsx';

let code = fs.readFileSync(frontendPath, 'utf8');

// Remove everything between "Selector de procedimiento" and the Infraccion Form
const removeAmonestacionRegex = /\{!placaStatus\.has_amonestacion \? \([\s\S]*?\/\* CASO B: FORMULARIO DE INFRACCIÓN                                          \*\//;
code = code.replace(removeAmonestacionRegex, `{/* FORMULARIO DE INFRACCIÓN */`);

// Clean up the top part of the status display where it conditionally renders amonestacion text
const replaceStatusText = /\{placaStatus\.has_amonestacion[\s\S]*?\}<\/p>/;
code = code.replace(replaceStatusText, `<>Las placas <b>{placaStatus.placa}</b> están siendo registradas para una Infracción.</></p>`);

const replaceStatusHeader = /\{placaStatus\.has_amonestacion\s*\?\s*\`HISTORIAL REGISTRADO — PLACAS \$\{placaStatus\.placa\}\`\s*:\s*\`VEHÍCULO SIN ANTECEDENTES — PLACAS \$\{placaStatus\.placa\}\`\}/;
code = code.replace(replaceStatusHeader, `\`REGISTRO DE INFRACCIÓN — PLACAS \${placaStatus.placa}\``);

const replaceStatusBadge = /\{placaStatus\.has_amonestacion\s*\?\s*\`ANTECEDENTES DETECTADOS \(\$\{placaStatus\.total_amonestaciones\} AMONESTACIÓN\/ES\)\`\s*:\s*'SIN ANTECEDENTES REGISTRADOS'\}/;
code = code.replace(replaceStatusBadge, `'INFRACCIÓN DE TRÁNSITO'`);

const replaceStatusHeroBadge = /className=\{\`status-hero-badge \$\{placaStatus\.has_amonestacion \? 'red' : 'green'\}\`\}/;
code = code.replace(replaceStatusHeroBadge, `className="status-hero-badge red"`);

// Find handleSubmitAmonestacion and remove it
const removeHandleAmonestacion = /  \/\/ GUARDAR ACTA DE AMONESTACIÓN[\s\S]*?  \/\/ GUARDAR BOLETA DE INFRACCIÓN/;
code = code.replace(removeHandleAmonestacion, "  // GUARDAR BOLETA DE INFRACCIÓN");

// Modify handleSubmitInfraccion to use FormData
const regexInfraccionFetch = /const payload = \{[\s\S]*?\};[\s\S]*?const res = await fetch\(`\$\{API_BASE\}\/api\/infracciones`, \{[\s\S]*?body: JSON\.stringify\(payload\)[\s\S]*?\}\);/;
const fetchNew = `const formData = new FormData();
      formData.append('fecha_expedicion', infFechaExpedicion);
      formData.append('hora_intervencion', infHoraIntervencion);
      formData.append('municipio', infMunicipio);
      formData.append('calle', infCalle);
      formData.append('numero', infNumero);
      formData.append('colonia', infColonia);
      
      formData.append('placas', placas);
      formData.append('entidad_federativa', infEntidad);
      formData.append('marca', infMarca);
      formData.append('submarca', infSubmarca);
      formData.append('modelo', infModelo);
      formData.append('color', infColor);
      formData.append('niv_vin', infNivVin);
      formData.append('tipo_vehiculo', infTipoVehiculo);
      
      formData.append('conductor_nombre', infConductorNombre);
      formData.append('conductor_domicilio', infConductorDomicilio);
      formData.append('licencia_numero', infLicenciaNumero);
      formData.append('licencia_tipo', infLicenciaTipo);
      formData.append('licencia_estado', infLicenciaEstado);
      formData.append('calidad_conductor', infCalidadConductor);
      
      formData.append('motivacion_hecho', infMotivacionHecho);
      formData.append('descripcion_hechos', infDescripcionHechos);
      
      formData.append('sancion_uma', infSancionUma || '0');
      formData.append('garantia_tipo', infGarantiaRetenida ? (infGarantiaObservaciones || 'Detención') : 'Ninguna');
      formData.append('garantia_observaciones', infGarantiaObservaciones);
      
      formData.append('inspector_gafete', infInspectorGafete);
      formData.append('firma_inspector', infFirmaInspector);
      
      formData.append('conductor_nego_firmar', infNegoFirmar ? 'true' : 'false');
      formData.append('recibio_nombre', infRecibioNombre);
      formData.append('firma_conductor', infFirmaConductor);

      if (imagenes[0]) formData.append('imagen_1', imagenes[0]);
      if (imagenes[1]) formData.append('imagen_2', imagenes[1]);
      if (imagenes[2]) formData.append('imagen_3', imagenes[2]);

      const res = await fetch(\`\${API_BASE}/api/infracciones\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`
          // No set Content-Type, let the browser set boundary for multipart/form-data
        },
        body: formData
      });`;
code = code.replace(regexInfraccionFetch, fetchNew);

// Modificar los inputs de ubicacion exacta en el formulario de Infracción
const oldUbicacion = /<div className="form-group full-width">[\s\S]*?value=\{infUbicacionExacta\}[\s\S]*?onChange=\{\(e\) => setInfUbicacionExacta\(e\.target\.value\)\}[\s\S]*?<\/div>/;
const newUbicacion = `<div className="form-grid-3">
                    <div className="form-group">
                      <label>Calle</label>
                      <input type="text" value={infCalle} onChange={(e) => setInfCalle(e.target.value.toUpperCase())} placeholder="EJ. BOULEVARD COLOSIO" />
                    </div>
                    <div className="form-group">
                      <label>Número Ext/Int</label>
                      <input type="text" value={infNumero} onChange={(e) => setInfNumero(e.target.value.toUpperCase())} placeholder="S/N" />
                    </div>
                    <div className="form-group">
                      <label>Colonia</label>
                      <input type="text" value={infColonia} onChange={(e) => setInfColonia(e.target.value.toUpperCase())} placeholder="CENTRO" />
                    </div>
                  </div>`;
code = code.replace(oldUbicacion, newUbicacion);

// Modificar if (tipoFormulario === 'infraccion') to unconditionally render the infraccion form
code = code.replace(/\{tipoFormulario === 'infraccion' && \(\s*<form className="infraccion-card-form"/, `<form className="infraccion-card-form"`);

// Add the image uploader right before the signatures/submit section
const imageSection = `
                  {/* SECCION IMAGENES */}
                  <div className="form-section-title" style={{ marginTop: '2rem' }}>
                    <h3>8. Anexo Fotográfico de Evidencia (Máx 3)</h3>
                  </div>
                  <div className="form-group full-width" style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <label style={{ fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Subir Fotografías</label>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        if(files.length > 3) {
                          alert('Máximo 3 imágenes permitidas.');
                          setImagenes(files.slice(0, 3));
                        } else {
                          setImagenes(files);
                        }
                      }}
                      style={{ marginBottom: '1rem' }}
                    />
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {imagenes.map((file, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '120px', height: '120px' }}>
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={\`Preview \${idx}\`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
`;
code = code.replace(/\{!\!infNegoFirmar && \(/, imageSection + "\n                  {!infNegoFirmar && (");

// Remove the ending `)}` that corresponded to `{tipoFormulario === 'infraccion' && (`
const regexEndToggle = /<\/form>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<style>/;
code = code.replace(regexEndToggle, `</form>\n          </div>\n        </div>\n      </div>\n    </div>\n    <style>`);


fs.writeFileSync('C:/Users/Jose M/Documents/stm-proyecto/frontend/update_dash_3.cjs', code);
console.log('Done rewriting dash 3');
