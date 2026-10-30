import React, { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import SignaturePad from '../SignaturePad/SignaturePad';
import PrintableMaintenanceOrder from './PrintableMaintenanceOrder';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AuthContext } from '../../context/AuthContext';


const MESES_ABREV = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const getMesActualAbrev = () => MESES_ABREV[new Date().getMonth()];
const parsearCodigoMes = (valor) => {
  if (!valor || typeof valor !== 'string') {
    return { mes: getMesActualAbrev(), codigo: '' };
  }
  const match = valor.trim().match(/^([A-Za-z]{3})-(.*)$/);
  if (match) {
    const mesCand = match[1].toUpperCase();
    if (MESES_ABREV.includes(mesCand)) {
      return { mes: mesCand, codigo: match[2].toUpperCase() };
    }
  }
  return { mes: getMesActualAbrev(), codigo: valor.trim().toUpperCase() };
};

/**
 * Reglas de kilometraje:
 * - Numérico puro (sin letras, símbolos ni "km")
 * - Hasta 8 dígitos para la parte entera (máximo 99,999,999 km)
 * - Punto (.) únicamente como separador decimal, máximo 1 dígito para metros/décimas
 */
export const sanitizarKilometraje = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  let str = String(valor).replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = str.split('.');
  let enteros = parts[0].slice(0, 8);
  if (parts.length > 1) {
    let decimales = parts[1].slice(0, 1);
    return `${enteros}.${decimales}`;
  }
  return enteros;
};

export const formatearKilometrajeInicial = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const num = Number(valor);
  if (!isNaN(num)) {
    if (num % 1 === 0) return String(Math.round(num)).slice(0, 8);
    return String(Number(num.toFixed(1))).slice(0, 10);
  }
  return sanitizarKilometraje(valor);
};

