import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './PantallaCargaAcotma.css';

/**
 * Pantalla de carga institucional ACOTMA (versión blanca traslúcida).
 * El autobús/logo de ACOTMA cruza de izquierda a derecha de forma continua.
 *
 * Props:
 *  - visible: boolean -> muestra u oculta la pantalla.
 *  - mensaje: string -> texto principal (por defecto "Cargando...").
 *  - mostrarFinalizar: boolean -> muestra el botón "Finalizar" (solo administradores).
 *  - onFinalizar: function -> acción al presionar "Finalizar".
 */
export default function PantallaCargaAcotma({
  visible = false,
  mensaje = 'Cargando...',
  mostrarFinalizar = false,
  onFinalizar,
}) {
  // Bloquear el scroll del fondo y atajos de escape mientras la pantalla está activa
  useEffect(() => {
    if (!visible) return undefined;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const bloquearTeclado = (e) => {
      if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', bloquearTeclado, true);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener('keydown', bloquearTeclado, true);
    };
  }, [visible]);

  if (!visible) return null;

  return createPortal(
    <div className="pantalla-carga-acotma" role="status" aria-live="polite" aria-busy="true">
      <div className="pantalla-carga-acotma__pista">
        <img
          src="/images/acotma_logo_solo.png"
          alt="ACOTMA"
          className="pantalla-carga-acotma__bus"
          draggable="false"
        />
      </div>

      <div className="pantalla-carga-acotma__textos">
        <div className="pantalla-carga-acotma__mensaje">{mensaje}</div>
        <div className="pantalla-carga-acotma__subtitulo">
          APLICACIÓN DE CONTROL DE TRANSPORTE MASIVO
        </div>
        <div className="pantalla-carga-acotma__leyenda">
          Sistema de Transporte Metropolitano
        </div>
      </div>

      {mostrarFinalizar && (
        <button
          type="button"
          className="pantalla-carga-acotma__finalizar"
          onClick={onFinalizar}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Finalizar
        </button>
      )}
    </div>,
    document.body
  );
}

