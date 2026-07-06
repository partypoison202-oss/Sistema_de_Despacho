// src/pages/Unidades/DetalleUnidad.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transportModules } from '../../config/transportModules';
import Header from '../../components/Header/Header';
import UnitSelector from './componentsdetalleunidad/UnitSelector';
import UnitInfoPanel from './componentsdetalleunidad/UnitInfoPanel';

import './DetalleUnidad.css';
import API_BASE from '../../config/api';


export default function DetalleUnidad() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();

  const configActual = transportModules.find((m) => m.id === tipoTransporte);
  if (!configActual) {
    return (
      <div className="p-8">
        Transporte no encontrado. <button onClick={() => navigate('/')}>Volver</button>
      </div>
    );
  }

  // Estado para controlar qué selector de estado está abierto (operacion, mantenimiento, reserva o null)
  const [openDropdown, setOpenDropdown] = useState(null);

  // Estado global de la unidad seleccionada
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...',
    tarjeton: '',
    corrida: '',
    horaSalida: '',
  });
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [tarjetonBusqueda, setTarjetonBusqueda] = useState('');
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
  const [unidadesList, setUnidadesList] = useState([]);
  const [cargandoUnidades, setCargandoUnidades] = useState(true);

  // Estado para fallas (el único campo adicional que se mantiene)
  const [fallaTexto, setFallaTexto] = useState('');

  // Utilidades
  const getToken = () => localStorage.getItem('token');
  const formatearEco = (valor) => `ECO${String(valor ?? '').padStart(3, '0')}`;

  // Cargar lista de unidades (incluyendo estado)
  useEffect(() => {
    const fetchUnidades = async () => {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const respuesta = await fetch(
          `${API_BASE}/api/unidades/listar/${tipoTransporte}`,
          {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }
        );
        if (respuesta.ok) {
          const datos = await respuesta.json();
          const catalogo = (Array.isArray(datos) ? datos : []).map((u) => ({
            eco: String(u.numero_eco ?? '').padStart(3, '0'),
            tarjeton: String(u.tarjeton ?? '').trim(),
            display: formatearEco(u.numero_eco),
            estado: u.estatus || 'operacion',
          }));
          setUnidadesList(catalogo);
        } else if (respuesta.status === 401) {
          navigate('/login');
        } else {
          console.error('Error al obtener lista de unidades:', respuesta.status);
        }
      } catch (error) {
        console.error('Error de conexión al obtener lista de unidades', error);
      } finally {
        setCargandoUnidades(false);
      }
    };
    fetchUnidades();
  }, [tipoTransporte, navigate]);

  const unidadesPorEstado = (estado) =>
    unidadesList.filter((u) => u.estado === estado);

  // Seleccionar unidad (desde dropdown o búsqueda)
  const handleSelectUnit = async (unidad) => {
    const unidadSeleccionada =
      typeof unidad === 'object' && unidad !== null
        ? unidad
        : unidadesList.find(
            (item) =>
              item.display === unidad ||
              item.eco === unidad ||
              String(item.tarjeton ?? '').trim() === String(unidad ?? '').trim()
          ) || null;

    if (!unidadSeleccionada) {
      console.warn('Unidad no encontrada:', unidad);
      return;
    }

    const ecoSeleccionado = unidadSeleccionada.display;
    setSelectedOption(ecoSeleccionado);
    setSelectedEstado(unidadSeleccionada.estado);
    setTarjetonBusqueda(unidadSeleccionada.tarjeton || '');
    setCargandoDatos(true);
    setMensajeBusqueda('');

    // Cerrar todos los dropdowns
    setOpenDropdown(null);

    const numeroLimpio = String(unidadSeleccionada.eco).padStart(3, '0');

    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      const url = `${API_BASE}/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
      const respuesta = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const resultado = await respuesta.json();
      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos({
          conductor: resultado.conductor || 'No reportado hoy',
          ruta: resultado.ruta || 'Sin ruta',
          tarjeton: resultado.tarjeton || '',
          corrida: resultado.corridas || '',
          horaSalida: resultado.hora_salida || '',
        });
        setFallaTexto(resultado.falla || '');
        setSelectedEstado(resultado.estatus || unidadSeleccionada.estado || 'operacion');
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta',
          tarjeton: '',
          corrida: '',
          horaSalida: '',
        });
        setFallaTexto('');
      }
    } catch (error) {
      console.error('Error en la petición:', error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener',
        tarjeton: '',
        corrida: '',
        horaSalida: '',
      });
    } finally {
      setCargandoDatos(false);
    }
  };

  // Búsqueda por tarjetón (desde el panel de información)
  const buscarUnidadPorInput = async () => {
    const valor = String(tarjetonBusqueda ?? '').trim();
    setMensajeBusqueda('');
    if (!valor) {
      setMensajeBusqueda('Escribe un número de tarjetón para buscar.');
      return;
    }
    let unidadEncontrada = unidadesList.find(
      (unidad) => String(unidad.tarjeton ?? '').trim() === valor
    );
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
        `${API_BASE}/api/unidades/buscar-tarjeton/${tipoTransporte}/${encodeURIComponent(valor)}`,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const resultado = await respuesta.json();
      if (respuesta.ok && resultado?.status === 'success' && resultado?.unidad) {
        const unidadRemota = {
          eco: String(resultado.unidad.numero_eco ?? '').padStart(3, '0'),
          tarjeton: String(resultado.unidad.tarjeton ?? '').trim(),
          display: formatearEco(resultado.unidad.numero_eco),
          estado: resultado.unidad.estatus || 'operacion',
        };
        setUnidadesList((prev) => {
          if (prev.some((item) => item.eco === unidadRemota.eco)) return prev;
          return [...prev, unidadRemota];
        });
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

  // Guardar falla (solo el campo de fallas)
  const handleSaveFalla = async () => {
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
      };
      const respuesta = await fetch(`${API_BASE}/api/despacho/actualizar-adicionales`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resultado = await respuesta.json();
      if (respuesta.ok && resultado.status === 'success') {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'success',
          title: '¡Falla registrada!',
          text: 'El tipo de falla se ha guardado correctamente.',
          confirmButtonColor: '#c29b53',
          timer: 2000,
        });
      } else {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: resultado.message || 'Error al guardar la falla',
          confirmButtonColor: '#601a2a',
        });
      }
    } catch (error) {
      console.error('Error al guardar falla:', error);
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error de conexión',
        confirmButtonColor: '#601a2a',
      });
    }
  };

  // Guardar tarjetón y asignar conductor automáticamente
  const handleSaveTarjeton = async (nuevoTarjeton) => {
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
        tarjeton: nuevoTarjeton,
      };
      const respuesta = await fetch(`${API_BASE}/api/despacho/actualizar-tarjeton`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resultado = await respuesta.json();
      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos((prev) => ({
          ...prev,
          tarjeton: resultado.tarjeton,
          conductor: resultado.conductor,
        }));
        setTarjetonBusqueda(resultado.tarjeton);
        
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'success',
          title: '¡Tarjetón Asignado!',
          text: `Se asignó al conductor: ${resultado.conductor}`,
          confirmButtonColor: '#cbd5e1',
          timer: 2000,
        });
      } else {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'error',
          title: 'Error de Asignación',
          text: resultado.message || 'Error al actualizar el tarjetón',
          confirmButtonColor: '#601a2a',
        });
      }
    } catch (error) {
      console.error('Error al guardar tarjetón:', error);
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor',
        confirmButtonColor: '#601a2a',
      });
    }
  };

  const handleCancelFalla = () => {
    setFallaTexto('');
  };

  const [cambiandoEstatus, setCambiandoEstatus] = useState(false);

  const handleCambiarEstatus = async (nuevoEstatus) => {
    if (!selectedOption) return;
    
    if (datosOperativos.estatus === nuevoEstatus) return;

    const Swal = (await import('sweetalert2')).default;
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

      const response = await fetch(`${API_BASE}/api/unidades/cambiar-estatus`, {
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
        
        // Actualizar la lista en memoria para mantener colores sincronizados y cambiar de lista
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
        title={selectedOption || 'Seleccione Unidad'}
        eyebrow={`${configActual.title} / Detalle de Unidad`}
        hideLogos={true}
      />
      <main className="main-content">
        {/* Selectores de estado + ficha de información agrupados en un solo panel */}
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
              <UnitInfoPanel
                selectedOption={selectedOption}
                configActual={configActual}
                datosOperativos={datosOperativos}
                cargandoDatos={cargandoDatos}
                tarjetonBusqueda={tarjetonBusqueda}
                setTarjetonBusqueda={setTarjetonBusqueda}
                mensajeBusqueda={mensajeBusqueda}
                buscarUnidadPorInput={buscarUnidadPorInput}
                fallaTexto={fallaTexto}
                setFallaTexto={setFallaTexto}
                handleSaveFalla={handleSaveFalla}
                handleCancelFalla={handleCancelFalla}
                handleSaveTarjeton={handleSaveTarjeton}
                handleCambiarEstatus={handleCambiarEstatus}
                cambiandoEstatus={cambiandoEstatus}
              />
            ) : (
              <div className="info-panel__placeholder">
                <p>Selecciona una unidad desde cualquiera de los botones de estado para ver los detalles de inspección.</p>
              </div>
            )}
          </div>
        </div>


      </main>
    </div>
  );
}