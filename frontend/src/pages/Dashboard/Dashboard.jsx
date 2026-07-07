// src/pages/Dashboard/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { transportModules } from '../../config/transportModules';
import './Dashboard.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import PlantillaReporteGeneral from '../../components/Reportes/PlantillaReporteGeneral';
import PlantillaReporteUnidades from '../../components/Reportes/PlantillaReporteUnidades';
import API_BASE from '../../config/api';


export default function Dashboard() {
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [reporteDataRutas, setReporteDataRutas] = useState(null);
  const [reporteDataUnidades, setReporteDataUnidades] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const navigate = useNavigate();
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);
  const navigate = useNavigate();

  // Referencias para los elementos a capturar
  const reporteRutasRef = useRef(null);
  const reporteUnidadesRef = useRef(null);

  // Función para generar PDF a partir de una referencia
  const generarPDF = (elementRef, nombreArchivo) => {
    return new Promise((resolve, reject) => {
      const element = elementRef.current;
      if (!element) {
        reject(new Error(`Elemento ${nombreArchivo} no encontrado`));
        return;
      }
      html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#f5f5f5',
        windowWidth: 1123,
        windowHeight: 795,
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
          pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
          pdf.save(`${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.pdf`);
          resolve();
        })
        .catch(reject);
    });
  };

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

    setBuscandoUnidad(true);
    try {
      const token = localStorage.getItem('token');
      const resultados = await Promise.all(
        transportModules.map(async (modulo) => {
          try {
            const respuesta = await fetch(`${API_BASE}/api/unidades/listar/${modulo.id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (!respuesta.ok) return null;

            const datos = await respuesta.json();
            const unidades = Array.isArray(datos) ? datos : [];
            const unidadEncontrada = unidades.find((unidad) => {
              const numeroEcoUnidad = normalizarNumeroEco(unidad.numero_eco ?? '');
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
        navigate(`/transporte/${coincidencia.modulo.id}?eco=${eco}`);
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

  const handleGenerarReporte = async () => {
    setIsGenerating(true);
    const token = localStorage.getItem('token');

    try {
      // Obtener ambos reportes en paralelo
      const [respRutas, respUnidades] = await Promise.all([
        fetch(`${API_BASE}/api/despacho/reporte-general`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE}/api/despacho/reporte-unidades`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!respRutas.ok || !respUnidades.ok) {
        let errorMsg = 'Error al obtener los datos';
        if (!respRutas.ok) {
          const errData = await respRutas.json().catch(() => ({}));
          errorMsg = errData.error || errorMsg;
        } else {
          const errData = await respUnidades.json().catch(() => ({}));
          errorMsg = errData.error || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const dataRutas = await respRutas.json();
      const dataUnidades = await respUnidades.json();

      setReporteDataRutas(dataRutas);
      setReporteDataUnidades(dataUnidades);
      setMostrarReporte(true);

      // Esperar a que React renderice los componentes ocultos
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Generar PDF de rutas
      await generarPDF(reporteRutasRef, 'Reporte_Rutas');

      // Generar PDF de unidades
      await generarPDF(reporteUnidadesRef, 'Reporte_Unidades');

      Swal.fire({
        icon: 'success',
        title: '¡Reportes Generados!',
        text: 'Se han descargado los dos reportes correctamente.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });

    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Ocurrió un error al generar los reportes.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setMostrarReporte(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const fetchConteos = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_BASE}/api/despacho/conteo-unidades`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setConteos(data);
        }
      } catch (error) {
        console.error('Error de conexión:', error);
      } finally {
        setCargando(false);
      }
    };

    fetchConteos();
  }, []);

  return (
    <>
      <div className="dashboard">
        <Header />
        <main className="dashboard__main">
          <p className="dashboard__eyebrow text-[#c5a059] dark:text-[#c5a059]">Seleccione el tipo de transporte</p>
          <h1 className="dashboard__title text-gray-900 dark:text-white">Flota de Unidades</h1>
          <p className="dashboard__subtitle text-gray-500 dark:text-gray-300">
            Toque la imagen del transporte para comenzar el registro
          </p>

          <form className="dashboard__search" onSubmit={handleBuscarUnidad}>
            <input
              type="text"
              value={busquedaEco}
              onChange={(event) => setBusquedaEco(event.target.value)}
              placeholder="Buscar por número económico"
              className="dashboard__search-input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button type="submit" className="dashboard__search-button" disabled={buscandoUnidad}>
              {buscandoUnidad ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          <div className="dashboard__grid">
            {transportModules.map((modulo) => (
              <TransportCard
                key={modulo.id}
                title={modulo.title}
                subtitle={modulo.subtitle}
                image={modulo.image}
                route={`/transporte/${modulo.id}`}
                cantidad={conteos[modulo.id] || 0}
                cargando={cargando}
              />
            ))}
          </div>

          {/* Botón para generar reportes */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              onClick={handleGenerarReporte}
              disabled={isGenerating}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#6b1d33',
                color: 'var(--tw-color-white)',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.7 : 1,
              }}
            >
              {isGenerating ? 'Generando reportes...' : 'Generar Reportes PDF'}
            </button>
          </div>

          {/* Componentes ocultos para generar PDF (fuera de pantalla) */}
          {mostrarReporte && reporteDataRutas && (
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
              <PlantillaReporteGeneral data={reporteDataRutas} ref={reporteRutasRef} />
            </div>
          )}
          {mostrarReporte && reporteDataUnidades && (
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
              <PlantillaReporteUnidades data={reporteDataUnidades} ref={reporteUnidadesRef} />
            </div>
          )}
        </main>
      </div>
    </>
  );
}