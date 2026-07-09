// src/pages/Dashboard/components/TablaFaltantes.jsx
import React from 'react';
import './TablaFaltantes.css';

export default function TablaFaltantes({ titulo, filas = [] }) {
  const total = filas.length;
  const hayFaltantes = total > 0;

  return (
    <div className="tabla-faltantes">
      <div className="tabla-faltantes__titulo">
        <span className="tabla-faltantes__titulo-icono" aria-hidden="true"></span>
        <span>{titulo}</span>
      </div>

      <div className="tabla-faltantes__resumen">
        <span className="tabla-faltantes__resumen-label">Unidades en mantenimiento</span>
        <span
          className={`tabla-faltantes__resumen-valor ${
            hayFaltantes
              ? 'tabla-faltantes__resumen-valor--rojo'
              : 'tabla-faltantes__resumen-valor--beige'
          }`}
        >
          {total}
        </span>
      </div>

      {total === 0 ? (
        <div className="tabla-faltantes__vacio">
          <span className="tabla-faltantes__vacio-icono" aria-hidden="true"></span>
          <p>No hay unidades en mantenimiento en este momento.</p>
        </div>
      ) : (
        <div className="tabla-faltantes__scroll">
          <table className="tabla-faltantes__tabla">
            <thead>
              <tr>
                <th className="col-eco">Económico</th>
                <th className="col-ruta">Ruta</th>
                <th className="col-corrida">Corrida</th>
                <th className="col-ciclo">Ciclo</th>
                <th className="col-motivo">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, indice) => (
                <tr key={`${fila.eco}-${indice}`} data-label={titulo}>
                  <td data-th="Económico">
                    <span className="tabla-faltantes__chip tabla-faltantes__chip--eco">
                      {fila.eco || '—'}
                    </span>
                  </td>
                  <td data-th="Ruta">
                    <span className="tabla-faltantes__chip tabla-faltantes__chip--ruta">
                      {fila.ruta || '—'}
                    </span>
                  </td>
                  <td data-th="Corrida">{fila.corrida || '—'}</td>
                  <td data-th="Ciclo">{fila.ciclo || '—'}</td>
                  <td data-th="Motivo" className="tabla-faltantes__motivo">
                    <span className="tabla-faltantes__estado-punto" aria-hidden="true" />
                    {fila.motivo || 'Sin motivo registrado'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}