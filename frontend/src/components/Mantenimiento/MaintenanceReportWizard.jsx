import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import SignaturePad from '../SignaturePad/SignaturePad';
import PrintableMaintenanceOrder from './PrintableMaintenanceOrder';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function MaintenanceReportWizard({ isOpen, onClose, onSuccess, initialData, initialStep = 1, printOnly = false }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [realTimeClock, setRealTimeClock] = useState('');
  const printableRef = useRef(null);
  const hasInitialized = useRef(false);

  // Form Data
  const [folio, setFolio] = useState('');
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
      // Si hay folio existente en initialData, ir directo al paso 2
      const folioExistente = initialData?.folio_mantenimiento || '';
      const pasoInicial = (initialStep === 2 || folioExistente) ? 2 : 1;
      setStep(pasoInicial);
      setFolio(folioExistente);
      
      const now = new Date();
      const fechaActual = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const horaActual = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      setFormData({
        eco: initialData?.numero_eco || initialData?.eco || '',
        operador: initialData?.conductorNombre || initialData?.conductor || '',
        tarjeton: initialData?.tarjeton || '',
        fecha: fechaActual,
        hora_reporte: horaActual,
        servicio: initialData?.servicio || '',
        corrida: initialData?.corrida || '',
        km: initialData?.km || '',
        falla_reportada: initialData?.falla_reportada || '',
        diagnostico: initialData?.diagnostico || '',
        descripcion_mantenimiento: '',
        firma_base64: initialData?.firma_base64 || ''
      });
    }
    
    // Reset hasInitialized when closed so it can re-init next time
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, initialData, initialStep]);

  // Si printOnly es true, generar PDF automáticamente después de inicializar
  useEffect(() => {
    if (isOpen && printOnly && hasInitialized.current && !loading) {
      const autoPrint = async () => {
        setLoading(true);
        await handleGeneratePDF();
        setLoading(false);
        onClose();
      };
      // Pequeño timeout para permitir que el DOM se pinte completamente
      setTimeout(autoPrint, 300);
    }
  }, [isOpen, printOnly]);

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

if (!isOpen) return null;

