// src/pages/Encierro/DashboardEncierro.jsx
import React, { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { encierroModules } from '../../config/encierroModules';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import PlantillaReporteGeneral from '../../components/Reportes/PlantillaReporteGeneral';
import PlantillaReporteUnidades from '../../components/Reportes/PlantillaReporteUnidades';
import '../Dashboard/Dashboard.css';
import API_BASE from '../../config/api';


export default function DashboardEncierro() {
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [reporteDataRutas, setReporteDataRutas] = useState(null);
  const [reporteDataUnidades, setReporteDataUnidades] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGenerarReporte = async () => {
    setIsGenerating(true);
    const token = localStorage.getItem('token');

    try {
      // Obtener ambos reportes
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
        // Intentar obtener mensaje de error del servidor
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
      await generarPDF(reporteRutasRef, 'Reporte_Rutas_Encierro');
      
      // Generar PDF de unidades
      await generarPDF(reporteUnidadesRef, 'Reporte_Unidades_Encierro');

      Swal.fire({
        icon: 'success',
        title: '¡Reportes Generados!',
        text: 'Los reportes se han generado y descargado exitosamente.',
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
        title: 'Error de conexión',
        text: error.message || 'No se pudieron generar los reportes.',
        confirmButtonColor: '#601a2a'
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
            Toque la imagen del transporte para comenzar el registro de encierro
          </p>

          <div className="dashboard__grid">
            {encierroModules.map((module) => {
              const cantidad = conteos[module.id] || 0;
              return (
                <TransportCard
                  key={module.id}
                  title={module.title}
                  subtitle={module.subtitle}
                  image={module.image}
                  route={module.route}
                  cantidad={cantidad}
                  cargando={cargando}
                />
              );
            })}
          </div>

          <div className="dashboard__actions">
            <button className="btn-reporte" onClick={handleGenerarReporte} disabled={isGenerating}>
              {isGenerating ? (
                <><span className="spinner"></span> Generando PDF...</>
              ) : (
                'Reporte General'
              )}
            </button>
          </div>
        </main>
      </div>

      {mostrarReporte && reporteDataRutas && reporteDataUnidades && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: '-9999px',
            zIndex: -1,
          }}
        >
          <div ref={reporteRutasRef}>
            <PlantillaReporteGeneral data={reporteDataRutas} />
          </div>
          <div ref={reporteUnidadesRef}>
            <PlantillaReporteUnidades data={reporteDataUnidades} />
          </div>
        </div>
      )}
    </>
  );
}
