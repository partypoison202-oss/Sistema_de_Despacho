// src/pages/DetalleUnidad/DetalleUnidad.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
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

  const modulo = transportModules.find((m) => m.id === id);

  const fetchDespachoHoy = async () => {
    const response = await fetch(`${API_BASE}/api/despacho/hoy`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}` },
    });
    if (!response.ok) throw new Error('Error al cargar');
    return response.json();
  };

  const { data: registrosHoy = [], isLoading: cargando, error } = useQuery({
    queryKey: ['despacho-hoy'],
    queryFn: fetchDespachoHoy,
    refetchInterval: 30000,
  });

  const unidades = React.useMemo(() => {
    const tipoNormalizado = normalizarTexto(id);
    return (Array.isArray(registrosHoy) ? registrosHoy : [])
      .filter((registro) => normalizarTexto(registro.TIPO_DE_UNIDAD) === tipoNormalizado)
      .map((registro) => ({
        eco: registro.ECONOMICO || '',
        idUnidad: registro.TARJETON || '',
        ruta: registro.RUTA || '',
        estatus: registro.ESTATUS !== null && registro.ESTATUS !== undefined
          ? String(registro.ESTATUS).trim()
          : '',
        horaSalida: registro.HORA_PROGRAMADA,
        acopleRuta: registro.HORA_DE_ACOPLE,
        corrida: registro.CORRIDAS,
      }))
      .sort((a, b) => Number(a.eco) - Number(b.eco));
  }, [registrosHoy, id]);

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
