import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Header from '../../components/Header/Header';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import API_BASE from '../../config/api';
import '../Menu/Menu.css';
import './HistorialReportesTitanes.css';

// Rutas confirmadas en routes/api.php (grupo auth:sanctum)
const ENDPOINT_TITANES = `${API_BASE}/api/users`;
const ENDPOINT_REPORTES_BASE = `${API_BASE}/api/titan`; // GET /api/titan/{usuarioId}/reportes

const TIPOS_EVENTO = [
  { value: '', label: 'Todos los tipos' },
  { value: 'INCORPORACION', label: 'Incorporación' },
  { value: 'DESINCORPORACION', label: 'Desincorporación' },
  { value: 'ACCIDENTE', label: 'Accidente' },
];

const ETIQUETA_EVENTO = {
  INCORPORACION: 'Incorporación',
  DESINCORPORACION: 'Desincorporación',
  ACCIDENTE: 'Accidente',
};

const FILTROS_INICIALES = {
  titanId: '',
  fecha: '',
  tipoEvento: '',
  numeroEconomico: '',
};

// Compara si una fecha ISO (created_at) cae en el mismo día que 'YYYY-MM-DD'
function mismaFecha(isoString, fechaYMD) {
  if (!fechaYMD) return true;
  const d = new Date(isoString);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return local === fechaYMD;
}

export default function HistorialReportesTitanes() {
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const [titanes, setTitanes] = useState([]);
  const [loadingTitanes, setLoadingTitanes] = useState(true);

  const [reportes, setReportes] = useState([]);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [error, setError] = useState(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  useEffect(() => {
    if (!user) return;
    if (!['ADMINISTRADOR', 'DESPACHO', 'GENERAL'].includes(user.role?.codigo)) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchTitanes = async () => {
      try {
        setLoadingTitanes(true);
        const res = await fetch(ENDPOINT_TITANES, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (!res.ok) throw new Error('Respuesta no ok');
        const data = await res.json();
        const soloTitanes = data.filter((u) => u.role?.codigo === 'TITAN');
        setTitanes(soloTitanes);
      } catch (err) {
        setError('No se pudo cargar la lista de titanes.');
      } finally {
        setLoadingTitanes(false);
      }
    };
    fetchTitanes();
  }, [token]);

  const fetchReportesDeUsuario = async (usuarioId) => {
    const res = await fetch(`${ENDPOINT_REPORTES_BASE}/${usuarioId}/reportes`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error('Respuesta no ok');
    const data = await res.json();
    return (data.reportes || []).map((r) => ({ ...r, __usuario_id: usuarioId }));
  };

  // Carga reportes: si hay titán seleccionado, solo los de ese titán;
  // si no, se consultan todos los titanes y se agregan (no existe endpoint global en backend).
  useEffect(() => {
    if (loadingTitanes) return;

    const cargar = async () => {
      setError(null);
      setLoadingReportes(true);
      try {
        if (filtros.titanId) {
          const data = await fetchReportesDeUsuario(filtros.titanId);
          setReportes(data);
        } else {
          if (titanes.length === 0) {
            setReportes([]);
          } else {
            const resultados = await Promise.allSettled(
              titanes.map((t) => fetchReportesDeUsuario(t.id))
            );
            const todos = resultados
              .filter((r) => r.status === 'fulfilled')
              .flatMap((r) => r.value);
            // Orden por fecha de creación descendente
            todos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setReportes(todos);
          }
        }
      } catch (err) {
        setError('No se pudieron cargar los reportes.');
        setReportes([]);
      } finally {
        setLoadingReportes(false);
        setBusquedaRealizada(true);
      }
    };

    cargar();
  }, [filtros.titanId, titanes, loadingTitanes, token]);

  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const limpiarFiltrosSecundarios = () => {
    setFiltros((prev) => ({
      ...FILTROS_INICIALES,
      titanId: prev.titanId,
    }));
  };

  const limpiarTodo = () => setFiltros(FILTROS_INICIALES);

  const reportesFiltrados = useMemo(() => {
    return reportes.filter((r) => {
      if (!mismaFecha(r.created_at, filtros.fecha)) return false;
      if (filtros.tipoEvento && r.tipo_evento !== filtros.tipoEvento) return false;
      if (
        filtros.numeroEconomico &&
        !String(r.numero_economico || '').toLowerCase().includes(filtros.numeroEconomico.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [reportes, filtros]);

  const resumen = useMemo(() => {
    return {
      incorporaciones: reportesFiltrados.filter((r) => r.tipo_evento === 'INCORPORACION').length,
      desincorporaciones: reportesFiltrados.filter((r) => r.tipo_evento === 'DESINCORPORACION').length,
      accidentes: reportesFiltrados.filter((r) => r.tipo_evento === 'ACCIDENTE').length,
    };
  }, [reportesFiltrados]);

  const titanPorId = useMemo(() => {
    const map = {};
    titanes.forEach((t) => { map[t.id] = t; });
    return map;
  }, [titanes]);

  const hayFiltrosActivos =
    filtros.titanId || filtros.fecha || filtros.tipoEvento || filtros.numeroEconomico;
  const hayFiltrosSecundarios = filtros.fecha || filtros.tipoEvento || filtros.numeroEconomico;

  return (
    <div className="dashboard-container">
      <Header hideBackButton={false} />

      <main className="dashboard-main">
        <div className="dashboard-welcome" style={{ textAlign: 'center' }}>
          <h2 className="dashboard-heading">
            Historial de <span className="text-highlight">Reportes de Titanes</span>
          </h2>
        </div>

        {/* Panel único de filtros, todos disponibles desde el inicio */}
        <div className="hrt-filtros-panel">
          <div className="hrt-filtros-header">
            <span>Filtros de búsqueda</span>
            {hayFiltrosActivos && (
              <button className="hrt-link-btn" onClick={limpiarTodo}>
                Limpiar todo
              </button>
            )}
          </div>

          <div className="hrt-filtros-grid">
            <div className="hrt-campo hrt-campo--titan">
              <label>Titán (opcional)</label>
              <select
                value={filtros.titanId}
                onChange={(e) => handleFiltroChange('titanId', e.target.value)}
                disabled={loadingTitanes}
              >
                <option value="">
                  {loadingTitanes ? 'Cargando titanes...' : 'Todos los titanes'}
                </option>
                {titanes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre_completo} ({t.usuario})
                  </option>
                ))}
              </select>
            </div>

            <div className="hrt-campo">
              <label>Fecha del reporte</label>
              <AppleDatePicker
                value={filtros.fecha}
                onChange={(val) => handleFiltroChange('fecha', val)}
              />
            </div>

            <div className="hrt-campo">
              <label>Tipo de evento</label>
              <select
                value={filtros.tipoEvento}
                onChange={(e) => handleFiltroChange('tipoEvento', e.target.value)}
              >
                {TIPOS_EVENTO.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>

            <div className="hrt-campo">
              <label>Número económico</label>
              <input
                type="text"
                placeholder="Ej. 1023"
                value={filtros.numeroEconomico}
                onChange={(e) => handleFiltroChange('numeroEconomico', e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <p className="hrt-error">{error}</p>}

        {/* Resumen tipo tarjetas */}
        <div className="hrt-resumen-grid">
          <div className="hrt-resumen-card hrt-card--total">
            <span className="hrt-resumen-numero">{reportesFiltrados.length}</span>
            <span className="hrt-resumen-label">Total reportes</span>
          </div>
          <div className="hrt-resumen-card hrt-card--incorporacion">
            <span className="hrt-resumen-numero">{resumen.incorporaciones}</span>
            <span className="hrt-resumen-label">Incorporaciones</span>
          </div>
          <div className="hrt-resumen-card hrt-card--desincorporacion">
            <span className="hrt-resumen-numero">{resumen.desincorporaciones}</span>
            <span className="hrt-resumen-label">Desincorporaciones</span>
          </div>
          <div className="hrt-resumen-card hrt-card--accidente">
            <span className="hrt-resumen-numero">{resumen.accidentes}</span>
            <span className="hrt-resumen-label">Accidentes</span>
          </div>
        </div>

        {/* Resultados */}
        <div className="hrt-resultados">
          {loadingReportes ? (
            <div className="hrt-estado">
              <div className="hrt-spinner" />
              <p>
                {filtros.titanId
                  ? `Cargando reportes de ${titanPorId[filtros.titanId]?.nombre_completo || 'titán'}...`
                  : 'Cargando reportes de todos los titanes...'}
              </p>
            </div>
          ) : reportesFiltrados.length === 0 ? (
            <div className="hrt-estado">
              <p>
                {busquedaRealizada && reportes.length > 0
                  ? 'Ningún reporte coincide con los filtros aplicados.'
                  : 'No hay reportes registrados.'}
              </p>
            </div>
          ) : (
            <div className="hrt-tabla-wrapper">
              <table className="hrt-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Evento</th>
                    <th>N° Económico</th>
                    <th>Titán</th>
                    <th>Ruta</th>
                    <th>Tarjetón</th>
                  </tr>
                </thead>
                <tbody>
                  {reportesFiltrados.map((r) => (
                    <tr key={`${r.__usuario_id}-${r.id}`}>
                      <td>{new Date(r.created_at).toLocaleString('es-MX', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}</td>
                      <td>
                        <span className={`hrt-badge hrt-badge--${(r.tipo_evento || '').toLowerCase()}`}>
                          {ETIQUETA_EVENTO[r.tipo_evento] || r.tipo_evento}
                        </span>
                      </td>
                      <td>{r.numero_economico || '-'}</td>
                      <td>{titanPorId[r.__usuario_id]?.nombre_completo || '-'}</td>
                      <td>{r.ruta || '-'}</td>
                      <td>{r.numero_tarjeton || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}