// src/pages/DetalleUnidad/DetalleUnidad.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import { transportModules } from '../../config/transportModules';
import API_BASE from '../../config/api';
import './DetalleUnidad.css';

// Solo se usa para comparar internamente (conteos, resaltado de alerta).
// El texto que se MUESTRA en la tabla siempre es el valor original de la BD.
const esOperacion = (valor) => String(valor ?? '').trim().toUpperCase() === 'OPERACION';

const normalizarTexto = (valor) => String(valor ?? '').trim().toUpperCase();

// Convierte horarios decimales (5.3 => 5:30) o los deja pasar si ya vienen como texto.
const formatoHora = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'number') {
    const horas = Math.floor(valor);
    const minutos = Math.round((valor - horas) * 100);
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  }
  return valor;
};

export default function DetalleUnidad() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [unidades, setUnidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const modulo = transportModules.find((m) => m.id === id);

  useEffect(() => {
    const fetchDetalle = async () => {
      setCargando(true);
      setError(null);
      const token = localStorage.getItem('token');

      try {
        // Reutilizamos el mismo endpoint que alimenta el Dashboard,
        // ya que /api/despacho/detalle/:id no existe en el backend.
        const respuesta = await fetch(`${API_BASE}/api/despacho/hoy`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!respuesta.ok) {
          throw new Error('No se pudo obtener la información del despacho');
        }

        const registros = await respuesta.json();
        const tipoNormalizado = normalizarTexto(id);

        const filtrados = (Array.isArray(registros) ? registros : [])
          .filter((registro) => normalizarTexto(registro.TIPO_DE_UNIDAD) === tipoNormalizado)
          .map((registro) => ({
            eco: registro.ECONOMICO || '',
            idUnidad: registro.TARJETON || '',
            ruta: registro.RUTA || '',
            // Texto EXACTO tal cual está en la base de datos, sin transformar.
            estatus: registro.ESTATUS !== null && registro.ESTATUS !== undefined
              ? String(registro.ESTATUS).trim()
              : '',
            horaSalida: registro.HORA_PROGRAMADA,
            acopleRuta: registro.HORA_DE_ACOPLE,
            corrida: registro.CORRIDAS,
          }))
          .sort((a, b) => Number(a.eco) - Number(b.eco));

        setUnidades(filtrados);
      } catch (err) {
        console.error('Error al obtener el detalle:', err);
        setError(err.message || 'Ocurrió un error al cargar la información');
      } finally {
        setCargando(false);
      }
    };

    fetchDetalle();
  }, [id]);

  const programadas = unidades.length;
  const operando = unidades.filter((u) => esOperacion(u.estatus)).length;
  const faltantes = programadas - operando;

  return (
    <div className="detalle">
      <Header />
      <main className="detalle__main">

        <div className="detalle__banner">
          <span className="detalle__banner-titulo">
            {(modulo?.title || 'UNIDAD').toUpperCase()}, ¿CUMPLIÓ LO PROGRAMADO?
          </span>
          <span className="detalle__banner-respuesta">SI</span>
        </div>

        {cargando && <p className="detalle__estado">Cargando información...</p>}

        {error && !cargando && (
          <div className="detalle__error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        )}

        {!cargando && !error && (
          <>
            <div className="detalle__resumen">
              <div className="detalle__resumen-card">
                <span className="detalle__resumen-valor">{programadas}</span>
                <span className="detalle__resumen-label">Programadas</span>
              </div>
              <div className="detalle__resumen-card">
                <span className="detalle__resumen-valor">{operando}</span>
                <span className="detalle__resumen-label">Operando</span>
              </div>
              <div className="detalle__resumen-card detalle__resumen-card--alerta">
                <span className="detalle__resumen-valor">{faltantes}</span>
                <span className="detalle__resumen-label">Faltantes</span>
              </div>
            </div>

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
                  {unidades.map((unidad, index) => {
                    const sinAsignar = !unidad.ruta && !unidad.idUnidad;
                    const esAlerta = unidad.estatus !== '' && !esOperacion(unidad.estatus);
                    const textoEstatus = unidad.estatus || '—';

                    if (sinAsignar && esAlerta) {
                      // Unidad sin ruta/tarjetón asignado: se muestra como barra completa.
                      return (
                        <tr key={`${unidad.eco}-${index}`}>
                          <td className="detalle__eco">{unidad.eco}</td>
                          <td colSpan={6} className="detalle__observacion-barra">
                            {textoEstatus}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`${unidad.eco}-${index}`}>
                        <td className="detalle__eco">{unidad.eco}</td>
                        <td>{unidad.idUnidad || '—'}</td>
                        <td>{unidad.ruta || '—'}</td>
                        <td>{formatoHora(unidad.horaSalida)}</td>
                        <td>{formatoHora(unidad.acopleRuta)}</td>
                        <td>{unidad.corrida ?? '—'}</td>
                        <td>
                          {esAlerta ? (
                            <span className="detalle__observacion-badge">{textoEstatus}</span>
                          ) : (
                            textoEstatus
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {unidades.length === 0 && (
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
