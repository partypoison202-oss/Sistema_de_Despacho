import React, { useState } from 'react';
import './TablaInformativa.css';

export default function TablaInformativa({
  titulo,
  columnaServicio = 'Servicio',
  programadas = 0,
  operando = 0,
  faltantes = 0,
  eficiencia = 0,
  filas = [],
  ordenColumnas = 'motivo-corrida',
}) {
  const hayFaltantes = faltantes > 0;
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);

  const abrirDetalle = (fila) => {
    if (fila?.esTotal) return;
    setFilaSeleccionada(fila);
  };

  const cerrarDetalle = () => setFilaSeleccionada(null);

  return (
    <div className="tabla-informativa">
      <div className="tabla-informativa__titulo">{titulo}</div>

      <div className="tabla-informativa__resumen">
        <span className="tabla-informativa__resumen-label">Programadas</span>
        <span className="tabla-informativa__resumen-valor tabla-informativa__resumen-valor--beige">
          {programadas}
        </span>

        <span className="tabla-informativa__resumen-label">Operando</span>
        <span
          className={`tabla-informativa__resumen-valor ${
            hayFaltantes
              ? 'tabla-informativa__resumen-valor--rojo'
              : 'tabla-informativa__resumen-valor--blanco'
          }`}
        >
          {operando}
        </span>

        <span className="tabla-informativa__resumen-label">Faltantes</span>
        <span
          className={`tabla-informativa__resumen-valor ${
            hayFaltantes
              ? 'tabla-informativa__resumen-valor--rojo'
              : 'tabla-informativa__resumen-valor--beige'
          }`}
        >
          {faltantes}
        </span>

        <span className="tabla-informativa__resumen-label">Eficiencia</span>
        <span className="tabla-informativa__resumen-valor tabla-informativa__resumen-valor--beige" style={{ color: '#fbbf24' }}>
          {eficiencia}%
        </span>
      </div>

      <div className="tabla-informativa__scroll">
        <table className="tabla-informativa__tabla">
          <thead>
            <tr>
              <th className="col-servicio">{columnaServicio}</th>
              <th className="col-operando">Unidades operando</th>
              <th className="col-fuera">Unidades fuera de servicio</th>
              {ordenColumnas === 'motivo-corrida' ? (
                <>
                  <th className="col-motivo">Motivo</th>
                  <th className="col-corrida">Corrida</th>
                </>
              ) : (
                <>
                  <th className="col-corrida">Corrida</th>
                  <th className="col-motivo">Motivo</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, index) => {
              const tieneFalta = Number(fila.fuera) > 0;
              const celdas = (
                <>
                  <td>
                    <span
                      className={`tabla-informativa__fuera ${
                        tieneFalta ? 'tabla-informativa__fuera--alerta' : ''
                      }`}
                    >
                      {fila.fuera ?? 0}
                    </span>
                  </td>
                  {ordenColumnas === 'motivo-corrida' ? (
                    <>
                      <td className="tabla-informativa__motivo">{fila.motivo || ''}</td>
                      <td>{fila.corrida ?? ''}</td>
                    </>
                  ) : (
                    <>
                      <td>{fila.corrida ?? ''}</td>
                      <td className="tabla-informativa__motivo">{fila.motivo || ''}</td>
                    </>
                  )}
                </>
              );

              return (
                <tr
                  key={`${fila.servicio}-${index}`}
                  className={fila.esTotal ? 'tabla-informativa__fila--total' : 'tabla-informativa__fila--clickable'}
                  onClick={() => abrirDetalle(fila)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      abrirDetalle(fila);
                    }
                  }}
                  role={fila.esTotal ? undefined : 'button'}
                  tabIndex={fila.esTotal ? undefined : 0}
                >
                  <td className="tabla-informativa__servicio">{fila.servicio}</td>
                  <td>{fila.operando}</td>
                  {celdas}
                </tr>
              );
            })}

            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="tabla-informativa__sin-datos">
                  No hay información disponible.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filaSeleccionada && (
        <div className="tabla-informativa__modal-backdrop" onClick={cerrarDetalle}>
          <div className="tabla-informativa__modal" onClick={(event) => event.stopPropagation()}>
            <button className="tabla-informativa__modal-cerrar" type="button" onClick={cerrarDetalle}>
              ×
            </button>
            <h3 className="tabla-informativa__modal-titulo">Servicio {filaSeleccionada.servicio}</h3>
            <p className="tabla-informativa__modal-subtitulo">
              Unidades económicas asignadas a este servicio.
            </p>

            {filaSeleccionada.economicos?.length > 0 ? (
              <>
                <div className="tabla-informativa__modal-encabezado">
                  <span className="tabla-informativa__modal-badge">
                    {filaSeleccionada.economicos.length} unidad(es)
                  </span>
                </div>
                <div className="tabla-informativa__modal-scroll">
                  <ul className="tabla-informativa__modal-lista">
                    {filaSeleccionada.economicos.map((economico) => (
                      <li key={economico} className="tabla-informativa__modal-item">
                        <span className="tabla-informativa__modal-item-icon">●</span>
                        <span>{economico}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="tabla-informativa__modal-vacio">
                No hay números económicos registrados para este servicio.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
