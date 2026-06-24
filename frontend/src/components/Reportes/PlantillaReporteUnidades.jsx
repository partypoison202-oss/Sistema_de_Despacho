import React from 'react';

const PlantillaReporteUnidades = ({ data }) => {
  const { tipos, totales } = data;
  const fecha = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  return (
    <div
      id="reporte-unidades"
      style={{
        width: '1123px',
        height: '795px',
        padding: '40px',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          height: '100%'
        }}
      >
        <h1 style={{ textAlign: 'center', color: '#1a2b4a', fontSize: '28px', marginBottom: '10px' }}>
          Sistema de Transporte Metropolitano
        </h1>
        <h2 style={{ textAlign: 'center', color: '#c5a059', fontSize: '22px', marginBottom: '5px' }}>
          INICIO DE OPERACIÓN TRANSPORTE METROPOLITANO
        </h2>
        <p style={{ textAlign: 'center', fontSize: '18px', marginBottom: '30px' }}>{fecha}</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr>
              <th
                style={{
                  border: '1px solid #ccc',
                  padding: '12px',
                  backgroundColor: '#1a2b4a',
                  color: 'white',
                  textAlign: 'center'
                }}
              >
                UNIDADES PROGRAMADAS
              </th>
              <th
                style={{
                  border: '1px solid #ccc',
                  padding: '12px',
                  backgroundColor: '#1a2b4a',
                  color: 'white',
                  textAlign: 'center'
                }}
              >
                UNIDADES EN SERVICIO
              </th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((tipo) => (
              <tr key={tipo.tipo}>
                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                  {tipo.programadas}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                  {tipo.en_servicio}
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold' }}>
              <td
                style={{
                  border: '1px solid #ccc',
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '16px'
                }}
              >
                TOTAL DE UNIDADES PROGRAMADAS<br />
                {totales.programadas}
              </td>
              <td
                style={{
                  border: '1px solid #ccc',
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '16px'
                }}
              >
                TOTAL DE UNIDADES EN SERVICIO<br />
                {totales.en_servicio}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlantillaReporteUnidades;