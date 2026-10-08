import React from 'react';
import './TablaBitacora.css';

const TablaRutasAlimentadoras = ({ data = [] }) => {
  if (!data.length) {
    return <p className="tabla-bitacora__sin-datos">No hay registros de rutas alimentadoras.</p>;
  }

  // Group data by ruta
  const groupedData = data.reduce((acc, curr) => {
    const ruta = curr.ruta || 'Sin Ruta';
    if (!acc[ruta]) {
      acc[ruta] = [];
    }
    acc[ruta].push(curr);
    return acc;
  }, {});

  return (
    <div className="tabla-bitacora">
      <h3>Rutas Alimentadoras</h3>
      <table className="tabla-bitacora__tabla">
        <thead>
          <tr>
            <th>Corrida</th>
            <th>Eco</th>
            <th>Cambio 1</th>
            <th>Cambio 2</th>
            <th>Cambio 3</th>
            <th>Cambio 4</th>
            <th>Id. Mat.</th>
            <th>Id. Vesp</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(groupedData).map((rutaName, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {/* Fila separadora por ruta */}
              <tr className="tabla-bitacora__ruta-header">
                <td colSpan="8" style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#d9d9d9' }}>
                  {rutaName}
                </td>
              </tr>
              {/* Filas de la ruta */}
              {groupedData[rutaName].map((item, itemIndex) => (
                <tr key={`${groupIndex}-${itemIndex}`}>
                  <td data-th="Ruta/Corrida">{item.corrida || '-'}</td>
                  <td data-th="Unidad">{item.unidad || '-'}</td>
                  <td data-th="Cambio 1">{item.cambio_1 || '-'}</td>
                  <td data-th="Cambio 2">{item.cambio_2 || '-'}</td>
                  <td data-th="Cambio 3">{item.cambio_3 || '-'}</td>
                  <td data-th="Cambio 4">{item.cambio_4 || '-'}</td>
                  <td data-th="Id. Mat.">{item.id_matutino || '-'}</td>
                  <td data-th="Id. Vesp">{item.id_vespertino || '-'}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaRutasAlimentadoras;