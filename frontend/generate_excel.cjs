const XLSX = require('xlsx');

const data = [
  {
    "TIPO DE UNIDAD": "URBANUSS",
    "ECONOMICO": "001",
    "RUTA": "TRONCAL 1",
    "CORRIDA": "1",
    "TARJETON": "0001",
    "NOMBRE CONDUCTOR": "JUAN PEREZ",
    "HORA DE SALIDA DE PATIO": "05:00",
    "HORA DE ACOPLE": "05:15",
    "PATIO NORTE": "PN"
  },
  {
    "TIPO DE UNIDAD": "TORINO",
    "ECONOMICO": "105",
    "RUTA": "ALIMENTADORA 14",
    "CORRIDA": "2",
    "TARJETON": "0002",
    "NOMBRE CONDUCTOR": "MARIA LOPEZ",
    "HORA DE SALIDA DE PATIO": "05:30",
    "HORA DE ACOPLE": "05:45",
    "PATIO NORTE": ""
  }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
XLSX.writeFile(workbook, require('os').homedir() + '/Desktop/Ejemplo_Carga_Logistica.xlsx');
console.log("Archivo creado en el escritorio.");
