import React from 'react';
import './PlantillaReporteGeneral.css';

import logoSTM from '../../assets/logo-stm.png';
import urbanusImg from '../../assets/urbanus.PNG';
import alimentadoraImg from '../../assets/alimentadora.PNG';

const PlantillaReporteGeneral = ({ data }) => {
  if (!data || !data.length) return null;

  const troncales = data.filter(item =>
    ['T-01', 'T-02', 'T-04', 'T-05'].includes(item.ruta)
  );
  const alimentadoras = data.filter(item => item.ruta.startsWith('RA'));

  const troncalOperacion     = troncales.reduce((s, r) => s + Number(r.en_operacion), 0);
  const troncalMantenimiento = troncales.reduce((s, r) => s + Number(r.en_mantenimiento), 0);
  const troncalTotal         = troncalOperacion + troncalMantenimiento;

  const alimentadoraOperacion     = alimentadoras.reduce((s, r) => s + Number(r.en_operacion), 0);
  const alimentadoraMantenimiento = alimentadoras.reduce((s, r) => s + Number(r.en_mantenimiento), 0);
  const alimentadoraTotal         = alimentadoraOperacion + alimentadoraMantenimiento;

  const fecha = new Date().toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).toUpperCase();

  return (
    <div id="reporte-pdf" className="reporte">

      {/* HEADER */}
      <div className="header">
        <img src={logoSTM} alt="STM" />
        <h1>REPORTE DE OPERACIONES</h1>
      </div>

      {/* FECHA */}
      <div className="fecha">{fecha}</div>

      <div className="contenido">

  {/* IMÁGENES */}
  <div className="imagenes">
  <div className="img-box-urbanus">
    <img src={urbanusImg} alt="Urbanus" />
  </div>
  <div className="img-box-alimentadora">
    <img src={alimentadoraImg} alt="Alimentadora" />
  </div>
</div>

  {/* TABLA */}
  <div className="tabla-wrap">
    <table>
      <thead>
        <tr>
          <th className="th-rutas" rowSpan="2">
            <span className="th-count">{troncales.length}</span> SERVICIOS DE TRONCAL /
            <br />
            <span className="th-count">{alimentadoras.length}</span> RUTA ALIMENTADORA
          </th>
          <th colSpan="3" className="th-nunidades">N° UNIDADES</th>
        </tr>
        <tr>
          <th className="th-sub">EN OPERACIÓN</th>
          <th className="th-sub">PATIO TERMINAL TÉLLEZ</th>
          <th className="th-sub">TOTAL</th>
        </tr>
      </thead>

      <tbody>
        {/* TRONCALES */}
        {troncales.map((item, i) => (
          <tr key={item.ruta}>
            <td className="td-ruta">{item.ruta}</td>

            {i === 0 && (
              <td rowSpan={troncales.length} className="td-operacion-group">
                <div className="operacion-col">
                  <div className="operacion-individual">
                    {troncales.map(r => (
                      <span key={r.ruta} className="ind-num">{r.en_operacion}</span>
                    ))}
                  </div>
                  <div className="td-big-vino">{troncalOperacion}</div>
                </div>
              </td>
            )}

            {i === 0 && (
              <td rowSpan={troncales.length} className="td-mantenimiento">
                <span className="mant-num">{troncalMantenimiento}</span>
                <p>UNIDADES<br />EN MANTENIMIENTO</p>
              </td>
            )}

            {i === 0 && (
              <td rowSpan={troncales.length} className="td-big-negro">
                {troncalTotal}
              </td>
            )}
          </tr>
        ))}

        {/* ALIMENTADORAS */}
        {alimentadoras.map((item, i) => (
          <tr key={item.ruta}>
            <td className="td-ruta">{item.ruta}</td>

            {i === 0 && (
              <td rowSpan={alimentadoras.length} className="td-operacion-group">
                <div className="operacion-col">
                  <div className="operacion-individual">
                    {alimentadoras.map(r => (
                      <span key={r.ruta} className="ind-num">{r.en_operacion}</span>
                    ))}
                  </div>
                  <div className="td-big-vino">{alimentadoraOperacion}</div>
                </div>
              </td>
            )}

            {i === 0 && (
              <td rowSpan={alimentadoras.length} className="td-mantenimiento">
                <span className="mant-num">{alimentadoraMantenimiento}</span>
                <p>UNIDADES<br />EN MANTENIMIENTO</p>
              </td>
            )}

            {i === 0 && (
              <td rowSpan={alimentadoras.length} className="td-big-negro">
                {alimentadoraTotal}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>


      </div>

      <div className="footer-bar" />
    </div>
  );
};

export default PlantillaReporteGeneral;