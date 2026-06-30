// Detecta automáticamente si estamos en localhost o en red local
// para apuntar al servidor correcto.
const hostname = window.location.hostname;
const API_BASE = hostname === 'localhost' || hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : `http://${hostname}:8000`;

export default API_BASE;
