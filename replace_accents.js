const fs = require('fs');
const path = require('path');

const replacements = [
  // Acentos visuales (usando word boundaries y asumiendo mayúsculas y minúsculas comunes en la UI)
  { regex: /\bVehiculo\b/g, replacement: 'Vehículo' },
  { regex: /\bvehiculo\b/g, replacement: 'vehículo' },
  { regex: /\bVehiculos\b/g, replacement: 'Vehículos' },
  { regex: /\bvehiculos\b/g, replacement: 'vehículos' },
  { regex: /\bConfiguracion\b/g, replacement: 'Configuración' },
  { regex: /\bInformacion\b/g, replacement: 'Información' },
  { regex: /\bAccion\b/g, replacement: 'Acción' },
  { regex: /\bEstadisticas\b/g, replacement: 'Estadísticas' },
  { regex: /\bEstadistica\b/g, replacement: 'Estadística' },
  { regex: /\bBitacora\b/g, replacement: 'Bitácora' },
  { regex: /\bbitacora\b/g, replacement: 'bitácora' },
  
  // Para Número, hay que evitar romper numero_eco o variables tipo numero.
  // Vamos a reemplazar 'Numero ' por 'Número ', 'Numero:' por 'Número:', etc.
  { regex: /\bNumero\b(?=\s|:|\.|,)/g, replacement: 'Número' }
];

function isSafeToReplaceUrbanus(line) {
  // Ignorar líneas donde se usa URBANUS como variable, key, id, o case evaluation
  if (line.includes('case \'URBANUS\'')) return false;
  if (line.includes('case "URBANUS"')) return false;
  if (line.includes('id: \'URBANUS\'')) return false;
  if (line.includes('id: "URBANUS"')) return false;
  if (line.includes('urbanus-lateral')) return false; // imagen
  if (line.includes('urbanu-frente')) return false;
  if (line.includes('urbanu-lateral')) return false;
  if (line.includes('urbanu.webp')) return false;
  
  return true;
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('frontend/src');
let totalChanged = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  // Reemplazo línea por línea
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Acentos
    replacements.forEach(r => {
      line = line.replace(r.regex, r.replacement);
    });
    
    // URBANUS
    if (line.includes('URBANUS') && !line.includes('URBANUSS')) {
      if (isSafeToReplaceUrbanus(line)) {
        line = line.replace(/\bURBANUS\b/g, 'URBANUSS');
      }
    }
    
    lines[i] = line;
  }
  
  content = lines.join('\n');
  
  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated:', f);
    totalChanged++;
  }
});

console.log('Total files changed:', totalChanged);
