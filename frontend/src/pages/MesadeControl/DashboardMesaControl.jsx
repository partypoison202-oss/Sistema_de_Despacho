import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { transportModules } from '../../config/transportModules';
import '../Mantenimiento/Mantenimiento.css';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalPrefetch } from '../../hooks/useGlobalPrefetch';
import ModalMonitoreoConductores from './ModalMonitoreoConductores';
import ModalProgramacionApertura from './ModalProgramacionApertura';

export default function DashboardMesaControl() {
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const [modalMonitoreoOpen, setModalMonitoreoOpen] = useState(false);
  const [modalAperturaOpen, setModalAperturaOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useGlobalPrefetch();

  const normalizarNumeroEco = (valor) => {
    const digitos = String(valor ?? '').trim().toUpperCase().match(/\d+/)?.[0] ?? '';
    return digitos.padStart(3, '0');
  };

  const handleBuscarUnidad = async (event) => {
    event?.preventDefault();

    const eco = normalizarNumeroEco(busquedaEco);
    if (!eco || eco === '000') {
      Swal.fire({
        icon: 'warning',
        title: 'Ingrese un número económico',
        text: 'Escriba el número de la unidad que desea buscar.',
        confirmButtonColor: '#601a2a',
      });
      return;
    }

    const allCached = transportModules.every(m => queryClient.getQueryData(['unidades-list-mesacontrol', m.id])?.length > 0);
    if (!allCached) setBuscandoUnidad(true);

    try {
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const resultados = await Promise.all(
        transportModules.map(async (modulo) => {
          try {
            const cachedData = queryClient.getQueryData(['unidades-list-mesacontrol', modulo.id]);
            let unidades = cachedData || [];

            if (unidades.length === 0) {
              const respuesta = await fetch(`${API_BASE}/api/unidades/listar/${modulo.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (respuesta.ok) {
                const datos = await respuesta.json();
                unidades = Array.isArray(datos) ? datos : [];
              }
            }
            const unidadEncontrada = unidades.find((unidad) => {
              const valorEco = unidad.numero_eco !== undefined ? unidad.numero_eco : unidad.eco;
              const numeroEcoUnidad = normalizarNumeroEco(valorEco ?? '');
              return numeroEcoUnidad === eco;
            });

            return unidadEncontrada ? { modulo, unidad: unidadEncontrada } : null;
          } catch (error) {
            console.error(`Error al consultar ${modulo.id}:`, error);
            return null;
          }
        })
      );

      const coincidencia = resultados.find(Boolean);
      if (coincidencia) {
        navigate(`/mesa-control/${coincidencia.modulo.id}?eco=${eco}`);
        return;
      }

      Swal.fire({
        icon: 'info',
        title: 'No se encontró la unidad',
        text: `No existe una unidad con el número económico ${eco}.`,
        confirmButtonColor: '#601a2a',
      });
    } catch (error) {
      console.error('Error al buscar la unidad:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo completar la búsqueda en este momento.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setBuscandoUnidad(false);
    }
  };

  // Conteo de unidades (opcional, puedes mantenerlo)
  const fetchConteos = async () => {
    const response = await fetch(`${API_BASE}/api/despacho/conteo-unidades`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
      },
    });
    if (!response.ok) throw new Error('Error de conexion');
    return response.json();
  };

  const { data: conteos = {}, isLoading: cargando } = useQuery({
    queryKey: ['conteo-unidades-global'],
    queryFn: fetchConteos,
    refetchInterval: 10000, // Cada 10s – pantalla crítica del despachador
  });

  return (
    <div className="mantenimiento"> {/* Usamos la misma clase que Mantenimiento para heredar estilos */}
      <Header />
      <main className="mantenimiento__main">
        <p className="page-eyebrow">MONITOREO Y GESTIÓN</p>
        <h1 className="page-title">MESA DE CONTROL</h1>
        <p className="mantenimiento__subtitle text-gray-500 mb-4">
          Toque la imagen del transporte para gestionar la unidad
        </p>
          
        <div className="flex justify-center gap-6 mb-8">
          <button
            onClick={() => setModalMonitoreoOpen(true)}
            className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full border border-slate-200 transition-all duration-300"
            style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6b1d33';
              e.currentTarget.style.background = '#fdf8f9';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 29, 51, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            }}
            title="Ver pantalla general de conductores y relevos del día"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b1d33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span style={{color: '#1e293b', fontWeight: '500', fontSize: '0.95rem'}}>Conductores y Relevos</span>
          </button>

          <button
            onClick={() => setModalAperturaOpen(true)}
            className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full border border-slate-200 transition-all duration-300"
            style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6b1d33';
              e.currentTarget.style.background = '#fdf8f9';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 29, 51, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            }}
            title="Ver programación de apertura (Todas las tecnologías)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b1d33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{color: '#1e293b', fontWeight: '500', fontSize: '0.95rem'}}>Programación de Apertura</span>
          </button>
        </div>

        <form className="mantenimiento__search" onSubmit={handleBuscarUnidad}>
          <input
            type="text"
            value={busquedaEco}
            onChange={(event) => setBusquedaEco(event.target.value.replace(/\D/g, '').substring(0, 3))}
            placeholder="Buscar por número económico"
            className="mantenimiento__search-input text-gray-900 placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="mantenimiento__search-button"
            disabled={!busquedaEco || buscandoUnidad || parseInt(busquedaEco, 10) === 0}
          >
            {buscandoUnidad ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        <div className="mantenimiento__grid">
          {transportModules.map((modulo) => (
            <TransportCard
              key={modulo.id}
              title={modulo.title}
              subtitle={modulo.subtitle}
              image={modulo.image}
              route={`/mesa-control/${modulo.id}`}
              cantidad={conteos[modulo.id] || 0}
              cargando={cargando}
            />
          ))}
        </div>
      </main>

      <ModalMonitoreoConductores
        isOpen={modalMonitoreoOpen}
        onClose={() => setModalMonitoreoOpen(false)}
        tipoTransporte="TODOS"
        configActual={{ id: 'general', title: 'Todas las Tecnologías', color: '#6b1d33' }}
        onSelectUnit={(eco) => {
          setBusquedaEco(eco);
          setModalMonitoreoOpen(false);
          handleBuscarUnidad({ preventDefault: () => {} });
        }}
      />

      <ModalProgramacionApertura
        isOpen={modalAperturaOpen}
        onClose={() => setModalAperturaOpen(false)}
        tipoTransporte="TODOS"
        configActual={{ id: 'general', title: 'Todas las Tecnologías', color: '#6b1d33' }}
        onSelectUnit={(eco) => {
          setBusquedaEco(eco);
          setModalAperturaOpen(false);
          handleBuscarUnidad({ preventDefault: () => {} });
        }}
      />
    </div>
  );
}