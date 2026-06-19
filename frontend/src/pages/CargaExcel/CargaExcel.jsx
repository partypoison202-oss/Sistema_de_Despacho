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

  // Helper para obtener el token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) setArchivoProcesado(JSON.parse(guardado));

    const previewGuardado = localStorage.getItem(STORAGE_PREVIEW_KEY);
    if (previewGuardado) {
      try {
        const datos = JSON.parse(previewGuardado);
        setPreviewData(datos);
      } catch (e) {
        console.error('Error al restaurar previewData', e);
      }
    }
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
      Swal.fire('¡Guardado!', 'Los cambios se han aplicado correctamente.', 'success');
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const normalizarTipoUnidad = (tipo) => {
    if (!tipo) return '';
    let t = tipo.toString().trim().toUpperCase();
    return t === 'URBANUSS' ? 'URBANUS' : t;
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
        const colIndex = { tipo: -1, ruta: -1, economico: -1, tarjeton: -1, conductor: -1, estatus: -1 };

        headerRow.forEach((cell, idx) => {
          const str = String(cell).toUpperCase().trim();
          if (str.includes('TIPO')) colIndex.tipo = idx;
          else if (str === 'RUTA') colIndex.ruta = idx;
          else if (str === 'ECONOMICO') colIndex.economico = idx;
          else if (str.includes('TARJETON')) colIndex.tarjeton = idx;
          else if (str.includes('NOMBRE_CONDUCTOR') || str.includes('NOMBRE')) colIndex.conductor = idx;
          else if (str === 'ESTATUS' || str.includes('ESTATUS')) colIndex.estatus = idx;
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
            ESTATUS: colIndex.estatus >= 0 ? (fila[colIndex.estatus] || '') : ''
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
          setPreviewData(unidadesProcesadas);
          localStorage.setItem(STORAGE_PREVIEW_KEY, JSON.stringify(unidadesProcesadas));
          setHasChanges(false);
          Swal.fire('¡Listo!', 'Archivo sincronizado.', 'success');
        } else {
          throw new Error(resultado.message || 'Error al importar.');
        }
      } catch (error) {
        Swal.fire('Error', error.message, 'error');
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

        {previewData && (
          <ExcelPreview
            data={previewData}
            onUpdate={handleUpdateRecord}
            onSave={handleSaveChanges}
            hasChanges={hasChanges}
            isSaving={isSaving}
          />
        )}
      </main>
    </div>
  );
}