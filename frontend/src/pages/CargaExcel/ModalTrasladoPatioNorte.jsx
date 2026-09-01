import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

export default function ModalTrasladoPatioNorte({ isOpen, onClose, previewData, logoUrl }) {
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!isOpen) return null;

  // Filtrar las unidades que tienen el check de PATIO_NORTE activo
  const unidadesPatioNorte = previewData.filter(fila => fila.PATIO_NORTE);
  // Extraer los nombres de los conductores
  const conductores = unidadesPatioNorte
    .filter(fila => fila.NOMBRE_CONDUCTOR && fila.NOMBRE_CONDUCTOR.trim() !== '')
    .map(fila => ({
      nombre: fila.NOMBRE_CONDUCTOR,
      unidadOrigen: fila.ECONOMICO
    }));

  const handleGenerarPDF = async () => {
    if (!unidadSeleccionada) {
      Swal.fire({
        icon: 'warning',
        title: 'Unidad no seleccionada',
        text: 'Por favor selecciona la unidad de traslado.',
        confirmButtonColor: '#6b1d33'
      });
      return;
    }

    if (conductores.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin conductores',
        text: 'No hay conductores marcados con traslado a Patio Norte.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Colores corporativos (asumiendo los del sistema)
    const vino = [107, 29, 51];
    const dorado = [197, 160, 89];

    // Encabezado del PDF
    if (logoUrl) {
      try {
        doc.addImage(logoUrl, 'PNG', 14, 10, 40, 15);
      } catch (e) {
        console.warn('No se pudo cargar el logo', e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...vino);
    doc.text('REPORTE DE TRASLADO A PATIO NORTE', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Fecha: ${fecha}`, 14, 35);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Unidad de Traslado Designada: ECO ${unidadSeleccionada}`, 14, 45);

    // Tabla de conductores
    const columnas = ['#', 'Nombre del Conductor', 'Unidad Asignada'];
    const filas = conductores.map((c, i) => [i + 1, c.nombre, c.unidadOrigen || 'N/A']);

    autoTable(doc, {
      head: [columnas],
      body: filas,
      startY: 55,
      styles: {
        fontSize: 10,
        cellPadding: 4,
        valign: 'middle'
      },
      headStyles: {
        fillColor: vino,
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        halign: 'center',
        textColor: 40
      },
      columnStyles: {
        1: { halign: 'left' } // Nombre del conductor alineado a la izquierda
      }
    });

    doc.save(`Traslado_Patio_Norte_${fecha.replace(/\s+/g, '_')}.pdf`);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '8px',
        width: '500px', maxWidth: '90%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#6b1d33', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Traslado a Patio Norte
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#4a5568' }}>
            Selecciona la unidad encargada del traslado:
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '4px',
                border: '1px solid #cbd5e0', fontSize: '1rem', color: '#2d3748',
                background: 'white', cursor: 'pointer', display: 'flex', 
                justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <span>{unidadSeleccionada ? `Unidad ECO ${unidadSeleccionada}` : '-- Selecciona una unidad --'}</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
            
            {isDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, 
                background: 'white', border: '1px solid #cbd5e0', 
                borderRadius: '4px', marginTop: '4px', zIndex: 10,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden'
              }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Buscar unidad..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    style={{
                      width: '100%', padding: '0.5rem', borderRadius: '4px',
                      border: '1px solid #cbd5e0', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
                <ul style={{ maxHeight: '200px', overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0 }}>
                  {(() => {
                    const filtradas = previewData
                      .filter(fila => fila.ECONOMICO)
                      .filter(fila => {
                        const estatus = (fila.ESTATUS || '').toLowerCase();
                        return estatus !== 'mantenimiento' && estatus !== 'reserva';
                      })
                      .filter(fila => String(fila.ECONOMICO).toLowerCase().includes(busqueda.toLowerCase()))
                      .sort((a, b) => String(a.ECONOMICO).localeCompare(String(b.ECONOMICO), undefined, { numeric: true }));

                    if (filtradas.length === 0) {
                      return <li style={{ padding: '0.75rem', color: '#a0aec0', textAlign: 'center', fontSize: '0.9rem' }}>No se encontraron unidades</li>;
                    }

                    return filtradas.map((fila, idx) => (
                      <li 
                        key={idx} 
                        onClick={() => {
                          setUnidadSeleccionada(fila.ECONOMICO);
                          setIsDropdownOpen(false);
                          setBusqueda('');
                        }}
                        style={{
                          padding: '0.75rem', cursor: 'pointer', fontSize: '0.95rem', color: '#2d3748',
                          background: unidadSeleccionada === fila.ECONOMICO ? '#edf2f7' : 'transparent',
                          borderBottom: '1px solid #edf2f7'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#edf2f7'}
                        onMouseOut={(e) => e.currentTarget.style.background = unidadSeleccionada === fila.ECONOMICO ? '#edf2f7' : 'transparent'}
                      >
                        Unidad ECO {fila.ECONOMICO}
                      </li>
                    ));
                  })()}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#4a5568', borderBottom: '2px solid #c5a059', paddingBottom: '0.5rem' }}>
            Conductores a trasladar ({conductores.length})
          </h3>
          <ul style={{ maxHeight: '200px', overflowY: 'auto', paddingLeft: '1.5rem', margin: '1rem 0' }}>
            {conductores.length > 0 ? (
              conductores.map((c, i) => (
                <li key={i} style={{ marginBottom: '0.5rem', color: '#2d3748' }}>
                  <strong>{c.nombre}</strong> <span style={{ color: '#718096', fontSize: '0.9em' }}>(ECO {c.unidadOrigen})</span>
                </li>
              ))
            ) : (
              <li style={{ color: '#a0aec0', fontStyle: 'italic' }}>No hay conductores seleccionados en la tabla.</li>
            )}
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem', border: '1px solid #cbd5e0',
              background: 'white', color: '#4a5568', borderRadius: '4px',
              cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleGenerarPDF}
            style={{
              padding: '0.75rem 1.5rem', border: 'none',
              background: '#c5a059', color: 'white', borderRadius: '4px',
              cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center'
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
