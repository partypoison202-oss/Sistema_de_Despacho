// src/pages/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { transportModules } from '../../config/transportModules';
import './Dashboard.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import PlantillaReporteGeneral from '../../components/Reportes/PlantillaReporteGeneral';
import PlantillaReporteUnidades from '../../components/Reportes/PlantillaReporteUnidades';

export default function Dashboard() {
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [reporteDataRutas, setReporteDataRutas] = useState(null);
  const [reporteDataUnidades, setReporteDataUnidades] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Función auxiliar para generar un PDF a partir de un elemento DOM
  const generarPDF = (element, nombreArchivo) => {
    return new Promise((resolve, reject) => {
      if (!element) {
        reject(new Error('Elemento no encontrado'));
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
      // Obtener ambos reportes en paralelo
      const [respRutas, respUnidades] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/despacho/reporte-general', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
        fetch('http://127.0.0.1:8000/api/despacho/reporte-unidades', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!respRutas.ok || !respUnidades.ok) {
        throw new Error('Error al obtener los datos');
      }

      const dataRutas = await respRutas.json();
      const dataUnidades = await respUnidades.json();

      setReporteDataRutas(dataRutas);
      setReporteDataUnidades(dataUnidades);
      setMostrarReporte(true);

      // Esperar a que React renderice las plantillas ocultas
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Generar PDF de rutas
      const elRutas = document.getElementById('reporte-rutas');
      await generarPDF(elRutas, 'Reporte_Rutas');

      // Generar PDF de unidades
      const elUnidades = document.getElementById('reporte-unidades');
      await generarPDF(elUnidades, 'Reporte_Unidades');

      // Todo exitoso
      Swal.fire({
        icon: 'success',
        title: '¡Reportes Generados!',
        text: 'Se han descargado los dos reportes correctamente.',
        confirmButtonColor: '#c5a059',
      });

    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al generar los reportes.',
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
        const response = await fetch('http://127.0.0.1:8000/api/despacho/conteo-unidades', {
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
          <p className="dashboard__eyebrow">Seleccione el tipo de transporte</p>
          <h1 className="dashboard__title">Flota de Unidades</h1>
          <p className="dashboard__subtitle">
            Toque la imagen del transporte para comenzar el registro
          </p>

          <div className="dashboard__grid">
            {transportModules.map((module) => {
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
                <><span className="spinner"></span> Generando PDFs...</>
              ) : (
                'Reporte General'
              )}
            </button>
          </div>
        </main>
      </div>

      {/* Plantillas ocultas para capturar con html2canvas */}
      {mostrarReporte && reporteDataRutas && reporteDataUnidades && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: '-9999px',
              zIndex: -1,
            }}
          >
            <PlantillaReporteGeneral data={reporteDataRutas} />
          </div>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: '-9999px',
              zIndex: -1,
            }}
          >
            <PlantillaReporteUnidades data={reporteDataUnidades} />
          </div>
        </>
      )}
    </>
  );
}