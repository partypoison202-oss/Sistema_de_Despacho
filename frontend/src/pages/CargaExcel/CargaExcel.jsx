import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import ExcelPreview from './ExcelVista/ExcelVista';
import './CargaExcel.css';

const STORAGE_KEY = 'cargaExcel_archivoProcesado';
const STORAGE_PREVIEW_KEY = 'cargaExcel_previewData';

export default function CargaExcel() {
  const fileInputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [archivoProcesado, setArchivoProcesado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cargandoTabla, setCargandoTabla] = useState(true);

  // Helper para obtener el token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchDatosHoy = async () => {
    setCargandoTabla(true);
    try {
      const response = await fetch('http://localhost:8000/api/despacho/hoy', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const datos = await response.json();
        if (datos && datos.length > 0) {
          setPreviewData(datos);
        } else {
          // Si no hay datos en BD, limpiar la tabla
          setPreviewData(null);
        }
      }
    } catch (error) {
      console.error('Error al obtener datos de hoy:', error);
    } finally {
      setCargandoTabla(false);
    }
  };

  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) setArchivoProcesado(JSON.parse(guardado));

    // En lugar de leer localstorage, siempre consultamos la BD 
    // para traer los cambios más recientes hechos por Encierro/Admin.
    fetchDatosHoy();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setArchivo(e.target.files[0]);
      setPreviewData(null);
      setHasChanges(false);
      localStorage.removeItem(STORAGE_PREVIEW_KEY);
    }
  };

  const handleUpdateRecord = (index, field, value) => {
    const updatedData = [...previewData];
    updatedData[index][field] = value;
    setPreviewData(updatedData);
    setHasChanges(true);
    localStorage.setItem(STORAGE_PREVIEW_KEY, JSON.stringify(updatedData));
  };

  const handleSaveChanges = async () => {
    if (!previewData || previewData.length === 0) return;
    setIsSaving(true);

    try {
      const response = await fetch('http://localhost:8000/api/despacho/actualizar', {
        method: 'POST',
        headers: getAuthHeaders(), // Token aplicado
        body: JSON.stringify({ unidades: previewData })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al guardar');

      setHasChanges(false);
      Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'Los cambios se han aplicado correctamente.',
        confirmButtonColor: '#c5a059'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#601a2a'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const normalizarTipoUnidad = (tipo) => {
    if (!tipo) return '';
    let t = tipo.toString().trim().toUpperCase();
    return t === 'URBANUSS' ? 'URBANUS' : t;
  };

  const formatExcelTime = (val) => {
    if (val === undefined || val === null || String(val).trim() === '') return '';
    
    if (val instanceof Date) {
      const hours = val.getHours();
      const minutes = val.getMinutes();
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
      }
      if (!isNaN(trimmed) && trimmed !== '') {
        val = parseFloat(trimmed);
      } else {
        return trimmed;
      }
    }

    if (typeof val === 'number') {
      const timeFraction = val - Math.floor(val);
      if (timeFraction === 0 && val > 1) {
        return '';
      }
      let totalSeconds = Math.round(timeFraction * 24 * 60 * 60);
      let hours = Math.floor(totalSeconds / 3600);
      let minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    return String(val);
  };

  const handleProcesarExcel = (e) => {
    e.preventDefault();
    if (!archivo) return;

    setCargando(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const dataRaw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const indiceEncabezado = dataRaw.findIndex(fila =>
          fila.some(celda => String(celda).toUpperCase().includes('TIPO'))
        );
        if (indiceEncabezado === -1) throw new Error("Encabezado 'TIPO DE UNIDAD' no encontrado.");

        const headerRow = dataRaw[indiceEncabezado];
        const colIndex = { tipo: -1, ruta: -1, economico: -1, tarjeton: -1, conductor: -1, estatus: -1, corrida: -1, hora_salida: -1 };

        headerRow.forEach((cell, idx) => {
          const str = String(cell).toUpperCase().trim();
          if (str.includes('TIPO')) colIndex.tipo = idx;
          else if (str === 'RUTA') colIndex.ruta = idx;
          else if (str === 'ECONOMICO') colIndex.economico = idx;
          else if (str.includes('TARJETON')) colIndex.tarjeton = idx;
          else if (str.includes('NOMBRE_CONDUCTOR') || str === 'NOMBRE' || str === 'NOMBRE ') colIndex.conductor = idx;
          else if (str === 'ESTATUS' || str.includes('ESTATUS')) colIndex.estatus = idx;
          else if (str === 'CORRIDA' || str === 'CORRIDAS' || str === 'N° CORRIDA' || str === 'NO. CORRIDA' || str === 'NO CORRIDA') colIndex.corrida = idx;
          else if (str === 'HORA SALIDA' || str === 'HORA_SALIDA' || str === 'SALIDA' || str.includes('HORA SALIDA')) colIndex.hora_salida = idx;
        });

        if (colIndex.economico === -1) throw new Error("No se encontró la columna 'ECONOMICO'.");

        const unidadesProcesadas = [];
        for (let i = indiceEncabezado + 1; i < dataRaw.length; i++) {
          const fila = dataRaw[i];
          if (!fila || !fila[colIndex.economico]) continue;

          unidadesProcesadas.push({
            TIPO_DE_UNIDAD: normalizarTipoUnidad(fila[colIndex.tipo]),
            RUTA: fila[colIndex.ruta] || '',
            ECONOMICO: fila[colIndex.economico],
            TARJETON: fila[colIndex.tarjeton] || '',
            NOMBRE_CONDUCTOR: fila[colIndex.conductor] || '',
            ESTATUS: colIndex.estatus >= 0 ? (fila[colIndex.estatus] || '') : '',
            CORRIDA: colIndex.corrida >= 0 ? (fila[colIndex.corrida] || '') : '',
            HORA_SALIDA: colIndex.hora_salida >= 0 ? formatExcelTime(fila[colIndex.hora_salida]) : ''
          });
        }

        // Petición al backend con Token
        const respuesta = await fetch('http://localhost:8000/api/despacho/importar', {
          method: 'POST',
          headers: getAuthHeaders(), // Token aplicado
          body: JSON.stringify({ unidades: unidadesProcesadas })
        });

        const resultado = await respuesta.json();
        if (respuesta.ok) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ nombre: archivo.name }));
          setArchivoProcesado({ nombre: archivo.name });
          setArchivo(null);
          // Obtenemos los datos frescos de la BD
          await fetchDatosHoy();
          setHasChanges(false);
          Swal.fire({
            icon: 'success',
            title: '¡Listo!',
            text: 'Archivo sincronizado.',
            confirmButtonColor: '#c5a059'
          });
        } else {
          throw new Error(resultado.message || 'Error al importar.');
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message,
          confirmButtonColor: '#601a2a'
        });
      } finally {
        setCargando(false);
      }
    };
    reader.readAsArrayBuffer(archivo);
  };

  return (
    <div className="excel-layout">
      <Header />
      <main className="excel-main-content">

        <header className="excel-header">
          <h1>Importar Datos de Despacho</h1>
        </header>

        {archivoProcesado && (
          <div className="excel-card excel-card-procesado">
            <h3>Último archivo procesado</h3>
            <span className="archivo-procesado-nombre">📄 {archivoProcesado.nombre}</span>
          </div>
        )}

        <div className="excel-card">
          <form onSubmit={handleProcesarExcel}>
            <div className="upload-zone" onClick={() => fileInputRef.current.click()}>
              <span className="upload-label">
                {archivo ? archivo.name : "Seleccionar archivo (.xlsx)"}
              </span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".xlsx,.xls"
              />
            </div>

            <div className="excel-actions">
              <button
                type="submit"
                className="btn-excel-procesar"
                disabled={!archivo || cargando}
              >
                {cargando ? "Procesando..." : "Sincronizar Datos"}
              </button>
            </div>
          </form>
        </div>

        {cargandoTabla ? (
          <div className="excel-card preview-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '3rem', height: '3rem', marginBottom: '1rem', display: 'inline-block' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0 }}>Cargando tabla de operaciones...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Obteniendo los registros más recientes</p>
          </div>
        ) : previewData ? (
          <ExcelPreview
            data={previewData}
            onUpdate={handleUpdateRecord}
            onSave={handleSaveChanges}
            hasChanges={hasChanges}
            isSaving={isSaving}
          />
        ) : (
          <div className="excel-card preview-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ color: '#d1d5db', marginBottom: '1rem' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ display: 'inline-block' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 style={{ color: '#6b7280', margin: 0 }}>No hay datos para hoy</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Sincroniza un archivo Excel para ver la tabla de registros operativos.</p>
          </div>
        )}
      </main>
    </div>
  );
}
