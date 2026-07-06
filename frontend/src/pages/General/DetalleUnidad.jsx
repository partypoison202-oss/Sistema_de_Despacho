// src/pages/DetalleUnidad/DetalleUnidad.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import { transportModules } from '../../config/transportModules';
import API_BASE from '../../config/api';
import './DetalleUnidad.css';

export default function DetalleUnidad() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const modulo = transportModules.find((m) => m.id === id);

  useEffect(() => {
    const fetchDetalle = async () => {
      setCargando(true);
      setError(null);
      const token = localStorage.getItem('token');

      try {
        const respuesta = await fetch(
          `${API_BASE}/api/despacho/detalle/${id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!respuesta.ok) {
          throw new Error('No se pudo obtener la información del despacho');
        }

        const data = await respuesta.json();
        setDatos(data);
      } catch (err) {
        console.error('Error al obtener el detalle:', err);
        setError(err.message || 'Ocurrió un error al cargar la información');
      } finally {
        setCargando(false);
      }
    };

    fetchDetalle();
  }, [id]);

  const formatoHora = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '—';
    // Los horarios llegan como número decimal (ej. 5.3 => 5:30)
    if (typeof valor === 'number') {
      const horas = Math.floor(valor);
      const minutos = Math.round((valor - horas) * 100);
      return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    }
    return valor;
  };

  return (
    <div className="detalle">
      <Header />
      <main className="detalle__main">
        <button className="detalle__volver" onClick={() => navigate('/dashboard')}>
          ← Volver a la flota
        </button>

        <div className="detalle__encabezado">
          <div className="detalle__titulo-grupo">
            <p className="detalle__eyebrow">Despacho de unidades</p>
            <h1 className="detalle__titulo">{modulo?.title || 'Unidad'}</h1>
          </div>

          {datos?.cumplioProgramado && (
            <span
              className={`detalle__badge ${
                datos.cumplioProgramado === 'SI'
                  ? 'detalle__badge--si'
                  : 'detalle__badge--no'
              }`}
            >
              ¿Cumplió lo programado? {datos.cumplioProgramado}
            </span>
          )}
        </div>

        {cargando && <p className="detalle__estado">Cargando información...</p>}

        {error && !cargando && (
          <div className="detalle__error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        )}

        {!cargando && !error && datos && (
          <>
            {datos.resumen && (
              <div className="detalle__resumen">
                <div className="detalle__resumen-card">
                  <span className="detalle__resumen-valor">
                    {datos.resumen.programadas ?? '—'}
                  </span>
                  <span className="detalle__resumen-label">Programadas</span>
                </div>
                <div className="detalle__resumen-card">
                  <span className="detalle__resumen-valor">
                    {datos.resumen.operando ?? '—'}
                  </span>
                  <span className="detalle__resumen-label">Operando</span>
                </div>
                <div className="detalle__resumen-card detalle__resumen-card--alerta">
                  <span className="detalle__resumen-valor">
                    {datos.resumen.faltantes ?? '—'}
                  </span>
                  <span className="detalle__resumen-label">Faltantes</span>
                </div>
              </div>
            )}

            <div className="detalle__tabla-wrapper">
              <table className="detalle__tabla">
                <thead>
                  <tr>
                    <th>ECO</th>
                    <th>ID</th>
                    <th>{modulo?.id === 'urbanus' ? 'SERVICIO' : 'RUTA'}</th>
                    <th>Hora de salida</th>
                    <th>Acople a ruta</th>
                    <th>Corrida</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(datos.unidades || []).map((unidad, index) => (
                    <tr
                      key={`${unidad.eco}-${index}`}
                      className={
                        unidad.observaciones === 'MANTENIMIENTO'
                          ? 'detalle__fila--mantenimiento'
                          : ''
                      }
                    >
                      <td>{unidad.eco}</td>
                      <td>{unidad.idUnidad ?? '—'}</td>
                      <td>{unidad.ruta ?? '—'}</td>
                      <td>{formatoHora(unidad.horaSalida)}</td>
                      <td>{formatoHora(unidad.acopleRuta)}</td>
                      <td>{unidad.corrida ?? '—'}</td>
                      <td>{unidad.observaciones || '—'}</td>
                    </tr>
                  ))}

                  {(!datos.unidades || datos.unidades.length === 0) && (
                    <tr>
                      <td colSpan={7} className="detalle__sin-datos">
                        No hay unidades registradas para este módulo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