export default function MaintenanceReportWizard({ isOpen, onClose, onSuccess, initialData, initialStep = 1, printOnly = false, conductores = [] }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [realTimeClock, setRealTimeClock] = useState('');
  const printableRef = useRef(null);
  const hasInitialized = useRef(false);
  const hasPrinted = useRef(false);
  
  const { canEditModulo } = useContext(AuthContext);
  const isLectura = !canEditModulo('mantenimiento');

  // Form Data
  const [incidencia, setIncidencia] = useState('');
  const [incidenciaMesPrefijo, setIncidenciaMesPrefijo] = useState(getMesActualAbrev());
  const [isEditandoIncidenciaMes, setIsEditandoIncidenciaMes] = useState(false);
  const [folioOrden, setFolioOrden] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [formData, setFormData] = useState({
    eco: '',
    operador: '',
    tarjeton: '',
    fecha: '',
    hora_reporte: '',
    servicio: '',
    corrida: '',
    km: '',
    falla_reportada: '',
    diagnostico: '',
    descripcion_mantenimiento: '',
    firma_base64: ''
  });

  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      // Si hay incidencia existente, vamos al paso 2.
      const incidenciaExistente = initialData?.numero_incidencia || '';
      const parsedIncidencia = parsearCodigoMes(incidenciaExistente);
      let pasoInicial = 1;
      if (initialStep === 2 || (parsedIncidencia.codigo && parsedIncidencia.codigo.length > 0)) {
        pasoInicial = 2;
      }

      setStep(pasoInicial);
      setIncidenciaMesPrefijo(parsedIncidencia.mes);
      setIncidencia(parsedIncidencia.codigo);
      setIsEditandoIncidenciaMes(false);

      // Extraemos el folio de la orden si ya existe
      if (initialData?.folio_mantenimiento) {
        setFolioOrden(initialData.folio_mantenimiento);
      }

      const now = new Date();
      const fechaActual = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const horaActual = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      setFormData({
        eco: initialData?.numero_eco || initialData?.eco || '',
        operador: (() => {
          const name = initialData?.conductorNombre || initialData?.conductor || '';
          return (name.toLowerCase().includes('no reportado') || name.toLowerCase().includes('sin asignar') || name.toLowerCase().includes('desconocido')) ? '' : name;
        })(),
        tarjeton: String(initialData?.tarjeton || '').replace(/\D/g, ''),
        fecha: fechaActual,
        hora_reporte: horaActual,
        servicio: initialData?.servicio || '',
        corrida: String(initialData?.corrida || '').replace(/\D/g, ''),
        km: formatearKilometrajeInicial(initialData?.km),
        falla_reportada: initialData?.falla_reportada || '',
        diagnostico: initialData?.diagnostico || '',
        descripcion_mantenimiento: '',
        firma_base64: initialData?.firma_base64 || ''
      });
    }

    // Reset hasInitialized when closed so it can re-init next time
    if (!isOpen) {
      hasInitialized.current = false;
      hasPrinted.current = false;
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
        setPreviewImageUrl(null);
        setPreviewFilename('');
      }
    }
  }, [isOpen, initialData, initialStep]);

  // Limpieza de URL de previsualización al desmontar
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  // Si printOnly es true, generar PDF automáticamente después de inicializar y mostrarlo en modal
  useEffect(() => {
    if (isOpen && printOnly && hasInitialized.current && !loading && !hasPrinted.current) {
      hasPrinted.current = true;
      const autoPrint = async () => {
        setLoading(true);
        await handleGeneratePDF();
        setLoading(false);
      };
      // Pequeño timeout para permitir que el DOM se pinte completamente
      setTimeout(autoPrint, 300);
    }
  }, [isOpen, printOnly, loading]);

  // Reloj en tiempo real parpadeante
  useEffect(() => {
    if (isOpen) {
      const updateClock = () => {
        const now = new Date();
        const isEven = Math.floor(now.getTime() / 500) % 2 === 0;
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const sep = isEven ? ':' : ' ';
        setRealTimeClock(`${hours}${sep}${minutes}${sep}${seconds}`);

        // Actualizamos formData silenciosamente para el PDF
        setFormData(prev => ({
          ...prev,
          hora_reporte: `${hours}:${minutes}:${seconds}`
        }));
      };

      updateClock(); // llamada inicial 
      const intervalId = setInterval(updateClock, 500);
      return () => clearInterval(intervalId);
    }
  }, [isOpen]);

  // Bloquear scroll de fondo cuando el wizard está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (!String(incidencia || '').trim()) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Atención', 
        text: 'Debes ingresar el número de incidencia.',
        customClass: { container: '!z-[100000]' }
      });
      return;
    }
    setStep(2);
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;

    // Bloquear letras y caracteres especiales en tarjetón y corrida - solo números
    if (name === 'tarjeton' || name === 'corrida') {
      value = value.replace(/\D/g, '');
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Auto-completar operador si el tarjetón coincide
      if (name === 'tarjeton') {
        const valStr = String(value).trim();
        const valueNum = Number(valStr);
        const found = conductores.find(c => Number(c.tarjeton) === valueNum && valStr !== '');
        if (found) {
          newData.operador = found.nombre;
        } else {
          newData.operador = '';
        }
      }

      return newData;
    });
  };

  const isFormValid = () => {
    return Boolean(formData.firma_base64 && String(formData.firma_base64).trim() !== '');
  };

  const handleGeneratePDF = async () => {
    if (!printableRef.current) return null;

    try {
      const element = printableRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Tamaño Carta Horizontal (Landscape)
      const pdf = new jsPDF('l', 'mm', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const incCompleta = incidencia.trim() ? `${incidenciaMesPrefijo}-${incidencia.trim().toUpperCase()}` : (initialData?.numero_incidencia || 'MANT');
      const filename = `Orden_Mantenimiento_${formData.eco || 'ECO'}_INC-${incCompleta}.pdf`;

      setPreviewPdfUrl(pdfUrl);
      setPreviewImageUrl(imgData);
      setPreviewFilename(filename);
      return pdfUrl;

    } catch (error) {
      console.error("Error generando PDF:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un problema generando el PDF.' });
      return null;
    }
  };

  const handleSave = async () => {
    if (!isFormValid()) return;

    setLoading(true);
    setErrorMsg('');
    hasPrinted.current = true; // Prevent double printing if printOnly triggers

    try {
      const incidenciaCompleta = incidencia.trim() ? `${incidenciaMesPrefijo}-${incidencia.trim().toUpperCase()}` : '';

      const folioLimpio = (folioOrden || '').trim();
      // Primero guardamos en backend
      if (onSuccess) {
        await onSuccess({
          numero_incidencia: incidenciaCompleta,
          folio_mantenimiento: folioLimpio || null,
          motivo: 'MANTENIMIENTO',
          fecha_folio_mantenimiento: folioLimpio ? (initialData?.fecha_folio_mantenimiento || new Date().toISOString()) : null,
          falla_reportada: formData.falla_reportada,
          diagnostico: formData.diagnostico,
          firma_base64: formData.firma_base64,
          kilometraje: formData.km,
          mantenimiento_conductor: formData.operador,
          mantenimiento_tarjeton: formData.tarjeton,
          mantenimiento_ruta: formData.servicio,
          mantenimiento_corrida: formData.corrida,
          mantenimiento_kilometraje: formData.km
        });
      }

      // Luego generamos y mostramos la vista previa del PDF dentro del sistema
      await handleGeneratePDF();

    } catch (error) {
      console.error(error);
      setErrorMsg(error?.message || 'Ocurrió un error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignIncidencia = async () => {
    if (!formData.falla_reportada.trim()) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Debes ingresar la falla reportada.' });
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const incidenciaCompleta = incidencia.trim() ? `${incidenciaMesPrefijo}-${incidencia.trim().toUpperCase()}` : '';
      await onSuccess({
        numero_incidencia: incidenciaCompleta,
        motivo: 'MANTENIMIENTO',
        falla_reportada: formData.falla_reportada, // Se guarda desde el paso 1
        folio_mantenimiento: formData.folio_mantenimiento || undefined,
        fecha_folio_mantenimiento: formData.fecha_folio_mantenimiento || undefined,
        generarFolioAutomatico: false  // NO generar folio al solo registrar incidencia
      });
      onClose();
    } catch (error) {
      console.error(error);
      setErrorMsg(error?.message || 'Ocurrió un error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="flex flex-col items-center p-6 max-w-md mx-auto">

      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Asignar Número de Incidencia</h2>

      <div className="w-full text-left mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Asignar número de incidencia:</label>
        <div className="flex items-center w-full border-2 border-gray-300 rounded-lg overflow-hidden focus-within:border-[#6b1d33] transition-colors mb-4 bg-white">
          {isEditandoIncidenciaMes ? (
            <div className="bg-gray-100 border-r border-gray-300 flex items-center px-2 py-2">
              <input
                type="text"
                value={incidenciaMesPrefijo}
                maxLength={3}
                autoFocus
                disabled={isLectura}
                onChange={(e) => setIncidenciaMesPrefijo(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                onBlur={() => {
                  if (!incidenciaMesPrefijo.trim()) setIncidenciaMesPrefijo(getMesActualAbrev());
                  setIsEditandoIncidenciaMes(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!incidenciaMesPrefijo.trim()) setIncidenciaMesPrefijo(getMesActualAbrev());
                    setIsEditandoIncidenciaMes(false);
                  }
                }}
                className="w-14 px-1 py-1 text-center font-bold text-gray-800 bg-white border border-[#6b1d33] rounded text-sm focus:outline-none uppercase shadow-xs"
                placeholder="MES"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => !isLectura && setIsEditandoIncidenciaMes(true)}
              title="Haz clic para editar el mes (ej. OCT)"
              disabled={isLectura}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-3 border-r border-gray-300 select-none flex items-center gap-1.5 text-base tracking-wide transition-colors cursor-pointer group disabled:cursor-not-allowed"
            >
              <span className="group-hover:text-[#6b1d33]">{incidenciaMesPrefijo}</span>
              {!isLectura && (
                <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#6b1d33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
            </button>
          )}
          <span className="text-gray-400 font-extrabold select-none pl-2.5 pr-1">-</span>
          <input
            type="text"
            value={incidencia}
            onChange={(e) => setIncidencia(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
            className="flex-1 p-3 text-lg font-bold uppercase focus:outline-none bg-transparent text-gray-900"
            placeholder=""
            autoFocus={!isEditandoIncidenciaMes}
            disabled={isLectura}
          />
        </div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Falla Reportada:</label>
        <textarea
          value={formData.falla_reportada}
          maxLength={100}
          onChange={(e) => setFormData(prev => ({ ...prev, falla_reportada: e.target.value.replace(/[0-9]/g, '').toUpperCase() }))}
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:border-[#6b1d33] focus:outline-none transition-colors"
          placeholder="Describa la falla brevemente..."
          rows="3"
          disabled={isLectura}
        ></textarea>
        <div className="text-right mt-1">
          <span className={`text-xs font-semibold ${(formData.falla_reportada || '').length >= 100 ? 'text-red-500' : 'text-gray-400'}`}>
            {(formData.falla_reportada || '').length} / 100 letras
          </span>
        </div>
      </div>

      <div className="flex gap-4 w-full justify-center mt-2 flex-row-reverse">
        {!isLectura && (
          <button
            onClick={handleNext}
            disabled={loading}
            className="bg-[#6b1d33] hover:bg-[#832641] text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Continuar →'}
          </button>
        )}
        <button
          onClick={onClose}
          disabled={loading}
          className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col h-full max-h-[85vh]">
      <div className="flex justify-between items-center bg-gradient-to-r from-[#6b1d33] to-[#8d2846] text-white p-5 rounded-t-xl shrink-0 shadow-md">
        <h2 className="text-lg font-bold tracking-wide">Reporte de Falla / Orden de Mantenimiento</h2>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-2xl font-bold leading-none focus:outline-none">&times;</button>
      </div>

      <div className="p-6 overflow-y-auto overscroll-contain flex-1 bg-gray-50/50">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">N° INCIDENCIA</label>
              <div className="text-lg font-bold text-gray-900 border-b-2 border-gray-200 pb-1">
                {incidencia ? `${incidenciaMesPrefijo}-${incidencia}` : 'SIN ASIGNAR'}
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ECO</label>
              <div className="text-lg font-bold text-gray-900 border-b-2 border-gray-200 pb-1">{formData.eco}</div>
            </div>
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha / Hora</label>
              <div className="text-lg font-bold text-gray-900 border-b-2 border-gray-200 pb-1 whitespace-nowrap">
                {formData.fecha} - <span style={{ fontFamily: 'monospace' }}>{realTimeClock || formData.hora_reporte}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Operador</label>
              <input type="text" name="operador" value={formData.operador} readOnly className="w-full border border-gray-200 rounded-lg p-2.5 text-sm transition-all shadow-sm bg-gray-100 text-gray-600 cursor-not-allowed focus:outline-none" />
              <p className="text-[10.5px] text-gray-400 mt-1 font-medium uppercase">SE AUTOCOMPLETA CON EL TARJETÓN</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID (Tarjetón)</label>
              <input 
                type="text" 
                name="tarjeton" 
                value={formData.tarjeton} 
                onChange={handleInputChange} 
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Solo números (ej. 12345)"
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-[#6b1d33] focus:ring-2 focus:ring-[#6b1d33]/20 transition-all shadow-sm" 
              />
              <p className="text-[10.5px] text-gray-400 mt-1 font-medium uppercase">INGRESE EL NÚMERO DE TARJETÓN (EJ. 12345)</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Servicio</label>
              {(() => {
                const tipo = String(initialData?.tipoTransporte || initialData?.tipo || '').toLowerCase();
                // urbanuss, articulado, padron = troncal; zafiro, orion, vagoneta = alimentadora
                const esTroncal = ['urbanuss', 'articulado', 'padron', 'troncal'].includes(tipo);
                const opciones = esTroncal
                  ? ['T01', 'T02', 'T04', 'T05']
                  : ['1A', '1B', '2A', '2B', '2D', '2E', '3', '4A', '4B', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15A', '15B', '15C', '16', '17', '19', '20B', 'Especial', 'Sin ruta asignada'];
                return opciones.length > 0 ? (
                  <div className="relative">
                    <select
                      name="servicio"
                      value={formData.servicio}
                      onChange={handleInputChange}
                      className="appearance-none w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-[#6b1d33] focus:ring-2 focus:ring-[#6b1d33]/20 transition-all shadow-sm bg-white pr-8"
                    >
                      <option value="">— Seleccionar —</option>
                      {opciones.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                ) : (
                  <input type="text" name="servicio" value={formData.servicio} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-[#6b1d33] focus:ring-2 focus:ring-[#6b1d33]/20 transition-all shadow-sm" />
                );
              })()}
              <p className="text-[10.5px] text-gray-400 mt-1 font-medium uppercase">SELECCIONE LA RUTA ASIGNADA (EJ. T01)</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Corrida</label>
              <input 
                type="text" 
                name="corrida" 
                value={formData.corrida} 
                onChange={handleInputChange} 
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Solo números (ej. 2)"
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-[#6b1d33] focus:ring-2 focus:ring-[#6b1d33]/20 transition-all shadow-sm" 
              />
              <p className="text-[10.5px] text-gray-400 mt-1 font-medium uppercase">INGRESE EL NÚMERO DE CORRIDA (EJ. 2)</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">KM</label>
              <input 
                type="text" 
                name="km" 
                inputMode="decimal"
                value={formData.km} 
                onChange={(e) => setFormData(prev => ({ ...prev, km: sanitizarKilometraje(e.target.value) }))} 
                placeholder="Ej: 145200 o 125400.7"
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-[#6b1d33] focus:ring-2 focus:ring-[#6b1d33]/20 transition-all shadow-sm" 
              />
              <p className="text-[10.5px] text-gray-400 mt-1 font-medium uppercase">Numérico puro (máx. 8 dígitos, ej. 145200 o 125400.7)</p>
            </div>
          </div>

          <div className="space-y-5 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Falla Reportada</label>
              <textarea 
                name="falla_reportada" 
                value={formData.falla_reportada} 
                maxLength={100}
                onChange={handleInputChange} 
                rows="2" 
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-[#6b1d33] focus:ring-2 focus:ring-[#6b1d33]/20 transition-all shadow-sm"
              ></textarea>
              <div className="flex justify-between items-center mt-1">
                <p className="text-[10.5px] text-gray-400 font-medium uppercase">DESCRIBA LA FALLA LO MÁS DETALLADO POSIBLE</p>
                <span className={`text-xs font-semibold ${(formData.falla_reportada || '').length >= 100 ? 'text-red-500' : 'text-gray-400'}`}>
                  {(formData.falla_reportada || '').length} / 100 letras
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="w-full bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 shadow-xs">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#6b1d33]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  REPORTÓ (FIRMA) <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">FIRMA DIGITAL</span>
              </div>
              <SignaturePad
                label=""
                height={220}
                disabled={isLectura}
                initialImage={formData.firma_base64}
                onSave={(base64) => setFormData(prev => ({ ...prev, firma_base64: base64 }))}
                onClear={() => setFormData(prev => ({ ...prev, firma_base64: '' }))}
              />
              <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase text-center">Dibuje su firma en el recuadro con el mouse o dedo</p>
            </div>
          </div>

        </div>
      </div>

      {/* Banner de error inline */}
      {errorMsg && (
        <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2 text-red-700 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="p-5 bg-white border-t border-gray-100 rounded-b-xl shrink-0 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-10">
        <button
          onClick={() => { setStep(1); setErrorMsg(''); }}
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          Atrás (Cambiar Incidencia)
        </button>
        {!isLectura && (
          <button
            onClick={handleSave}
            disabled={!isFormValid() || loading}
            className={`px-6 py-2.5 rounded-lg font-medium text-white shadow-md flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#6b1d33]/50 focus:ring-offset-1
              ${(!isFormValid() || loading) ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-[#6b1d33] to-[#8d2846] hover:shadow-lg hover:-translate-y-0.5'}`}
          >
            {loading ? 'Procesando...' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Generar y Descargar PDF
              </>
            )}
          </button>
        )}
      </div>


      {/* Contenedor Oculto para la plantilla PDF */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
        <PrintableMaintenanceOrder ref={printableRef} data={{ ...formData, incidencia: (incidencia ? `${incidenciaMesPrefijo}-${incidencia}` : ''), folio: folioOrden || '' }} />
      </div>
    </div>
  );

  // Vista previa modal adaptativa para móviles, tablets y escritorio
  if (previewPdfUrl) {
    return createPortal(
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem'
      }}>
        <div style={{
          backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem',
          width: '100%', maxWidth: '960px', height: '88vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#601a2a', fontSize: '1.25rem', fontWeight: 'bold' }}>Vista Previa del Reporte</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Reporte oficial • Optimizado para tablet, móvil y PC</p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                style={{
                  padding: '0.5rem 1rem', border: 'none', borderRadius: '6px',
                  backgroundColor: '#601a2a', color: '#fff', cursor: 'pointer',
                  fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = previewPdfUrl;
                  a.download = previewFilename || `Orden_Mantenimiento_${formData.eco || 'ECO'}.pdf`;
                  a.style.display = 'none';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Descargar PDF
              </button>
              <button
                style={{
                  padding: '0.5rem 0.85rem', border: '1px solid #d1d5db', borderRadius: '6px',
                  backgroundColor: '#f9fafb', color: '#374151', cursor: 'pointer',
                  fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px'
                }}
                title="Abrir PDF en pestaña nueva"
                onClick={() => window.open(previewPdfUrl, '_blank')}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Abrir PDF
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px',
                  backgroundColor: '#fff', color: '#4b5563', cursor: 'pointer', fontWeight: '500'
                }}
                onClick={() => {
                  if (previewPdfUrl) {
                    URL.revokeObjectURL(previewPdfUrl);
                  }
                  setPreviewPdfUrl(null);
                  setPreviewImageUrl(null);
                  setPreviewFilename('');
                  onClose();
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
          <div style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#525659',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            border: '1px solid #374151',
            WebkitOverflowScrolling: 'touch'
          }}>
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt="Vista previa del reporte"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '2px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                  backgroundColor: '#ffffff'
                }}
              />
            ) : (
              <iframe src={previewPdfUrl} title="Vista previa PDF" style={{ width: '100%', height: '100%', border: 'none' }} />
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (printOnly) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-4 overscroll-none">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
        <p className="text-white text-lg font-semibold animate-pulse">Generando reporte de mantenimiento...</p>
        {/* Contenedor Oculto para la plantilla PDF */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
          <PrintableMaintenanceOrder ref={printableRef} data={{ ...formData, incidencia: (incidencia ? `${incidenciaMesPrefijo}-${incidencia}` : ''), folio: folioOrden || '' }} />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overscroll-none">
      <div
        className="bg-white rounded-xl shadow-2xl w-full relative overflow-hidden"
        style={{ maxWidth: (step === 1) ? '500px' : '820px' }}
      >
        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>,
    document.body
  );
}
