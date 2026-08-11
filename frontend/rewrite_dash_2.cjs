const fs = require('fs');

const frontendPath = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/pages/Infraccion/InfraccionDashboard.jsx';

let code = fs.readFileSync(frontendPath, 'utf8');

const regexAPI = /  const verificarPlaca = async \(placaVal\) => {[\s\S]*?  const handlePlacasChange = \(e\) => {/;

const newAPI = `  const verificarPlaca = async (placaVal) => {
    if (!placaVal.trim()) return;
    setCheckingPlaca(true);
    try {
      const res = await fetch(\`\${API_BASE}/api/infracciones/check/\${encodeURIComponent(placaVal)}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlacaStatus(data);

        if (data.latest) {
          const prev = data.latest;
          setInfEntidad(prev.entidad_federativa || 'Hidalgo');
          setInfMarca(prev.marca || '');
          setInfModelo(prev.modelo || '');
          setInfColor(prev.color || '');
          setInfConductorNombre(prev.conductor_nombre || '');
          setInfRecibioNombre(prev.conductor_nombre || '');
          if (prev.inspector_gafete) setInfInspectorGafete(prev.inspector_gafete);
        }
      }
    } catch (_err) {
      console.error('Error al verificar placa:', _err);
    } finally {
      setCheckingPlaca(false);
    }
  };

  const handlePlacasChange = (e) => {`;

code = code.replace(regexAPI, newAPI);

fs.writeFileSync('C:/Users/Jose M/Documents/stm-proyecto/frontend/update_dash_2.cjs', code);
console.log('API call replaced');