const handleNext = () => {
  if (!String(folio || '').trim()) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Debes ingresar el folio de mantenimiento.' });
      return;
    }
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    return (
      String(formData.falla_reportada || '').trim() !== '' &&
      String(formData.km || '').trim() !== '' &&
      formData.firma_base64 !== ''
    );
  };

  const handleGeneratePDF = async () => {
    if (!printableRef.current) return;
    
    try {
      const element = printableRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Tamaño Carta Horizontal (Landscape)
      const pdf = new jsPDF('l', 'mm', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      // Descargar el PDF directamente (más confiable que window.open en Safari)
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Orden_Mantenimiento_${formData.eco}_${folio || 'REIMPRESION'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
      
    } catch (error) {
      console.error("Error generando PDF:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un problema generando el PDF.' });
    }
  };

  const handleSave = async () => {
    if (!isFormValid()) return;
    
    setLoading(true);
    setErrorMsg('');
    
    try {
      // Generamos y descargamos el PDF inmediatamente para mejor experiencia de usuario
      await handleGeneratePDF();
      
      // Luego guardamos en backend
      await onSuccess({
        folio_mantenimiento: folio,
        motivo: 'MANTENIMIENTO',
        fecha_folio_mantenimiento: new Date().toISOString(),
        falla_reportada: formData.falla_reportada,
        diagnostico: formData.diagnostico,
        firma_base64: formData.firma_base64
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

      <h2 className="text-2xl font-bold mb-6 text-gray-800">Asignar Folio de Mantenimiento</h2>
      
      <div className="w-full text-left mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Asignar folio de Mantenimiento:</label>
        <input 
          type="text" 
          value={folio}
          onChange={(e) => setFolio(e.target.value.replace(/\D/g, ''))}
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg font-bold focus:border-[#6b1d33] focus:outline-none transition-colors"
          placeholder="Ej. 1234"
          autoFocus
        />
      </div>

      <div className="flex gap-4 w-full justify-center mt-2">
        <button 
          onClick={handleNext}
          className="bg-[#6b1d33] hover:bg-[#832641] text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Siguiente
        </button>
        <button 
          onClick={onClose}
          className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col h-full max-h-[85vh]">
      <div className="flex justify-between items-center bg-[#6b1d33] text-white p-4 rounded-t-xl shrink-0">
        <h2 className="text-lg font-bold">Reporte de Falla / Orden de Mantenimiento</h2>
        <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold leading-none">&times;</button>
      </div>
      
      <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Folio (Incidencia)</label>
              <div className="text-lg font-bold text-gray-900 border-b-2 border-gray-200 pb-1">{folio}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ECO</label>
              <div className="text-lg font-bold text-gray-900 border-b-2 border-gray-200 pb-1">{formData.eco}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha / Hora</label>
              <div className="text-lg font-bold text-gray-900 border-b-2 border-gray-200 pb-1">
                {formData.fecha} - <span style={{ fontFamily: 'monospace' }}>{realTimeClock || formData.hora_reporte}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Operador</label>
              <div className="text-base font-medium text-gray-900 border-b-2 border-gray-200 pb-1">{formData.operador || 'No asignado'}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID (Tarjetón)</label>
              <div className="text-base font-medium text-gray-900 border-b-2 border-gray-200 pb-1">{formData.tarjeton || 'N/A'}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Servicio</label>
              <input type="text" name="servicio" value={formData.servicio} onChange={handleInputChange} className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#6b1d33] focus:ring-1 focus:ring-[#6b1d33]" placeholder="Ej. RA 3" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Corrida</label>
              <input type="text" name="corrida" value={formData.corrida} onChange={handleInputChange} className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#6b1d33] focus:ring-1 focus:ring-[#6b1d33]" placeholder="Ej. 2" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">KM <span className="text-red-500">*</span></label>
              <input type="text" name="km" value={formData.km} onChange={(e) => setFormData(prev => ({ ...prev, km: e.target.value.replace(/\D/g, '') }))} className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#6b1d33] focus:ring-1 focus:ring-[#6b1d33]" placeholder="Ej. 1488" />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Falla Reportada <span className="text-red-500">*</span></label>
              <textarea name="falla_reportada" value={formData.falla_reportada} onChange={handleInputChange} rows="2" className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#6b1d33] focus:ring-1 focus:ring-[#6b1d33]" placeholder="Describa la falla..."></textarea>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Diagnóstico (Opcional)</label>
              <textarea name="diagnostico" value={formData.diagnostico} onChange={handleInputChange} rows="2" className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#6b1d33] focus:ring-1 focus:ring-[#6b1d33]"></textarea>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción de Mantenimiento (Opcional)</label>
              <textarea name="descripcion_mantenimiento" value={formData.descripcion_mantenimiento} onChange={handleInputChange} rows="2" className="w-full border border-gray-300 rounded p-2 text-sm focus:border-[#6b1d33] focus:ring-1 focus:ring-[#6b1d33]"></textarea>
            </div>
          </div>

          <div className="mb-4">
            <SignaturePad 
              label="REPORTÓ (FIRMA)" 
              height={140}
              onSave={(base64) => setFormData(prev => ({ ...prev, firma_base64: base64 }))}
              onClear={() => setFormData(prev => ({ ...prev, firma_base64: '' }))}
            />
          </div>
          
        </div>
      </div>

      {/* Banner de error inline */}
      {errorMsg && (
        <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2 text-red-700 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="p-4 bg-white border-t border-gray-200 rounded-b-xl shrink-0 flex justify-end gap-3 shadow-up">
        <button 
          onClick={() => { setStep(1); setErrorMsg(''); }}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
        >
          Editar Folio
        </button>
        <button 
          onClick={handleSave}
          disabled={!isFormValid() || loading}
          className={`px-6 py-2 rounded-md font-medium text-white shadow-sm flex items-center gap-2
            ${(!isFormValid() || loading) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#6b1d33] hover:bg-[#832641]'}`}
        >
          {loading ? 'Procesando...' : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Guardar e Imprimir Orden
            </>
          )}
        </button>
      </div>


      {/* Contenedor Oculto para la plantilla PDF */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
        <PrintableMaintenanceOrder ref={printableRef} data={{...formData, folio}} />
      </div>
    </div>
  );

  if (printOnly) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
        <p className="text-white text-lg font-semibold animate-pulse">Generando e imprimiendo Orden de Mantenimiento...</p>
        {/* Contenedor Oculto para la plantilla PDF */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
          <PrintableMaintenanceOrder ref={printableRef} data={{...formData, folio}} />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full relative overflow-hidden"
        style={{ maxWidth: step === 1 ? '500px' : '800px', transition: 'max-width 0.3s ease-in-out' }}
      >
        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>,
    document.body
  );
}
