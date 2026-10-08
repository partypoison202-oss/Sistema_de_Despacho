import React from 'react';
import './TablaBitacora.css'; // (opcional, puedes reutilizar estilos)

const TablaBitacoraGeneral = ({ data = [] }) => {
  if (!data.length) {
    return <p className="tabla-bitacora__sin-datos">No hay registros de bitácora general.</p>;
  }

  return (
    <div className="tabla-bitacora">
      <h3>Bitácora General</h3>
      <table className="tabla-bitacora__tabla">
        <thead>
          <tr>
            <th>Corr.</th>
            <th>Ruta / Unidad</th>
            <th>Cambio 1</th>
            <th>Cambio 2</th>
            <th>Cambio 3</th>
            <th>Cambio 4</th>
            <th>ID MAT</th>
            <th>ID VESP</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td data-th="Corr.">{item.corrida || '-'}</td>
              <td data-th="Ruta / Unidad">{item.ruta && item.unidad ? `${item.ruta} - ${item.unidad}` : (item.unidad || '-')}</td>
              <td data-th="Cambio 1">{item.cambio_1 || '-'}</td>
              <td data-th="Cambio 2">{item.cambio_2 || '-'}</td>
              <td data-th="Cambio 3">{item.cambio_3 || '-'}</td>
              <td data-th="Cambio 4">{item.cambio_4 || '-'}</td>
              <td data-th="ID MAT">{item.id_matutino || '-'}</td>
              <td data-th="ID VESP">{item.id_vespertino || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaBitacoraGeneral;