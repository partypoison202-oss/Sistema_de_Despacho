import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API_BASE from '../../config/api';

// Fix para los iconos de leaflet en react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons per event type (optional, using default with colors if possible, but standard is fine)
const getMarkerIcon = (tipo) => {
  // We can just use the default blue marker for everything, or create custom divIcons. 
  // For simplicity and stability, we use a custom colored DivIcon based on the event type.
  let color = '#6b7280';
  switch (tipo) {
    case 'INCORPORACION': color = '#10b981'; break;
    case 'ACCIDENTE': color = '#3b82f6'; break;
    case 'CHOQUE': color = '#f59e0b'; break;
    case 'ATROPELLADO': color = '#ef4444'; break;
    case 'CODIGO_AMBAR': color = '#f59e0b'; break;
    case 'CODIGO_ROJO': color = '#dc2626'; break;
    case 'CODIGO_NARANJA': color = '#f97316'; break;
    default: break;
  }
  
  return new L.DivIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const TitanHistorico = () => {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo_evento: '',
    fecha_desde: '',
    fecha_hasta: '',
    titan_id: ''
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

  // Helper para parsear la lat/lng guardada (formato: "Direccion|lat,lng" o "lat,lng")
  const getCoordinates = (ubicacionStr) => {
    if (!ubicacionStr) return null;
    let parts = ubicacionStr.split('|');
    let coordsStr = parts.length > 1 ? parts[1] : parts[0];
    let latLng = coordsStr.split(',');
    if (latLng.length === 2) {
      let lat = parseFloat(latLng[0]);
      let lng = parseFloat(latLng[1]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return null;
  };

  const mapCenter = [20.1011, -98.7591]; // Default to Pachuca

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

      <div style={{ height: '350px', marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', zIndex: 0, position: 'relative' }}>
        <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {reportes.map(r => {
            const coords = getCoordinates(r.ubicacion_gps);
            if (!coords) return null;
            return (
              <Marker key={r.id} position={coords} icon={getMarkerIcon(r.tipo_evento)}>
                <Popup>
                  <div style={{ padding: '4px' }}>
                    <strong style={{ fontSize: '13px' }}>{r.tipo_evento.replace('_', ' ')}</strong><br/>
                    ECO {r.numero_economico}<br/>
                    {formatDate(r.created_at)}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
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
                        <strong>GPS:</strong> <span>{r.ubicacion_gps.split('|')[0]}</span>
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
