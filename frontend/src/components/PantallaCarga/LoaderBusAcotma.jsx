import './LoaderBusAcotma.css';

/**
 * Componente institucional ACOTMA para estados de carga en tablas, secciones y módulos.
 * Muestra el autobús de ACOTMA transitando suavemente en bucle de izquierda a derecha.
 * Por defecto solo muestra el autobús sin textos, limpio y minimalista.
 */
export default function LoaderBusAcotma({
  mensaje = null,
  subtitulo = null,
  compacto = false,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`loader-bus-acotma ${compacto ? 'loader-bus-acotma--compacto' : ''} ${className}`}
      style={style}
      role="status"
      aria-live="polite"
    >
      <div className="loader-bus-acotma__pista">
        <img
          src="/images/acotma_logo_solo.png"
          alt="ACOTMA"
          className="loader-bus-acotma__bus"
          draggable="false"
        />
      </div>
      {mensaje && <div className="loader-bus-acotma__mensaje">{mensaje}</div>}
      {subtitulo && <div className="loader-bus-acotma__subtitulo">{subtitulo}</div>}
    </div>
  );
}

