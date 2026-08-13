import Swal from 'sweetalert2';

/**
 * Hook de utilidad para lanzar modales de doble confirmación con SweetAlert2.
 * Útil para prevenir acciones destructivas accidentales (Desincorporar, Eliminar, Finalizar Turno).
 */
export const useConfirmAction = () => {
  const confirmAction = async ({
    title = '¿Estás seguro?',
    text = 'Esta acción no se puede deshacer.',
    confirmButtonText = 'Sí, continuar',
    cancelButtonText = 'Cancelar',
    icon = 'warning',
    confirmButtonColor = '#dc2626' // Color rojo por defecto para acciones destructivas
  } = {}) => {
    const result = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonColor,
      cancelButtonColor: '#6b7280',
      confirmButtonText,
      cancelButtonText
    });
    
    return result.isConfirmed;
  };

  return { confirmAction };
};
