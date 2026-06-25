// src/pages/Encierro/DetalleUnidadEncierro.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { encierroModules } from '../../config/encierroModules';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import '../Unidades/DetalleUnidad.css';

export default function DetalleUnidadEncierro() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...'
  });
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [editandoConductor, setEditandoConductor] = useState(false);
  const [editandoRuta, setEditandoRuta] = useState(false);
  const [formEditar, setFormEditar] = useState({ conductor: '', ruta: '' });
  const [guardando, setGuardando] = useState(false);

  const configActual = encierroModules.find(m => m.id === tipoTransporte);
  if (!configActual) {
    return <div className="p-8">Transporte no encontrado. <button onClick={() => navigate('/encierro/dashboard')}>Volver</button></div>;
  }

  const [unidadesList, setUnidadesList] = useState([]);
  const [cargandoUnidades, setCargandoUnidades] = useState(true);

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchUnidades = async () => {
      const token = getToken();
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const respuesta = await fetch(
          `http://192.168.1.174:8000/api/unidades/listar/${tipoTransporte}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (respuesta.ok) {
          const datos = await respuesta.json();
          const unidadesFormateadas = datos.map(u =>
            `ECO${String(u.numero_eco).padStart(3, '0')}`
          );
          setUnidadesList(unidadesFormateadas);
        } else if (respuesta.status === 401) {
          navigate('/');
        } else {
          const errorText = await respuesta.text();
          console.error('Error al obtener la lista de unidades:', respuesta.status, errorText);
        }
      } catch (error) {
        console.error('Error de conexión al obtener la lista de unidades', error);
      } finally {
        setCargandoUnidades(false);
      }
    };

    fetchUnidades();
  }, [tipoTransporte, navigate]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelectUnit = async (unidad) => {
    setSelectedOption(unidad);
    setIsOpen(false);
    setCargandoDatos(true);

    const matchNumeros = unidad.match(/\d+/);
    const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

    try {
      const token = getToken();
      if (!token) { navigate('/'); return; }

      const url = `http://192.168.1.174:8000/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
      const respuesta = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const resultado = await respuesta.json();

      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos({
          conductor: resultado.conductor || 'No reportado hoy',
          ruta: resultado.ruta || 'Sin ruta'
        });
        setFormEditar({
          conductor: resultado.conductor || '',
          ruta: resultado.ruta || ''
        });
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta'
        });
        setFormEditar({ conductor: '', ruta: '' });
      }
    } catch (error) {
      console.error('Error en la petición:', error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener'
      });
      setFormEditar({ conductor: '', ruta: '' });
    } finally {
      setCargandoDatos(false);
    }
  };

  const handleGuardarEdicion = async (campo) => {
    if (!formEditar.conductor.trim() || !formEditar.ruta.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campos vacíos', text: 'El conductor y la ruta no pueden estar vacíos', confirmButtonColor: '#601a2a' });
      return;
    }
    setGuardando(true);
    try {
      const token = getToken();
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
      const payload = {
        unidades: [
          {
            ECONOMICO: numeroLimpio,
            RUTA: formEditar.ruta.trim(),
            NOMBRE_CONDUCTOR: formEditar.conductor.trim()
          }
        ]
      };
      const response = await fetch(`http://192.168.1.174:8000/api/despacho/actualizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        Swal.fire({ icon: 'success', title: 'Éxito', text: 'Datos actualizados correctamente', confirmButtonColor: '#c5a059' });
        setDatosOperativos({ ruta: formEditar.ruta.trim(), conductor: formEditar.conductor.trim() });
        if (campo === 'conductor') setEditandoConductor(false);
        if (campo === 'ruta') setEditandoRuta(false);
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.errores?.[0] || 'Hubo un error al actualizar', confirmButtonColor: '#601a2a' });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo conectar con el servidor', confirmButtonColor: '#601a2a' });
    } finally {
      setGuardando(false);
    }
  };

  const handleZoneClick = (zonaLimpia) => {
    navigate(`/encierro/transporte/${tipoTransporte}/${selectedOption}/reporte/${zonaLimpia.replace(' ', '-')}`);
  };

  return (
    <div className="layout-container">
      <Header
        title={selectedOption || "Seleccione Unidad"}
        eyebrow={`${configActual.title} / Encierro — Detalle de Unidad`}
        hideLogos={true}
      />

      <main className="main-content">
        <div className="info-panel">
          <div className="dropdown-container">
            <button onClick={toggleDropdown} className="dropdown-trigger">
              <div className="dropdown-trigger__icon-container">
                <img src={configActual.image} alt={configActual.title} className="dropdown-trigger__icon" />
              </div>
              <span className="dropdown-trigger__value">{selectedOption || "Opción"}</span>
              <span className="dropdown-trigger__label">{configActual.title}</span>
              <div className={`dropdown-trigger__arrow ${isOpen ? 'dropdown-trigger__arrow--open' : ''}`}>
                <svg className="arrow-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-menu__scroll">
                  {cargandoUnidades ? (
                    <div className="p-4 text-center" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)' }}></span>
                      Cargando unidades...
                    </div>
                  ) : unidadesList.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No hay unidades disponibles</div>
                  ) : (
                    unidadesList.map((unidad) => (
                      <button
                        key={unidad}
                        onClick={() => handleSelectUnit(unidad)}
                        className="dropdown-menu__item"
                      >
                        {unidad}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedOption ? (
            <>
              <div className="data-grid">
                <div className="data-item">
                  <h3 className="data-item__label">Tipo de Transporte</h3>
                  <p className="data-item__value">{configActual.title}</p>
                </div>
                <div className="data-item">
                  <h3 className="data-item__label">Número ECO</h3>
                  <p className="data-item__value">{selectedOption}</p>
                </div>
                <div className="data-item">
                  <h3 className="data-item__label">Conductor Asignado</h3>
                  {editandoConductor ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <input 
                        type="text" 
                        className="input-group__field" 
                        style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0 }}
                        value={formEditar.conductor} 
                        onChange={e => setFormEditar({...formEditar, conductor: e.target.value})} 
                      />
                      <button onClick={() => handleGuardarEdicion('conductor')} disabled={guardando} title="Guardar" style={{ background: 'transparent', color: '#16a34a', border: 'none', cursor: guardando ? 'wait' : 'pointer', padding: 0, display: 'flex' }}>
                        {guardando ? (
                          <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0, borderColor: 'rgba(22, 163, 74, 0.2)', borderTopColor: '#16a34a' }}></span>
                        ) : (
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </button>
                      <button onClick={() => { setEditandoConductor(false); setFormEditar({...formEditar, conductor: datosOperativos.conductor}); }} disabled={guardando} title="Cancelar" style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1, display: 'flex', alignItems: 'center', margin: 0 }}>
                        {cargandoDatos ? <><span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '0.875rem', height: '0.875rem' }}></span> Buscando...</> : datosOperativos.conductor}
                      </p>
                      <button onClick={() => setEditandoConductor(true)} title="Editar Conductor" style={{ background: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="data-item">
                  <h3 className="data-item__label">Ruta Asignada</h3>
                  {editandoRuta ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <input 
                        type="text" 
                        className="input-group__field" 
                        style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0 }}
                        value={formEditar.ruta} 
                        onChange={e => setFormEditar({...formEditar, ruta: e.target.value})} 
                      />
                      <button onClick={() => handleGuardarEdicion('ruta')} disabled={guardando} title="Guardar" style={{ background: 'transparent', color: '#16a34a', border: 'none', cursor: guardando ? 'wait' : 'pointer', padding: 0, display: 'flex' }}>
                        {guardando ? (
                          <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0, borderColor: 'rgba(22, 163, 74, 0.2)', borderTopColor: '#16a34a' }}></span>
                        ) : (
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </button>
                      <button onClick={() => { setEditandoRuta(false); setFormEditar({...formEditar, ruta: datosOperativos.ruta}); }} disabled={guardando} title="Cancelar" style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1, display: 'flex', alignItems: 'center', margin: 0 }}>
                        {cargandoDatos ? <><span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '0.875rem', height: '0.875rem' }}></span> Buscando...</> : datosOperativos.ruta}
                      </p>
                      <button onClick={() => setEditandoRuta(true)} title="Editar Ruta" style={{ background: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="info-panel__placeholder">
              <p>Despliega el botón "Opción" para seleccionar una unidad y comenzar el registro de encierro.</p>
            </div>
          )}
        </div>

        {selectedOption && (
          <div className="zones-section">
            <div className="zones-section__header">
              <h2 className="zones-section__eyebrow">Áreas de Inspección — Encierro</h2>
              <h1 className="zones-section__title">Seleccione la zona a reportar</h1>
              <p className="zones-section__subtitle">Toque una imagen para abrir el formulario de encierro de esa zona del vehículo</p>
            </div>

            <div className="zones-grid">
              <button onClick={() => handleZoneClick('Costado Izquierdo')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.lateral} alt="Costado Izquierdo" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">←</span> Costado Izquierdo</div>
                  <p className="zone-card__description">Vista lateral izquierda del vehículo</p>
                </div>
              </button>

              <button onClick={() => handleZoneClick('Costado Derecho')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.lateral} alt="Costado Derecho" className="zone-card__image zone-card__image--flipped" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">→</span> Costado Derecho</div>
                  <p className="zone-card__description">Vista lateral derecha del vehículo</p>
                </div>
              </button>

              <button onClick={() => handleZoneClick('Frente')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.frente} alt="Frente" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">↑</span> Frente</div>
                  <p className="zone-card__description">Vista frontal del vehículo</p>
                </div>
              </button>

              <button onClick={() => handleZoneClick('Parte Trasera')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.trasera} alt="Parte Trasera" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">↓</span> Parte Trasera</div>
                  <p className="zone-card__description">Vista trasera del vehículo</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
