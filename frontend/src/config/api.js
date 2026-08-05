// Detecta automáticamente si estamos en entorno de desarrollo o producción.
const hostname = window.location.hostname;

let API_BASE;

if (import.meta.env.PROD) {
  // En producción (HTTPS), las peticiones pasan limpias por el puerto 443 vía Nginx
  API_BASE = `https://${hostname}`;
} else {
  // En desarrollo local, conservamos el puerto 8000
  API_BASE = hostname === 'localhost' || hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : `http://${hostname}:8000`;
}

export default API_BASE;

