import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';

const TitanHistorico = () => {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo_evento: '',
    fecha_desde: '',
    fecha_hasta: '',
    titan_id: '' // Opcional si se quisiera filtrar por titán específico
  });
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistorico = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const queryParams = new URLSearchParams();
      if (filtros.tipo_evento) queryParams.append('tipo_evento', filtros.tipo_evento);
      if (filtros.fecha_desde) queryParams.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) queryParams.append('fecha_hasta', filtros.fecha_hasta);

      const res = await fetch(`${API_BASE}/api/titan/historico?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar historial');
      const data = await res.json();
      setReportes(data.reportes || []);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar el historial de reportes.', 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, []);

  const handleFilterChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchHistorico();
  };

  const clearFilters = () => {
    setFiltros({ tipo_evento: '', fecha_desde: '', fecha_hasta: '', titan_id: '' });
    // fetchHistorico will be called manually or via effect if we attach it, but better manual to ensure state reset first.
    setTimeout(fetchHistorico, 0); 
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="titan-historico-container">
      <div className="titan-historico-filters">
        <form onSubmit={handleApplyFilters} className="historico-filters-form">
          <div className="filter-group">
            <label>Tipo de Evento</label>
            <select name="tipo_evento" value={filtros.tipo_evento} onChange={handleFilterChange} className="titan-select">
              <option value="">Todos</option>
              <option value="DESINCORPORACION">Desincorporación</option>
              <option value="INCORPORACION">Incorporación</option>
              <option value="ACCIDENTE">Accidente</option>
              <option value="CHOQUE">Choque</option>
              <option value="ATROPELLADO">Atropellado</option>
              <option value="CODIGO_AMBAR">Código Ámbar</option>
              <option value="CODIGO_ROJO">Código Rojo</option>
              <option value="CODIGO_NARANJA">Código Naranja</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Desde</label>
            <input type="date" name="fecha_desde" value={filtros.fecha_desde} onChange={handleFilterChange} className="titan-input-date" />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input type="date" name="fecha_hasta" value={filtros.fecha_hasta} onChange={handleFilterChange} className="titan-input-date" />
          </div>
          <div className="filter-actions">
            <button type="submit" className="centro-btn centro-btn--primary">Filtrar</button>
            <button type="button" className="titan-btn-cancel" onClick={clearFilters}>Limpiar</button>
          </div>
        </form>
      </div>

      <div className="titan-historico-list">
        {cargando ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Cargando historial...</p>
          </div>
        ) : reportes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>No se encontraron reportes con los filtros seleccionados.</p>
          </div>
        ) : (
          reportes.map(r => (
            <div key={r.id} className="historico-card">
              <div className="historico-card-header" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                <div className="historico-card-title">
                  <span className={`historico-badge badge-${r.tipo_evento.toLowerCase()}`}>
                    {r.tipo_evento.replace('_', ' ')}
                  </span>
                  <h4>Unidad {r.numero_economico}</h4>
                </div>
                <div className="historico-card-meta">
                  <span>{formatDate(r.created_at)}</span>
                  <span>Por: {r.nombre_titan}</span>
                  <svg 
                    style={{ width: '20px', height: '20px', transform: expandedId === r.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expandedId === r.id && (
                <div className="historico-card-body">
                  <div className="historico-grid">
                    {r.ubicacion_evento && (
                      <div className="historico-field">
                        <strong>Ubicación Evento:</strong> <span>{r.ubicacion_evento}</span>
                      </div>
                    )}
                    {r.ubicacion_gps && (
                      <div className="historico-field historico-field--full">
                        <strong>GPS:</strong> <span>{r.ubicacion_gps}</span>
                      </div>
                    )}
                    {r.observaciones && (
                      <div className="historico-field historico-field--full">
                        <strong>Observaciones:</strong> <span>{r.observaciones}</span>
                      </div>
                    )}
                    
                    {/* Campos Accidente/Choque/Atropellado */}
                    {r.accidente_hechos && (
                      <div className="historico-field historico-field--full">
                        <strong>Hechos:</strong> <span>{r.accidente_hechos}</span>
                      </div>
                    )}
                    
                    {/* Código Ámbar / Rojo */}
                    {r.diagnostico_preliminar && (
                      <div className="historico-field historico-field--full">
                        <strong>Diagnóstico:</strong> <span>{r.diagnostico_preliminar}</span>
                      </div>
                    )}
                    {r.lesionados_cantidad != null && (
                      <div className="historico-field">
                        <strong>Lesionados:</strong> <span>{r.lesionados_cantidad}</span>
                      </div>
                    )}
                    {r.estatus_legal && (
                      <div className="historico-field">
                        <strong>Estatus Legal:</strong> <span>{r.estatus_legal}</span>
                      </div>
                    )}
                    
                    {/* Código Naranja */}
                    {r.tipo_evento === 'CODIGO_NARANJA' && (
                      <>
                        <div className="historico-field">
                          <strong>Estación/Lugar:</strong> <span>{r.estacion_hecho || 'N/A'}</span>
                        </div>
                        <div className="historico-field">
                          <strong>Autoridad Interviniente:</strong> <span>{r.autoridad_interviniente || 'Ninguna'}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {r.fotos && r.fotos.length > 0 && (
                    <div className="historico-fotos">
                      <strong>Evidencia Fotográfica ({r.fotos.length})</strong>
                      <div className="historico-fotos-grid">
                        {r.fotos.map((foto, idx) => (
                          <a key={idx} href={foto} target="_blank" rel="noreferrer" className="historico-foto-link">
                            <img src={foto} alt={`Evidencia ${idx + 1}`} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {r.firma_particular_url && (
                    <div className="historico-firma">
                      <strong>Firma del Particular/Afectado</strong>
                      <img src={r.firma_particular_url} alt="Firma" className="historico-firma-img" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TitanHistorico;
