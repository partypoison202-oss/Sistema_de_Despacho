// src/pages/Unidades/CargaExcel.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import './CargaExcel.css';

const STORAGE_KEY = 'cargaExcel_archivoProcesado';

export default function CargaExcel() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [archivo, setArchivo] = useState(null);
  const [archivoProcesado, setArchivoProcesado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [dragActivo, setDragActivo] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Cargar archivo procesado guardado al entrar a la sección
  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) {
      try {
        setArchivoProcesado(JSON.parse(guardado));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const guardarArchivoProcesado = (nombre) => {
    const info = { nombre };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    setArchivoProcesado(info);
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      seleccionarArchivo(e.target.files[0]);
    }
  };

  const seleccionarArchivo = async (nuevoArchivo) => {
    if (archivoProcesado) {
      const resultado = await Swal.fire({
        title: '¿Reemplazar archivo?',
        html: `Ya hay un archivo procesado: <b>${archivoProcesado.nombre}</b>.<br/>¿Deseas reemplazarlo con <b>${nuevoArchivo.name}</b>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, reemplazar',
        cancelButtonText: 'Cancelar'
      });

      if (!resultado.isConfirmed) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }
    setArchivo(nuevoArchivo);
    setMensaje({ tipo: '', texto: '' });
  };

  const handleZonaClick = () => {
    if (!cargando) fileInputRef.current.click();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActivo(true);
    else if (e.type === "dragleave") setDragActivo(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivo(false);
    if (cargando) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      seleccionarArchivo(e.dataTransfer.files[0]);
    }
  };

  // Normaliza tipos mal escritos
  const normalizarTipoUnidad = (tipo) => {
    if (!tipo) return '';
    let t = tipo.toString().trim().toUpperCase();
    if (t === 'URBANUSS') return 'URBANUS';
    return t;
  };

  const handleProcesarExcel = (e) => {
    e.preventDefault();
    if (!archivo) return;

    setCargando(true);
    setMensaje({ tipo: '', texto: '' });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Convertir a matriz 2D
        const dataRaw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Buscar fila de encabezados (debe contener "TIPO")
        const indiceEncabezado = dataRaw.findIndex(fila =>
          fila.some(celda => String(celda).toUpperCase().includes('TIPO'))
        );

        if (indiceEncabezado === -1) {
          throw new Error("No se encuentra la tabla. Asegúrate de que el encabezado contenga 'TIPO DE UNIDAD'.");
        }

        const headerRow = dataRaw[indiceEncabezado];
        const colIndex = {
          tipo: -1,
          ruta: -1,
          economico: -1,
          tarjeton: -1,
          conductor: -1
        };

        headerRow.forEach((cell, idx) => {
          const cellStr = String(cell).toUpperCase().trim();
          if (cellStr.includes('TIPO')) colIndex.tipo = idx;
          else if (cellStr === 'RUTA') colIndex.ruta = idx;
          else if (cellStr === 'ECONOMICO') colIndex.economico = idx;
          else if (cellStr.includes('TARJETON')) colIndex.tarjeton = idx;
          else if (cellStr.includes('NOMBRE_CONDUCTOR') || cellStr.includes('NOMBRE')) colIndex.conductor = idx;
        });

        if (colIndex.tipo === -1 || colIndex.economico === -1) {
          throw new Error("No se encontraron las columnas 'TIPO DE UNIDAD' y/o 'ECONOMICO' en el encabezado.");
        }

        const unidadesProcesadas = [];
        for (let i = indiceEncabezado + 1; i < dataRaw.length; i++) {
          const fila = dataRaw[i];
          if (!fila || fila.length === 0) continue;

          let economico = fila[colIndex.economico]?.toString().trim() || '';
          if (economico === '') continue;

          let tipo = fila[colIndex.tipo]?.toString().trim() || '';
          let ruta = colIndex.ruta !== -1 ? (fila[colIndex.ruta]?.toString().trim() || '') : '';
          let tarjeton = colIndex.tarjeton !== -1 ? (fila[colIndex.tarjeton]?.toString().trim() || '') : '';
          let conductor = colIndex.conductor !== -1 ? (fila[colIndex.conductor]?.toString().trim() || '') : '';

          tipo = normalizarTipoUnidad(tipo);

          unidadesProcesadas.push({
            TIPO_UNIDAD: tipo,
            RUTA: ruta,
            ECONOMICO: economico,
            TARJETON: tarjeton,
            NOMBRE_CONDUCTOR: conductor
          });
        }

        if (unidadesProcesadas.length === 0) {
          throw new Error("No se encontraron datos válidos en la tabla.");
        }

        console.log('Datos a enviar:', unidadesProcesadas);

        const respuesta = await fetch('http://localhost:8000/api/despacho/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unidades: unidadesProcesadas })
        });

        const resultado = await respuesta.json();
        if (respuesta.ok) {
          setMensaje({ tipo: 'success', texto: resultado.message });
          guardarArchivoProcesado(archivo.name);
          setArchivo(null);
          if (fileInputRef.current) fileInputRef.current.value = '';

          Swal.fire({
            title: '¡Listo!',
            text: resultado.message || 'Datos importados correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
        } else {
          throw new Error(resultado.message || 'Error al importar los datos');
        }
      } catch (error) {
        console.error('Error detallado:', error);
        setMensaje({ tipo: 'error', texto: error.message });
        Swal.fire({
          title: 'Error',
          text: error.message,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      } finally {
        setCargando(false);
      }
    };
    reader.readAsArrayBuffer(archivo);
  };

  return (
    <div className="excel-layout">
      <header className="excel-header">
        <button type="button" onClick={() => navigate('/')} className="excel-back-btn" disabled={cargando}>← Volver a Inicio</button>
        <h1>Importar Datos de Despacho</h1>
        <p>Carga el reporte administrativo. El sistema buscará la tabla automáticamente.</p>
      </header>

      <main className="excel-container">
        {archivoProcesado && (
          <div className="excel-card excel-card-procesado">
            <h3>Archivo cargado actualmente</h3>
            <div className="archivo-procesado-info">
              <span className="archivo-procesado-nombre">📄 {archivoProcesado.nombre}</span>
            </div>
          </div>
        )}

        <div className="excel-card">
          <form onSubmit={handleProcesarExcel}>
            <div
              className={`upload-zone ${cargando ? 'upload-zone-disabled' : ''} ${dragActivo ? 'upload-zone-active' : ''}`}
              onClick={handleZonaClick}
              onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            >
              <span className="upload-label">{archivo ? archivo.name : "Seleccionar o arrastrar archivo (.xlsx, .csv)"}</span>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            {mensaje.texto && (
              <div className={`excel-alert alert-${mensaje.tipo}`} style={{ marginTop: '15px', padding: '10px', textAlign: 'center', backgroundColor: mensaje.tipo === 'success' ? '#e6f4ea' : '#fce8e6' }}>
                {mensaje.texto}
              </div>
            )}

            <div className="excel-actions">
              <button type="button" onClick={() => navigate('/')} className="btn-excel-cancelar" disabled={cargando}>Cancelar</button>
              <button type="submit" className="btn-excel-procesar" disabled={!archivo || cargando}>
                {cargando ? "Procesando..." : "Sincronizar Datos"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}