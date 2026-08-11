const fs = require('fs');

const frontendPath = 'C:/Users/Jose M/Documents/stm-proyecto/frontend/src/pages/Infraccion/InfraccionDashboard.jsx';

// Too big to rewrite perfectly in one go without breaking styles? No, I will use replace.
let code = fs.readFileSync(frontendPath, 'utf8');

// 1. Remove amonestacion generator import
code = code.replace("import { generarPDFAmonestacion } from '../../utils/generarPDFAmonestacion';\r\n", "");
code = code.replace("import { generarPDFAmonestacion } from '../../utils/generarPDFAmonestacion';\n", "");

// 2. Remove amonestacion states and add image states
const amonStatesRegex = /  \/\/ 1\. Verificación de Placa previa[\s\S]*?\/\/ -------------------------------------------------------------[\s\S]*?const \[submitting, setSubmitting\] = useState\(false\);/;

const newStates = `  // 1. Verificación de Placa previa
  const [placas, setPlacas] = useState('');
  const [checkingPlaca, setCheckingPlaca] = useState(false);
  const [placaStatus, setPlacaStatus] = useState(null);

  // -------------------------------------------------------------
  // ESTADOS DEL FORMULARIO: BOLETA DE INFRACCIÓN
  // -------------------------------------------------------------
  const [infFechaExpedicion, setInfFechaExpedicion] = useState(() => new Date().toISOString().split('T')[0]);
  const [infHoraIntervencion, setInfHoraIntervencion] = useState(() => {
    const d = new Date();
    return \`\${String(d.getHours()).padStart(2, '0')}:\${String(d.getMinutes()).padStart(2, '0')}\`;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Ubicación
  const [infMunicipio, setInfMunicipio] = useState('Pachuca de Soto');
  const [infCalle, setInfCalle] = useState('');
  const [infNumero, setInfNumero] = useState('');
  const [infColonia, setInfColonia] = useState('');

  // Vehículo Infracción
  const [infEntidad, setInfEntidad] = useState('Hidalgo');
  const [infMarca, setInfMarca] = useState('');
  const [infSubmarca, setInfSubmarca] = useState('');
  const [infModelo, setInfModelo] = useState('');
  const [infColor, setInfColor] = useState('');
  const [infNivVin, setInfNivVin] = useState('');
  const [infTipoVehiculo, setInfTipoVehiculo] = useState('Particular');

  // Conductor Infracción
  const [infConductorNombre, setInfConductorNombre] = useState('');
  const [infConductorDomicilio, setInfConductorDomicilio] = useState('');
  const [infLicenciaNumero, setInfLicenciaNumero] = useState('');
  const [infLicenciaTipo, setInfLicenciaTipo] = useState('');
  const [infLicenciaEstado, setInfLicenciaEstado] = useState('Hidalgo');
  const [infCalidadConductor, setInfCalidadConductor] = useState('Conductora');

  // Motivación y Sanción
  const [infMotivacionHecho, setInfMotivacionHecho] = useState('transitaba');
  const [infDescripcionHechos, setInfDescripcionHechos] = useState('');
  const [infSancionUma, setInfSancionUma] = useState('');
  const [infGarantiaRetenida, setInfGarantiaRetenida] = useState(false);
  const [infGarantiaObservaciones, setInfGarantiaObservaciones] = useState('');

  // Inspector y Notificación Infracción
  const [infInspectorGafete, setInfInspectorGafete] = useState('');
  const [infFirmaInspector, setInfFirmaInspector] = useState('');
  const [infNegoFirmar, setInfNegoFirmar] = useState(false);
  const [infRecibioNombre, setInfRecibioNombre] = useState('');
  const [infFirmaConductor, setInfFirmaConductor] = useState('');

  // Imágenes
  const [imagenes, setImagenes] = useState([]);
  
  const [submitting, setSubmitting] = useState(false);`;

code = code.replace(amonStatesRegex, newStates);

fs.writeFileSync('C:/Users/Jose M/Documents/stm-proyecto/frontend/update_dash_1.cjs', code);
console.log('States done');
