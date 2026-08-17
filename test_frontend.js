const { execSync } = require('child_process');

const dbOutput = execSync(`php artisan tinker --execute="echo json_encode(DB::table('informacion_operativa')->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')->where('informacion_operativa.tipo', 'URBANUSS')->select('unidades.numero_eco', 'informacion_operativa.acople', 'informacion_operativa.hora_salida', 'informacion_operativa.ruta', 'informacion_operativa.estatus')->get());"`, {cwd: '/Users/EnriqueHH/Dev/projects/Sistema_de_Despacho/laravel-api'}).toString();

let datos = [];
try {
  datos = JSON.parse(dbOutput.trim());
} catch(e) {
  console.log("Error parsing json", dbOutput);
}

const unidadesList = datos.map((u) => ({
      eco: String(u.numero_eco ?? '').padStart(3, '0'),
      estado: String(u.estatus ?? 'operacion').trim().toLowerCase(),
      ruta: String(u.ruta ?? '').trim(),
      acople: Boolean(Number(u.acople ?? 0)),
      horaSalida: String(u.hora_salida ?? '').trim(),
}));

const normalizeRuta = (ruta) => String(ruta ?? '').trim().toUpperCase();
const normalizeRutaClave = (ruta) => {
  let texto = normalizeRuta(ruta).replace(/[-_\s]/g, '');
  texto = texto.replace(/TRONCAL/g, 'T');
  texto = texto.replace(/ALIMENTADORA/g, 'RA');
  const troncalMatch = /T0*(\d+)/.exec(texto);
  if (troncalMatch) return `T${troncalMatch[1].padStart(2, '0')}`;
  return texto;
};

const selectedTroncal = 'T01';
const rutaSeleccionada = normalizeRutaClave(selectedTroncal);

const unidadesPorTroncalList = unidadesList.filter((u) => {
      const rutaUnidad = normalizeRutaClave(u.ruta);
      return rutaUnidad && rutaUnidad === rutaSeleccionada && !u.acople;
});

console.log("unidadesList operacion count:", unidadesList.filter(u => u.estado === 'operacion').length);
console.log("unidadesPorTroncalList count:", unidadesPorTroncalList.length);
console.log("unidadesPorTroncalList sample:", unidadesPorTroncalList.slice(0, 2));
