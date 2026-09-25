/**
 * Helper utilities for rendering action names and badges in historical views.
 */

export const formatAccion = (accion) => {
  if (!accion) return 'Acción General';
  switch (accion.toUpperCase()) {
    case 'CAMBIO_ESTATUS': return 'Cambio de Estatus';
    case 'CAMBIO_HORAS': return 'Modificación de Horarios / Acople';
    case 'CAMBIO_RUTA': return 'Cambio de Ruta';
    case 'CAMBIO_CONDUCTOR': return 'Cambio de Conductor';
    case 'ASIGNAR_OPERADOR':
    case 'ASIGNACION_CONDUCTOR': return 'Asignación de Conductor';
    case 'DESASIGNAR_OPERADOR':
    case 'RETIRO_CONDUCTOR': return 'Desasignación de Conductor';
    case 'VALIDAR_DESPACHO': return 'Validación de Despacho';
    case 'CAMBIO_UNIDAD_REEMPLAZO': return 'Reemplazo de Unidad';
    case 'INCORPORACION': return 'Incorporación';
    case 'DESINCORPORACION': return 'Desincorporación';
    case 'MANTENIMIENTO': return 'Registro Mantenimiento';
    case 'GENERAR_FOLIO': return 'Generación Folio Mantenimiento';
    case 'ASIGNACION_INCIDENCIA': return 'Asignación de Incidencia';
    case 'REGISTRO_INFRACCION': return 'Registro Infracción';
    case 'RELEVO_TARJETON': return 'Relevo de Conductor';
    case 'ACTUALIZACION_DATOS': return 'Actualización de Datos';
    default:
      return accion.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
};

export const getAccionBadgeStyle = (accion) => {
  if (!accion) return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  const act = accion.toUpperCase();
  if (act.includes('VALIDAR') || act.includes('INCORPORACION')) {
    return { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' };
  }
  if (act.includes('DESINCORPORACION') || act.includes('ESTATUS')) {
    return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' };
  }
  if (act.includes('HORAS') || act.includes('RUTA') || act.includes('CONDUCTOR') || act.includes('ASIGNAR') || act.includes('DATOS')) {
    return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
  }
  if (act.includes('MANTENIMIENTO') || act.includes('FOLIO') || act.includes('INCIDENCIA')) {
    return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' };
  }
  if (act.includes('INFRACCION') || act.includes('REEMPLAZO') || act.includes('RETIRO')) {
    return { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' };
  }
  return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
};
