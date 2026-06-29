// src/pages/Unidades/DetalleUnidad.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transportModules } from '../../config/transportModules';
import Header from '../../components/Header/Header';
import './DetalleUnidad.css';

const CustomDropdown = ({ options, value, onChange, placeholder, disabled, width = '100%' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: width,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <div
        className="input-group__field"
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        style={{
          padding: '0.25rem 0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          margin: 0,
          height: '32px',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          backgroundColor: '#fff',
        }}
      >
        <span style={{ color: value ? '#000' : '#6b7280', fontSize: '0.875rem' }}>
          {value || placeholder}
        </span>
        <svg
          className="arrow-icon"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            width: '0.75rem',
            height: '0.75rem',
            color: '#6b1d33',
          }}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
        </svg>
      </div>

      {isOpen && (
        <div
          className="dropdown-menu"
          style={{
            width: '100%',
            left: 0,
            top: '100%',
            marginTop: '0.25rem',
            zIndex: 60,
          }}
        >
          <div className="dropdown-menu__scroll" style={{ maxHeight: '10rem' }}>
            <button
              type="button"
              className="dropdown-menu__item"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              {placeholder}
            </button>
            {options.map((opt, i) => (
              <button
                type="button"
                key={i}
                className="dropdown-menu__item"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function DetalleUnidad() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...',
    tarjeton: '',
  });
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [tarjetonBusqueda, setTarjetonBusqueda] = useState('');
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');

  const configActual = transportModules.find((m) => m.id === tipoTransporte);
  if (!configActual) {
    return (
      <div className="p-8">
        Transporte no encontrado. <button onClick={() => navigate('/')}>Volver</button>
      </div>
    );
  }

  const [unidadesList, setUnidadesList] = useState([]);
  const [cargandoUnidades, setCargandoUnidades] = useState(true);

  // Estados para información adicional
  const [fallaTexto, setFallaTexto] = useState('');
  const [corridasSeleccionadas, setCorridasSeleccionadas] = useState('');
  const [cicloSeleccionado, setCicloSeleccionado] = useState('');
  const [motivoTexto, setMotivoTexto] = useState('');

  const handleCancelAdicional = () => {
    setFallaTexto('');
    setCorridasSeleccionadas('');
    setCicloSeleccionado('');
    setMotivoTexto('');
  };

  const handleSaveAdicional = async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

      const payload = {
        tipo: tipoTransporte,
        numero_eco: numeroLimpio,
        falla: fallaTexto || null,
        corridas: corridasSeleccionadas || null,
        ciclo: cicloSeleccionado || null,
        motivo: motivoTexto || null,
      };

      const respuesta = await fetch('http://localhost:8000/api/despacho/actualizar-adicionales', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resultado = await respuesta.json();

      if (respuesta.ok && resultado.status === 'success') {
        import('sweetalert2').then((Swal) => {
          Swal.default.fire({
            icon: 'success',
            title: '¡Información guardada!',
            text: 'Los datos se han guardado correctamente.',
            confirmButtonColor: '#c29b53',
            timer: 2000,
          });
        });
      } else {
        import('sweetalert2').then((Swal) => {
          Swal.default.fire({
            icon: 'error',
            title: 'Error',
            text: resultado.message || 'Error al guardar los datos',
            confirmButtonColor: '#601a2a',
          });
        });
      }
    } catch (error) {
      console.error('Error al guardar datos adicionales:', error);
      import('sweetalert2').then((Swal) => {
        Swal.default.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error de conexión',
          confirmButtonColor: '#601a2a',
        });
      });
    }
  };

  // Obtener el token del localStorage
  const getToken = () => localStorage.getItem('token');

  // Cargar lista de unidades al montar el componente
  useEffect(() => {
    const fetchUnidades = async () => {
      const token = getToken();
      if (!token) {
        console.warn('No hay token, redirigiendo al login...');
        navigate('/login');
        return;
      }

      try {
        const respuesta = await fetch(
          `http://localhost:8000/api/unidades/listar/${tipoTransporte}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (respuesta.ok) {
          const datos = await respuesta.json();
          const unidadesCatalogo = (Array.isArray(datos) ? datos : []).map((u) => ({
            eco: String(u.numero_eco ?? '').padStart(3, '0'),
            tarjeton: String(u.tarjeton ?? '').trim(),
            display: formatearEco(u.numero_eco),
          }));
          setUnidadesList(unidadesCatalogo);
        } else if (respuesta.status === 401) {
          console.error('Sesión expirada, redirigiendo al login...');
          navigate('/login');
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

  const formatearEco = (valor) => `ECO${String(valor ?? '').padStart(3, '0')}`;

  const extraerNumeroEco = (valor) => {
    const texto = String(valor ?? '');
    const matchNumeros = texto.match(/\d+/);
    return matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
  };

  const buscarUnidadPorInput = async () => {
    const valor = String(tarjetonBusqueda ?? '').trim();
    setMensajeBusqueda('');

    if (!valor) {
      setMensajeBusqueda('Escribe un número de tarjetón para buscar.');
      return;
    }

    const unidadEncontrada = unidadesList.find((unidad) => String(unidad.tarjeton ?? '').trim() === valor);

    if (unidadEncontrada) {
      setTarjetonBusqueda(unidadEncontrada.tarjeton || valor);
      await handleSelectUnit(unidadEncontrada);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const respuesta = await fetch(
        `http://localhost:8000/api/unidades/buscar-tarjeton/${tipoTransporte}/${encodeURIComponent(valor)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const resultado = await respuesta.json();

      if (respuesta.ok && resultado?.status === 'success' && resultado?.unidad) {
        const unidadRemota = {
          eco: resultado.unidad.numero_eco,
          tarjeton: resultado.unidad.tarjeton,
          display: formatearEco(resultado.unidad.numero_eco),
        };

        setUnidadesList((prev) =>
          prev.some((item) => String(item.eco ?? '').padStart(3, '0') === String(unidadRemota.eco).padStart(3, '0'))
            ? prev
            : [...prev, unidadRemota]
        );
        setTarjetonBusqueda(unidadRemota.tarjeton || valor);
        await handleSelectUnit(unidadRemota);
      } else {
        setMensajeBusqueda('No se encontró una unidad con ese número de tarjetón.');
      }
    } catch (error) {
      console.error('Error al buscar por tarjetón:', error);
      setMensajeBusqueda('No se pudo completar la búsqueda en este momento.');
    }
  };

  const handleSelectUnit = async (unidad) => {
    const unidadSeleccionada =
      typeof unidad === 'object' && unidad !== null
        ? unidad
        : unidadesList.find((item) => item.display === unidad || item.eco === unidad || String(item.tarjeton ?? '').trim() === String(unidad ?? '').trim()) || null;

    const ecoSeleccionado = unidadSeleccionada
      ? formatearEco(unidadSeleccionada.eco)
      : formatearEco(extraerNumeroEco(unidad));

    setSelectedOption(ecoSeleccionado);
    setTarjetonBusqueda(unidadSeleccionada?.tarjeton || (typeof unidad === 'string' ? unidad : ''));
    setIsOpen(false);
    setCargandoDatos(true);
    setMensajeBusqueda('');

    const numeroLimpio = unidadSeleccionada
      ? String(unidadSeleccionada.eco).padStart(3, '0')
      : extraerNumeroEco(ecoSeleccionado);

    try {
      const token = getToken();
      if (!token) {
        console.warn('No hay token, redirigiendo al login...');
        navigate('/login');
        return;
      }

      const url = `http://localhost:8000/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
      console.log('Consultando URL:', url);

      const respuesta = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const resultado = await respuesta.json();
      console.log('Respuesta completa:', resultado);

      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos({
          conductor: resultado.conductor || 'No reportado hoy',
          ruta: resultado.ruta || 'Sin ruta',
          tarjeton: resultado.tarjeton || '',
        });

        // Cargar información adicional
        setFallaTexto(resultado.falla || '');
        setCorridasSeleccionadas(resultado.corridas || '');
        setCicloSeleccionado(resultado.ciclo || '');
        setMotivoTexto(resultado.motivo || '');
      } else {
        console.warn('Respuesta con error o status no exitoso:', resultado);
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta',
          tarjeton: '',
        });
        setFallaTexto('');
        setCorridasSeleccionadas('');
        setCicloSeleccionado('');
        setMotivoTexto('');
      }
    } catch (error) {
      console.error('Error en la petición:', error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener',
        tarjeton: '',
      });
    } finally {
      setCargandoDatos(false);
    }
  };

  const handleZoneClick = (zonaLimpia) => {
    navigate(`/transporte/${tipoTransporte}/${selectedOption}/reporte/${zonaLimpia.replace(' ', '-')}`);
  };

  return (
    <div className="layout-container">
      <Header
        title={selectedOption || 'Seleccione Unidad'}
        eyebrow={`${configActual.title} / Detalle de Unidad`}
        hideLogos={true}
      />

      <main className="main-content">
        <div className="info-panel">
          <div className="dropdown-container">
            <button onClick={toggleDropdown} className="dropdown-trigger">
              <div className="dropdown-trigger__icon-container">
                <img src={configActual.image} alt={configActual.title} className="dropdown-trigger__icon" />
              </div>
              <span className="dropdown-trigger__value">{selectedOption || 'Opción'}</span>
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
                    <div
                      className="p-4 text-center"
                      style={{
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span
                        className="spinner"
                        style={{
                          borderColor: 'rgba(96, 26, 42, 0.2)',
                          borderTopColor: 'var(--color-maroon)',
                        }}
                      ></span>
                      Cargando unidades...
                    </div>
                  ) : unidadesList.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No hay unidades disponibles</div>
                  ) : (
                    unidadesList.map((unidad) => (
                      <button
                        key={unidad.display}
                        onClick={() => handleSelectUnit(unidad)}
                        className="dropdown-menu__item"
                      >
                        {unidad.display}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedOption ? (
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
                <p
                  className="data-item__value"
                  style={{
                    opacity: cargandoDatos ? 0.8 : 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {cargandoDatos ? (
                    <>
                      <span
                        className="spinner"
                        style={{
                          borderColor: 'rgba(96, 26, 42, 0.2)',
                          borderTopColor: 'var(--color-maroon)',
                          width: '0.875rem',
                          height: '0.875rem',
                        }}
                      ></span>{' '}
                      Buscando...
                    </>
                  ) : (
                    datosOperativos.conductor
                  )}
                </p>
              </div>
              <div className="data-item">
                <h3 className="data-item__label">Ruta Asignada</h3>
                <p
                  className="data-item__value"
                  style={{
                    opacity: cargandoDatos ? 0.8 : 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {cargandoDatos ? (
                    <>
                      <span
                        className="spinner"
                        style={{
                          borderColor: 'rgba(96, 26, 42, 0.2)',
                          borderTopColor: 'var(--color-maroon)',
                          width: '0.875rem',
                          height: '0.875rem',
                        }}
                      ></span>{' '}
                      Buscando...
                    </>
                  ) : (
                    datosOperativos.ruta
                  )}
                </p>
              </div>
              {/* Campo de búsqueda de unidad */}
              <div className="data-item data-item--compact">
                <h3 className="data-item__label">Número de Tarjetón</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <input
                    type="text"
                    className="input-group__field"
                    value={tarjetonBusqueda}
                    onChange={(e) => {
                      setTarjetonBusqueda(e.target.value);
                      if (mensajeBusqueda) setMensajeBusqueda('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        buscarUnidadPorInput();
                      }
                    }}
                    placeholder="Escribe el número de tarjetón"
                    style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0, height: '32px', width: '55%' }}
                  />
                  <button
                    type="button"
                    onClick={buscarUnidadPorInput}
                    style={{
                      backgroundColor: '#6b1d33',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.35rem 0.75rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Buscar
                  </button>
                </div>
                <p
                  style={{
                    marginTop: '0.35rem',
                    fontSize: '0.8rem',
                    color: mensajeBusqueda ? '#6b1d33' : '#6b7280',
                    opacity: cargandoDatos ? 0.8 : 1,
                  }}
                >
                  {mensajeBusqueda ? (
                    mensajeBusqueda
                  ) : cargandoDatos ? (
                    'Buscando unidad...'
                  ) : (
                    datosOperativos.tarjeton ? `Tarjetón actual: ${datosOperativos.tarjeton}` : 'No asignado'
                  )}
                </p>
              </div>

              {/* Nuevos campos - Fallas */}
              {corridasSeleccionadas === '' && (
                <div className="data-item">
                  <h3 className="data-item__label">Fallas (tipo)</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input
                      type="text"
                      className="input-group__field"
                      maxLength="50"
                      placeholder="Escribe el tipo de falla..."
                      value={fallaTexto}
                      onChange={(e) => setFallaTexto(e.target.value)}
                      style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0, height: '32px' }}
                    />
                    {fallaTexto !== '' && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={handleSaveAdicional}
                          title="Guardar"
                          style={{
                            background: 'transparent',
                            color: '#16a34a',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                          }}
                        >
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelAdicional}
                          title="Cancelar"
                          style={{
                            background: 'transparent',
                            color: '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                          }}
                        >
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nuevos campos - Corridas y Ciclos en un solo contenedor */}
              {fallaTexto === '' && (
                <div className="data-item data-item--compact" style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 className="data-item__label">Corridas</h3>
                    <div style={{ marginTop: '0.25rem' }}>
                      <CustomDropdown
                        options={[...Array(14)].map((_, i) => i + 1)}
                        value={corridasSeleccionadas}
                        onChange={setCorridasSeleccionadas}
                        placeholder="Seleccione..."
                      />
                    </div>
                  </div>

                  {corridasSeleccionadas !== '' && (
                    <div style={{ flex: 1 }}>
                      <h3 className="data-item__label">Ciclo</h3>
                      <div style={{ marginTop: '0.25rem' }}>
                        <CustomDropdown
                          options={Array.from({ length: 10 }, (_, i) => {
                            const val = 0.5 + i * 0.5;
                            const whole = Math.floor(val);
                            if (val === whole) return whole.toString();
                            if (whole === 0) return '1/2';
                            return `${whole} 1/2`;
                          })}
                          value={cicloSeleccionado}
                          onChange={setCicloSeleccionado}
                          placeholder="N/A"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Motivo si Corridas está activo */}
              {corridasSeleccionadas !== '' && (
                <div className="data-item">
                  <h3 className="data-item__label">Motivo *</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input
                      type="text"
                      className="input-group__field"
                      maxLength="25"
                      placeholder="Obligatorio..."
                      value={motivoTexto}
                      onChange={(e) => setMotivoTexto(e.target.value)}
                      style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0, height: '32px' }}
                    />
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={handleSaveAdicional}
                        disabled={!motivoTexto.trim()}
                        title="Guardar"
                        style={{
                          background: 'transparent',
                          color: !motivoTexto.trim() ? '#9ca3af' : '#16a34a',
                          border: 'none',
                          cursor: !motivoTexto.trim() ? 'not-allowed' : 'pointer',
                          padding: 0,
                          display: 'flex',
                        }}
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelAdicional}
                        title="Cancelar"
                        style={{
                          background: 'transparent',
                          color: '#ef4444',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                        }}
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="info-panel__placeholder">
              <p>Despliega el botón "Opción" para seleccionar una unidad y ver los detalles de inspección.</p>
            </div>
          )}
        </div>

        {selectedOption && (
          <div className="zones-section">
            <div className="zones-section__header">
              <h2 className="zones-section__eyebrow">Áreas de Inspección</h2>
              <h1 className="zones-section__title">Seleccione la zona a reportar</h1>
              <p className="zones-section__subtitle">Toque una imagen para abrir el formulario de reporte de esa zona del vehículo</p>
            </div>

            <div className="zones-grid">
              <button onClick={() => handleZoneClick('Costado Izquierdo')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.lateral} alt="Costado Izquierdo" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title">
                    <span className="zone-card__arrow">←</span> Costado Izquierdo
                  </div>
                  <p className="zone-card__description">Vista lateral izquierda del vehículo</p>
                </div>
              </button>

              <button onClick={() => handleZoneClick('Costado Derecho')} className="zone-card">
                <div className="zone-card__image-container">
                  <img
                    src={configActual.imagenesZonas.lateral}
                    alt="Costado Derecho"
                    className="zone-card__image zone-card__image--flipped"
                  />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title">
                    <span className="zone-card__arrow">→</span> Costado Derecho
                  </div>
                  <p className="zone-card__description">Vista lateral derecha del vehículo</p>
                </div>
              </button>

              <button onClick={() => handleZoneClick('Frente')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.frente} alt="Frente" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title">
                    <span className="zone-card__arrow">↑</span> Frente
                  </div>
                  <p className="zone-card__description">Vista frontal del vehículo</p>
                </div>
              </button>

              <button onClick={() => handleZoneClick('Parte Trasera')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.trasera} alt="Parte Trasera" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title">
                    <span className="zone-card__arrow">↓</span> Parte Trasera
                  </div>
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