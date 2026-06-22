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

export default function Dashboard() {
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [reporteData, setReporteData] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerarReporte = async () => {
    setIsGenerating(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/despacho/reporte-general', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Error al obtener datos');

      const data = await response.json();
      setReporteData(data);
      setMostrarReporte(true);

      setTimeout(async () => {
        try {
          const el = document.getElementById('reporte-pdf');
          if (!el) throw new Error('Elemento no encontrado');

          const canvas = await html2canvas(el, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#f5f5f5',
            windowWidth: 1123,
            windowHeight: 795,
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
          pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
          pdf.save(`Reporte_STM_${new Date().toISOString().slice(0, 10)}.pdf`);

          Swal.fire({
            icon: 'success',
            title: '¡Reporte Generado!',
            text: 'El reporte general se ha generado y descargado exitosamente.',
            confirmButtonColor: '#c5a059'
          });

        } catch (err) {
          console.error('Error al generar PDF:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al generar el PDF.',
            confirmButtonColor: '#601a2a'
          });
        } finally {
          setMostrarReporte(false);
          setIsGenerating(false);
        }
      }, 600);

    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo generar el reporte.',
        confirmButtonColor: '#601a2a'
      });
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
                <><span className="spinner"></span> Generando PDF...</>
              ) : (
                'Reporte General'
              )}
            </button>
          </div>
        </main>
      </div>

      {/* Plantilla oculta para capturar con html2canvas */}
      {mostrarReporte && reporteData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: '-9999px',
            zIndex: -1,
          }}
        >
          <PlantillaReporteGeneral data={reporteData} />
        </div>
      )}
    </>
  );
}