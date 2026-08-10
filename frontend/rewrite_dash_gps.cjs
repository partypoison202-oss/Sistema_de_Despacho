const fs = require('fs');
const filePath = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/pages/Infraccion/InfraccionDashboard.jsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add `imagenes` state
if (!code.includes('const [imagenes, setImagenes] = useState([]);')) {
  code = code.replace(
    /const \[infUbicacionExacta, setInfUbicacionExacta\] = useState\(''\);/,
    `const [infUbicacionExacta, setInfUbicacionExacta] = useState('');\n  const [imagenes, setImagenes] = useState([]);`
  );
}

// 2. Add geolocation effect
const geolocationCode = `
  useEffect(() => {
    if (placaStatus && !checkingPlaca) {
      if (navigator.geolocation) {
        setInfUbicacionExacta('Obteniendo ubicación...');
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const res = await fetch(\`https://nominatim.openstreetmap.org/reverse?lat=\${latitude}&lon=\${longitude}&format=json\`);
              const data = await res.json();
              if (data && data.address) {
                const calle = data.address.road || '';
                const num = data.address.house_number || 'S/N';
                const col = data.address.suburb || data.address.neighbourhood || '';
                const mpo = data.address.city || data.address.town || data.address.municipality || 'Pachuca de Soto';
                
                setInfMunicipio(mpo);
                setInfUbicacionExacta(\`\${calle} \${num}, \${col}\`.trim());
              } else {
                setInfUbicacionExacta('Ubicación no encontrada');
              }
            } catch (err) {
              setInfUbicacionExacta('Error al obtener ubicación');
            }
          },
          (err) => {
            setInfUbicacionExacta('Permiso de ubicación denegado');
          }
        );
      } else {
        setInfUbicacionExacta('Geolocalización no soportada');
      }
    }
  }, [placaStatus, checkingPlaca]);
`;
if (!code.includes('navigator.geolocation.getCurrentPosition')) {
  code = code.replace(
    /const verificarPlaca = async \(placaToVerify\) => {/,
    `${geolocationCode}\n\n  const verificarPlaca = async (placaToVerify) => {`
  );
}

// 3. Update Fetch call to use FormData
const regexFetch = /const payload = \{[\s\S]*?\};\s*const res = await fetch\(`\$\{API_BASE\}\/api\/infracciones`, \{[\s\S]*?body: JSON\.stringify\(payload\)\s*\}\);/;
const replacementFetch = `const formData = new FormData();
      formData.append('fecha_expedicion', infFechaExpedicion);
      formData.append('hora_intervencion', infHoraIntervencion);
      formData.append('municipio', infMunicipio);
      formData.append('ubicacion_exacta', infUbicacionExacta);
      
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
      
      formData.append('conductor_nego_firmar', infNegoFirmar ? '1' : '0');
      formData.append('recibio_nombre', infRecibioNombre);
      formData.append('firma_conductor', infFirmaConductor);

      if (imagenes[0]) formData.append('imagen_1', imagenes[0]);
      if (imagenes[1]) formData.append('imagen_2', imagenes[1]);
      if (imagenes[2]) formData.append('imagen_3', imagenes[2]);

      const res = await fetch(\`\${API_BASE}/api/infracciones\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`
        },
        body: formData
      });`;
code = code.replace(regexFetch, replacementFetch);

// 4. Update Inputs to readOnly
code = code.replace(
  /<input\s*type="text"\s*required\s*placeholder="Ej\. Pachuca de Soto"\s*value=\{infMunicipio\}\s*onChange=\{\(e\) => setInfMunicipio\(e\.target\.value\)\}\s*className="infraccion-input"\s*\/>/,
  `<input type="text" readOnly value={infMunicipio} className="infraccion-input disabled-input" style={{ backgroundColor: '#f1f5f9' }} />`
);
code = code.replace(
  /<input\s*type="text"\s*required\s*placeholder="Ej\. Av\. Revolución esq\. Allende, Carril Confinado Troncal"\s*value=\{infUbicacionExacta\}\s*onChange=\{\(e\) => setInfUbicacionExacta\(e\.target\.value\)\}\s*className="infraccion-input"\s*\/>/,
  `<input type="text" readOnly value={infUbicacionExacta} className="infraccion-input disabled-input" style={{ backgroundColor: '#f1f5f9' }} />`
);

// 5. Insert Image Section
const imageSection = `
                {/* 8. ANEXO FOTOGRÁFICO */}
                <div className="section-block section-infraccion">
                  <div className="section-block-title">
                    <span className="section-number red">8</span>
                    <h3>ANEXO FOTOGRÁFICO DE EVIDENCIA (MÁX 3)</h3>
                  </div>
                  <div className="form-group full-width" style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <label style={{ fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Subir Fotografías</label>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*;capture=camera" 
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
                </div>
`;

if (!code.includes('ANEXO FOTOGRÁFICO')) {
  code = code.replace(
    /\{\/\* 7\. OBSERVACIONES Y FIRMA DE LA PERSONA INFRACTORA \*\/\}/,
    imageSection + '\n                {/* 7. OBSERVACIONES Y FIRMA DE LA PERSONA INFRACTORA */}'
  );
}

fs.writeFileSync('C:/Users/Jose M/Documents/stm-proyecto/frontend/update_dash_gps.cjs', code);
console.log('Done script');
