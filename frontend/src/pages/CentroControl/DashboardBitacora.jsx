import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import './DashboardBitacora.css';
import Swal from 'sweetalert2';

export default function DashboardBitacora() {
  const navigate = useNavigate();
  
  // By default today in YYYY-MM-DD
  const today = new Date().toLocaleDateString('en-CA');
  const [fecha, setFecha] = useState(today);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetchBitacoras(fecha);
  }, [fecha]);

  const fetchBitacoras = async (selectedDate) => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/bitacoras-diarias?fecha=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Error al obtener la bitácora operativa');
      }
      const data = await response.json();
      setRegistros(data.registros || []);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al cargar los historiales de la fecha.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setCargando(false);
    }
  };

  const getEstatusBadge = (estatus) => {
    const est = (estatus || '').toLowerCase().trim();
    if (est.includes('operaci')) return 'badge-operacion';
    if (est.includes('reserva')) return 'badge-reserva';
    if (est.includes('mantenimiento')) return 'badge-mantenimiento';
    return 'badge-default';
  };

  const formatHora = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatAccion = (accion) => {
    switch(accion) {
      case 'CAMBIO_ESTATUS': return 'Cambio de Estatus';
      case 'INCORPORACION': return 'Incorporación';
      case 'DESINCORPORACION': return 'Desincorporación';
      case 'CAMBIO_UNIDAD_REEMPLAZO': return 'Reemplazo de Unidad';
      default: return accion || 'Acción';
    }
  };

  const handleVerDetalles = (reg) => {
    Swal.fire({
      title: `Detalles del Movimiento`,
      html: `
        <div style="text-align: left; font-size: 0.95rem; color: #374151;">
          <p><strong>Unidad:</strong> ${reg.economico}</p>
          <p><strong>Acción:</strong> ${formatAccion(reg.tipo_accion)}</p>
          <p><strong>Hora:</strong> ${formatHora(reg.hora)}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
          <p><strong>Estatus Anterior:</strong> ${reg.estatus_anterior ? reg.estatus_anterior.toUpperCase() : '—'}</p>
          <p><strong>Estatus Nuevo:</strong> ${reg.estatus_nuevo ? reg.estatus_nuevo.toUpperCase() : '—'}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
          <p><strong>Usuario:</strong> ${reg.usuario_nombre || 'Sistema'} (${reg.usuario_rol || 'N/A'})</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #e5e7eb;">
            <p style="margin: 0; font-weight: 600; color: #111827; margin-bottom: 8px;">Descripción Adicional:</p>
            <p style="margin: 0; line-height: 1.5;">${reg.detalles || 'Sin detalles adicionales.'}</p>
          </div>
        </div>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#601a2a',
      width: '500px',
    });
  };

  return (
    <div className="dashboard-bitacora-page">
      <Header title="Bitácoras Operativas" eyebrow="Historial de Movimientos" />

      <main className="dashboard-bitacora-main">
        <div className="dashboard-bitacora-header">
          <div className="dashboard-bitacora-welcome">
            <p className="eyebrow">Registro Histórico</p>
            <h1 className="title">Bitácoras Diarias</h1>
            <p className="subtitle">
              Visualiza el historial completo de cambios de estatus, incorporaciones y reemplazos de unidades en la flota.
            </p>
          </div>
          
          <div className="dashboard-bitacora-controls">
            <input 
              type="date" 
              className="bitacora-date-picker" 
              value={fecha}
              max={today}
              onChange={(e) => setFecha(e.target.value)}
              title="Filtrar por fecha"
            />
            <button 
              type="button" 
              className="bitacora-btn-back"
              onClick={() => navigate('/centro-control')}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Volver a Centro
            </button>
          </div>
        </div>

        <section className="dashboard-bitacora-content">
          {cargando ? (
            <div className="bitacora-loading">
              <div className="spinner"></div>
              <p>Cargando registros...</p>
            </div>
          ) : registros.length > 0 ? (
            <div className="bitacora-table-wrapper">
              <table className="bitacora-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Unidad</th>
                    <th>Acción</th>
                    <th>Estatus Anterior</th>
                    <th>Estatus Nuevo</th>
                    <th>Detalles</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((reg) => (
                    <tr 
                      key={reg.id} 
                      onClick={() => handleVerDetalles(reg)} 
                      style={{ cursor: 'pointer' }}
                      title="Clic para ver más detalles"
                    >
                      <td>{formatHora(reg.hora)}</td>
                      <td style={{ fontWeight: '700', color: '#601a2a' }}>{reg.economico}</td>
                      <td style={{ fontWeight: '600' }}>{formatAccion(reg.tipo_accion)}</td>
                      <td>
                        <span className={`bitacora-badge ${getEstatusBadge(reg.estatus_anterior)}`}>
                          {(reg.estatus_anterior || '—').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`bitacora-badge ${getEstatusBadge(reg.estatus_nuevo)}`}>
                          {(reg.estatus_nuevo || '—').toUpperCase()}
                        </span>
                      </td>
                      <td className="td-detalles" title={reg.detalles}>
                        {reg.detalles || '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{reg.usuario_nombre || 'Sistema'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{reg.usuario_rol || ''}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bitacora-empty">
              No se encontraron movimientos operativos para la fecha seleccionada.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
