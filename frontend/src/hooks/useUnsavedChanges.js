import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import Swal from 'sweetalert2';

/**
 * Hook para interceptar la navegación y mostrar un modal de advertencia cuando hay cambios sin guardar.
 * @param {boolean} isDirty - Indica si el formulario/vista tiene cambios sin guardar.
 * @param {Function} onSave - Función asíncrona (debe retornar true si el guardado fue exitoso) a ejecutar si el usuario elige "Guardar y salir".
 */
export function useUnsavedChanges(isDirty, onSave) {
  // 1. Interceptar recarga o cierre de pestaña (navegador nativo)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Seguro que deseas salir?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 2. Interceptar navegación interna (React Router)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      Swal.fire({
        title: 'Cambios sin guardar',
        text: onSave ? 'Tienes cambios pendientes. ¿Qué deseas hacer antes de salir?' : 'Tienes cambios pendientes que se perderán al salir. ¿Seguro que deseas descartarlos?',
        icon: 'warning',
        showCancelButton: true,
        showDenyButton: true,
        showConfirmButton: !!onSave,
        confirmButtonColor: '#1e7145',
        denyButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Guardar y salir',
        denyButtonText: 'Descartar y salir',
        cancelButtonText: 'Permanecer aquí',
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(async (result) => {
        if (result.isConfirmed && onSave) {
          // Ocultar cualquier modal previo o el mismo (Swal a veces se queda en estado loading si onSave tarda)
          Swal.showLoading();
          let success = true;
          try {
            success = await onSave();
          } catch (error) {
            console.error(error);
            success = false;
          }
          
          if (success) {
            Swal.close();
            blocker.proceed();
          } else {
            Swal.fire('Error', 'No se pudieron guardar los cambios. Revisa tu conexión o los datos.', 'error');
            blocker.reset();
          }
        } else if (result.isDenied) {
          blocker.proceed();
        } else {
          blocker.reset();
        }
      });
    }
  }, [blocker, onSave]);
}
