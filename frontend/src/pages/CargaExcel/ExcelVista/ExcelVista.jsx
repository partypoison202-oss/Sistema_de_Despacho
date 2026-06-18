import React from 'react';
import './ExcelVista.css';

export default function ExcelPreview({ data }) {
  if (!data || data.length === 0) return null;

  // Obtenemos los encabezados de las llaves del primer objeto
  const headers = Object.keys(data[0]);

  return (
    <div className="excel-card preview-container">
      <h3>Datos procesados ({data.length} registros)</h3>
      <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table className="excel-preview-table">
          <thead>
            <tr>
              {headers.map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((fila, i) => (
              <tr key={i}>
                {headers.map(h => <td key={h}>{fila[h]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}