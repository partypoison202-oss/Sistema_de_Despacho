// src/pages/Mantenimiento/Mantenimiento.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { transportModules } from '../../config/transportModules';
import './Mantenimiento.css';
import '../CentroControl/CentroControl.css';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ReporteCombustiblePDF from './components/ReporteCombustiblePDF';
import { useGlobalPrefetch } from '../../hooks/useGlobalPrefetch';

export default function Mantenimiento() {
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isInspeccion = location.pathname.startsWith('/carga-combustible');

  // Estado para la generación del PDF
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfTotales, setPdfTotales] = useState(null);
  const pdfRef = useRef(null);
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

    const allCached = transportModules.every(m => queryClient.getQueryData(['unidades-list', m.id])?.length > 0);
    if (!allCached) setBuscandoUnidad(true);

    try {
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const resultados = await Promise.all(
        transportModules.map(async (modulo) => {
          try {
            // Intento 1: Buscar en memoria (caché ultra rápido)
            const cachedData = queryClient.getQueryData(['unidades-list', modulo.id]);
            let unidades = cachedData || [];

            // Intento 2: Si no hay en caché, ir a red (fallback)
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
        // Ajusta la ruta destino según cómo manejes el mantenimiento/inspección por unidad
        navigate(`${isInspeccion ? '/carga-combustible' : '/mantenimiento'}/${coincidencia.modulo.id}?eco=${eco}`);
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
    refetchInterval: 30000, // Actualiza silenciosamente cada 30 segundos
  });

  const handleGenerarPDF = async () => {
    try {
      setGenerandoPDF(true);
      const res = await fetch(`${API_BASE}/api/mantenimiento/reporte-combustible`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
        },
      });
      if (!res.ok) throw new Error('Error al obtener datos');
      const json = await res.json();
      
      if (json.status === 'success') {
        setPdfData(json.data);
        setPdfTotales(json.totales);
        
        // Esperar un breve instante para que React renderice el componente oculto
        setTimeout(async () => {
          if (pdfRef.current) {
            const canvas = await html2canvas(pdfRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
              orientation: 'landscape',
              unit: 'px',
              format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            const todayStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
            pdf.save(`Reporte_Combustible_${todayStr}.pdf`);
          }
          setPdfData(null);
          setPdfTotales(null);
          setGenerandoPDF(false);
          Swal.fire({
            title: '¡Reporte Generado!',
            text: 'El PDF se ha descargado correctamente.',
            icon: 'success',
            confirmButtonColor: '#6b1d33'
          });
        }, 500);
      } else {
        throw new Error(json.message || 'Error desconocido');
      }
    } catch (e) {
      console.error(e);
      setGenerandoPDF(false);
      Swal.fire('Error', 'No se pudo generar el reporte', 'error');
    }
  };

  return (
    <>
      <div className="mantenimiento">
        <Header />
        <main className="mantenimiento__main">
          <p className="centro-eyebrow text-[#c5a059] dark:text-[#c5a059]">Seleccione el tipo de transporte</p>
          <h1 className="centro-title">
            {isInspeccion ? 'CARGA DE COMBUSTIBLE' : 'MANTENIMIENTO PARQUE VEHICULAR'}
          </h1>
          <p className="centro-subtitle">
            {isInspeccion
              ? 'Toque la imagen del transporte para comenzar la carga de combustible'
              : 'Toque la imagen del transporte para comenzar el mantenimiento'}
          </p>

          <form className="mantenimiento__search mt-16" onSubmit={handleBuscarUnidad}>
            <input
              type="text"
              value={busquedaEco}
              onChange={(event) => setBusquedaEco(event.target.value.replace(/\D/g, '').substring(0, 3))}
              placeholder="Buscar por número económico"
              className="mantenimiento__search-input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                route={`${isInspeccion ? '/carga-combustible' : '/mantenimiento'}/${modulo.id}`}
                cantidad={conteos[modulo.id] || 0}
                cargando={cargando}
              />
            ))}
          </div>
          
          {isInspeccion && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', marginBottom: '2rem' }}>
              <button 
                onClick={handleGenerarPDF}
                disabled={generandoPDF}
                style={{ 
                  background: '#6b1d33', 
                  color: '#fff', 
                  padding: '12px 24px', 
                  borderRadius: '5px', 
                  fontWeight: 'bold',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: generandoPDF ? 'not-allowed' : 'pointer',
                  opacity: generandoPDF ? 0.7 : 1,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              >
                {generandoPDF ? 'Generando Reporte...' : '📄 Generar Reporte PDF'}
              </button>
            </div>
          )}

          <ReporteCombustiblePDF ref={pdfRef} data={pdfData} totales={pdfTotales} />
        </main>
      </div>
    </>
  );
}