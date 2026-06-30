// src/pages/Encierro/DetalleUnidadEncierro.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { encierroModules } from '../../config/encierroModules';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import '../Unidades/DetalleUnidad.css';
import UnitSelector from '../Unidades/componentsdetalleunidad/UnitSelector';

export default function DetalleUnidadEncierro() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);

  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...',
    tarjeton: 'Seleccione una unidad...',
    estatus: 'operacion'
  });
  const [cambiandoEstatus, setCambiandoEstatus] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [tarjetonBusqueda, setTarjetonBusqueda] = useState('');
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
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
  const formatearEco = (valor) => `ECO${String(valor ?? '').padStart(3, '0')}`;
  const extraerNumeroEco = (valor) => {
    const texto = String(valor ?? '');
    const matchNumeros = texto.match(/\d+/);
    return matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
  };

  useEffect(() => {
    const fetchUnidades = async () => {
      const token = getToken();
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const respuesta = await fetch(
          `http://localhost:8000/api/unidades/listar/${tipoTransporte}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (respuesta.ok) {
          const datos = await respuesta.json();
          const unidadesCatalogo = (Array.isArray(datos) ? datos : []).map((u) => ({
            eco: String(u.numero_eco ?? '').padStart(3, '0'),
            tarjeton: String(u.tarjeton ?? '').trim(),
            display: `ECO${String(u.numero_eco ?? '').padStart(3, '0')}`,
            estado: String(u.estatus ?? 'operacion').toLowerCase(),
          }));
          setUnidadesList(unidadesCatalogo);
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

  const unidadesPorEstado = (estado) => unidadesList.filter((u) => u.estado === estado);

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
        navigate('/');
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
          estado: resultado.unidad.estatus || 'operacion',
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
    setSelectedEstado(unidadSeleccionada ? unidadSeleccionada.estado : null);
    setTarjetonBusqueda(unidadSeleccionada?.tarjeton || (typeof unidad === 'string' ? unidad : ''));
    setOpenDropdown(null);
    setCargandoDatos(true);
    setMensajeBusqueda('');

    const numeroLimpio = unidadSeleccionada
      ? String(unidadSeleccionada.eco).padStart(3, '0')
      : extraerNumeroEco(ecoSeleccionado);

    try {
      const token = getToken();
      if (!token) { navigate('/'); return; }

      const url = `http://localhost:8000/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
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
          ruta: resultado.ruta || 'Sin ruta',
          tarjeton: resultado.tarjeton || 'No disponible',
          estatus: resultado.estatus || unidadSeleccionada?.estado || 'operacion'
        });
        setFormEditar({
          conductor: resultado.conductor || '',
          ruta: resultado.ruta || ''
        });
        setSelectedEstado(resultado.estatus || unidadSeleccionada?.estado || 'operacion');
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta',
          tarjeton: 'No disponible',
          estatus: 'operacion'
        });
        setFormEditar({ conductor: '', ruta: '' });
      }
    } catch (error) {
      console.error('Error en la petición:', error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener',
        tarjeton: 'No disponible',
        estatus: 'operacion'
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
      const response = await fetch(`http://localhost:8000/api/despacho/actualizar`, {
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
        setDatosOperativos(prev => ({
          ...prev,
          ruta: formEditar.ruta.trim(),
          conductor: formEditar.conductor.trim()
        }));
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

  const handleCambiarEstatus = async (nuevoEstatus) => {
    if (!selectedOption) return;
    
    if (datosOperativos.estatus === nuevoEstatus) return;

    const confirmacion = await Swal.fire({
      title: '¿Cambiar Estatus?',
      text: `¿Seguro que deseas mover la unidad ${selectedOption} a ${nuevoEstatus.toUpperCase()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6b1d33',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    setCambiandoEstatus(true);
    try {
      const token = getToken();
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

      const response = await fetch(`http://localhost:8000/api/unidades/cambiar-estatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          numero_eco: numeroLimpio,
          tipo: tipoTransporte,
          estatus: nuevoEstatus
        })
      });

      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Estatus Actualizado',
          text: `La unidad ${selectedOption} ahora está en ${nuevoEstatus.toUpperCase()}`,
          confirmButtonColor: '#c5a059',
          timer: 2000,
          showConfirmButton: false
        });
        setDatosOperativos(prev => ({ ...prev, estatus: nuevoEstatus }));
        setSelectedEstado(nuevoEstatus);
        
        // Actualizar la lista en memoria si es necesario para mantener colores sincronizados y cambiar de lista
        setUnidadesList(prev => prev.map(u => {
          if (String(u.eco).padStart(3, '0') === numeroLimpio) {
            return { ...u, estado: nuevoEstatus.toLowerCase() };
          }
          return u;
        }));
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo cambiar el estatus', confirmButtonColor: '#601a2a' });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión al servidor', confirmButtonColor: '#601a2a' });
    } finally {
      setCambiandoEstatus(false);
    }
  };

  return (
    <div className="layout-container">
      <Header
        title={selectedOption || "Seleccione Unidad"}
        eyebrow={`${configActual.title} / Encierro — Detalle de Unidad`}
        hideLogos={true}
      />

      <main className="main-content">
        <div className="unit-control-panel">
          <div className="unit-control-panel__selectors">
            <UnitSelector
              isOpen={openDropdown === 'operacion'}
              setIsOpen={(open) => setOpenDropdown(open ? 'operacion' : null)}
              selectedOption={selectedOption}
              selectedEstado={selectedEstado}
              estado="operacion"
              titulo="Operación"
              unidades={unidadesPorEstado('operacion')}
              cargandoUnidades={cargandoUnidades}
              configActual={configActual}
              onSelectUnit={handleSelectUnit}
            />
            <UnitSelector
              isOpen={openDropdown === 'mantenimiento'}
              setIsOpen={(open) => setOpenDropdown(open ? 'mantenimiento' : null)}
              selectedOption={selectedOption}
              selectedEstado={selectedEstado}
              estado="mantenimiento"
              titulo="Mantenimiento"
              unidades={unidadesPorEstado('mantenimiento')}
              cargandoUnidades={cargandoUnidades}
              configActual={configActual}
              onSelectUnit={handleSelectUnit}
            />
            <UnitSelector
              isOpen={openDropdown === 'reserva'}
              setIsOpen={(open) => setOpenDropdown(open ? 'reserva' : null)}
              selectedOption={selectedOption}
              selectedEstado={selectedEstado}
              estado="reserva"
              titulo="Reserva"
              unidades={unidadesPorEstado('reserva')}
              cargandoUnidades={cargandoUnidades}
              configActual={configActual}
              onSelectUnit={handleSelectUnit}
            />
          </div>

          <div className="info-panel">
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
                  
                  {/* Editar Conductor */}
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

                  {/* Editar Ruta */}
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

                  {/* BUSCADOR POR TARJETÓN */}
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
                        placeholder="Escribe el tarjetón"
                        style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0, height: '32px' }}
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
                </div>

                {/* BLOQUE DE ESTATUS ACTUAL - TÁCTIL */}
                <div className="status-touch-block" style={{ marginTop: '1.5rem', background: '#fff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <h3 style={{ fontSize: '1rem', color: '#4a5568', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Estatus Actual
                    {cambiandoEstatus && <span className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(107,29,51,0.2)', borderTopColor: '#6b1d33', margin: 0 }}></span>}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                      { id: 'operacion', label: 'OPERACIÓN', color: '#16a34a', bgActive: '#f0fdf4', borderActive: '#bbf7d0' },
                      { id: 'reserva', label: 'RESERVA', color: '#d97706', bgActive: '#fffbeb', borderActive: '#fde68a' },
                      { id: 'mantenimiento', label: 'MANTENIMIENTO', color: '#dc2626', bgActive: '#fef2f2', borderActive: '#fecaca' }
                    ].map(st => {
                      const isActive = datosOperativos.estatus === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => handleCambiarEstatus(st.id)}
                          disabled={cambiandoEstatus}
                          style={{
                            padding: '1rem 0.5rem',
                            borderRadius: '0.5rem',
                            border: `2px solid ${isActive ? st.color : '#e2e8f0'}`,
                            backgroundColor: isActive ? st.bgActive : '#f8fafc',
                            color: isActive ? st.color : '#94a3b8',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.85rem',
                            cursor: cambiandoEstatus ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            opacity: (cambiandoEstatus && !isActive) ? 0.5 : 1
                          }}
                        >
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isActive ? st.color : '#cbd5e1' }}></div>
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="info-panel__placeholder">
                <p>Selecciona una unidad desde cualquiera de los botones de estado para comenzar el registro de encierro.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}