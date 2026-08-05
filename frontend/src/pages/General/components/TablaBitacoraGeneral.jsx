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
              <td>{item.corrida || '-'}</td>
              <td>{item.ruta && item.unidad ? `${item.ruta} - ${item.unidad}` : (item.unidad || '-')}</td>
              <td>{item.cambio_1 || '-'}</td>
              <td>{item.cambio_2 || '-'}</td>
              <td>{item.cambio_3 || '-'}</td>
              <td>{item.cambio_4 || '-'}</td>
              <td>{item.id_matutino || '-'}</td>
              <td>{item.id_vespertino || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaBitacoraGeneral;