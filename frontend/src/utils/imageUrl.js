import API_BASE from '../config/api';

/**
 * Normaliza y devuelve la URL absoluta pública para las fotos de perfil de usuarios.
 * Maneja rutas relativas, URLs completas con puerto e imágenes blob/data.
 */
export function getProfileImageUrl(url) {
  if (!url) return null;
  if (typeof url !== 'string') return null;

  // Previsualizaciones locales (input file en navegador) o base64
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  let pathname = url;

  // Si es una URL completa (http://... o https://...)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      pathname = parsed.pathname; // Extrae solo la ruta (ej: /storage/usuarios/fotos/xyz.jpg)
    } catch (_e) {
      pathname = url;
    }
  }

  // Asegurar diagonal inicial
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  // Si la ruta no incluye '/storage/', agregar '/storage/'
  if (!pathname.startsWith('/storage/')) {
    pathname = '/storage' + pathname;
  }

  return `${API_BASE}${pathname}`;
}
