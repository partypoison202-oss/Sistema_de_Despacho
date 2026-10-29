/**
 * Interceptor global de fetch para capturar respuestas 401 (Unauthorized)
 * Cuando la sesión es revocada por un administrador o el token expira,
 * este interceptor limpia el almacenamiento local y notifica a la aplicación
 * para cerrar la sesión por completo y redirigir al login.
 */

let isHandlingExpired = false;

export function setupFetchInterceptor() {
  if (typeof window === 'undefined' || window.__fetchInterceptorInitialized) {
    return;
  }
  window.__fetchInterceptorInitialized = true;

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    if (response && response.status === 401) {
      let url = '';
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] && args[0].url) {
        url = args[0].url;
      }

      // No interceptar peticiones de login fallidas (usuario/contraseña incorrecta)
      const isLoginRequest = url.includes('/api/login');

      if (!isLoginRequest) {
        const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (storedToken && !isHandlingExpired) {
          isHandlingExpired = true;

          // Limpieza inmediata del token en el cliente
          try {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
          } catch (e) {
            console.error('Error al limpiar credenciales locales:', e);
          }

          // Notificar al contexto de autenticación para expulsar de inmediato
          window.dispatchEvent(new CustomEvent('auth:session_expired', {
            detail: { url, status: 401 }
          }));

          // Restablecer el seguro de disparo tras un periodo razonable
          setTimeout(() => {
            isHandlingExpired = false;
          }, 3000);
        }
      }
    }

    return response;
  };
}
