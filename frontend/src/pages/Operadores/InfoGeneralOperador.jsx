import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';

// Función para calcular edad
const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return 'N/A';
  const hoy = new Date();
  const cumple = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
    edad--;
  }
  return isNaN(edad) ? 'N/A' : `${edad} años`;
};

// Función para calcular antigüedad
const calcularAntiguedad = (fechaIngreso) => {
  if (!fechaIngreso) return 'N/A';
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);
  let anios = hoy.getFullYear() - ingreso.getFullYear();
  let meses = hoy.getMonth() - ingreso.getMonth();
  if (meses < 0) {
    anios--;
    meses += 12;
  }
  if (isNaN(anios) || isNaN(meses)) return 'N/A';
  return `${anios} años, ${meses} meses`;
};

const PrintableTemplate = ({ conductor }) => (
  <div className="bg-white p-8 w-[800px] mx-auto text-sm text-gray-800 font-sans" id="printable-pdf-template">
    {/* Membrete Oficial */}
    <div className="border-b-2 border-[#6A1B29] pb-4 mb-6 flex justify-between items-end">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">SISTEMA DE TRANSPORTE MASIVO DE HIDALGO</h1>
        <h2 className="text-md font-bold text-[#6A1B29] mt-1">CONSULTA DE INFORMACIÓN DEL OPERADOR</h2>
      </div>
      <div className="text-right text-xs text-gray-500">
        <p>Fecha de Impresión: {new Date().toLocaleDateString()}</p>
        <p>Reporte Operativo SITMAH</p>
      </div>
    </div>

    {/* Identidad */}
    <div className="flex items-center gap-6 mb-6 pb-4 border-b border-gray-100">
      <div className="h-24 w-24 shrink-0 rounded-full flex items-center justify-center text-white text-4xl font-bold overflow-hidden" style={{ backgroundColor: '#6A1B29' }}>
         {conductor.nombre && conductor.nombre !== '------------------------' ? conductor.nombre.charAt(0).toUpperCase() : 'O'}
      </div>
      <div className="flex-1">
         <h2 className="text-2xl font-bold text-gray-900 uppercase">{conductor.nombre}</h2>
         <div className="flex items-center gap-4 mt-2 text-gray-700">
           <span><strong>ID:</strong> {conductor.id}</span>
           <span><strong>Tarjetón:</strong> {conductor.tarjeton}</span>
           <span className={`px-2 py-1 text-xs rounded-full font-bold uppercase ${conductor.estatus === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{conductor.estatus === 'activo' ? 'ACTIVO' : 'BAJA'}</span>
         </div>
         <p className="mt-1 text-xs text-gray-500"><strong>Vigencia Licencia:</strong> {conductor.vigencia_licencia ? new Date(conductor.vigencia_licencia).toLocaleDateString() : 'No registrada'}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-6 mb-6">
      {/* Datos Personales */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-[#6A1B29] border-b border-gray-100 pb-2 mb-3 text-xs">DATOS PERSONALES</h3>
        <div className="space-y-2 text-xs">
          <p className="flex justify-between"><span>Sexo:</span> <strong>{conductor.sexo || 'N/A'}</strong></p>
          <p className="flex justify-between"><span>Edad:</span> <strong>{conductor.fecha_nacimiento ? calcularEdad(conductor.fecha_nacimiento) : '---'}</strong></p>
          <p className="flex justify-between"><span>Teléfono:</span> <strong>{conductor.telefono || 'N/A'}</strong></p>
          <p className="flex justify-between"><span>Ref 1:</span> <strong>{conductor.referencia_1 || 'N/A'}</strong></p>
          <p className="flex justify-between"><span>Ref 2:</span> <strong>{conductor.referencia_2 || 'N/A'}</strong></p>
        </div>
      </div>

      {/* Antigüedad */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-[#6A1B29] border-b border-gray-100 pb-2 mb-3 text-xs">ANTIGÜEDAD Y FECHAS</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
           <div className="bg-gray-50 p-2 rounded">
             <span className="block text-gray-500 mb-1">Fecha Ingreso</span>
             <strong className="text-sm">{conductor.fecha_ingreso ? new Date(conductor.fecha_ingreso).toLocaleDateString() : 'N/A'}</strong>
           </div>
           <div className="bg-[#6A1B29] text-white p-2 rounded">
             <span className="block mb-1 opacity-80">Antigüedad</span>
             <strong className="text-sm">{conductor.fecha_ingreso ? calcularAntiguedad(conductor.fecha_ingreso) : '---'}</strong>
           </div>
           <div className="bg-gray-50 p-2 rounded">
             <span className="block text-gray-500 mb-1">Últ. Capacitación</span>
             <strong>{conductor.ultima_capacitacion ? new Date(conductor.ultima_capacitacion).toLocaleDateString() : 'N/A'}</strong>
           </div>
           <div className="bg-gray-50 p-2 rounded">
             <span className="block text-gray-500 mb-1">Próx. Capacitación</span>
             <strong>{conductor.proxima_capacitacion ? new Date(conductor.proxima_capacitacion).toLocaleDateString() : 'N/A'}</strong>
           </div>
        </div>
      </div>
    </div>

    {/* Kardex Métricas */}
    <div className="border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="font-bold text-[#6A1B29] border-b border-gray-100 pb-2 mb-3 text-xs">MÉTRICAS OPERATIVAS (KARDEX)</h3>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="bg-gray-50 p-3 rounded"><p className="text-2xl font-bold">{conductor.accidentes_siniestros ?? 0}</p><p className="text-[10px] text-gray-500 uppercase">Accidentes</p></div>
        <div className="bg-gray-50 p-3 rounded"><p className="text-2xl font-bold">{conductor.faltas ?? 0}</p><p className="text-[10px] text-gray-500 uppercase">Faltas</p></div>
        <div className="bg-gray-50 p-3 rounded"><p className="text-2xl font-bold">{conductor.retardos ?? 0}</p><p className="text-[10px] text-gray-500 uppercase">Retardos</p></div>
        <div className="bg-gray-50 p-3 rounded"><p className="text-2xl font-bold">{conductor.cambios ?? conductor.permutas ?? 0}</p><p className="text-[10px] text-gray-500 uppercase">Cambios</p></div>
      </div>
    </div>

    {/* Observaciones y Listas */}
    <div className="grid grid-cols-2 gap-6">
      <div className="border border-gray-200 rounded-lg p-4">
         <h4 className="font-bold text-[#6A1B29] border-b border-gray-100 pb-2 mb-2 flex justify-between text-xs">RECONOCIMIENTOS <span className="text-[#6A1B29]">{conductor.reconocimientos ?? 0}</span></h4>
         <ul className="text-[10px] list-disc pl-4 space-y-1 text-gray-600">
            {conductor.reconocimientos_detalle && conductor.reconocimientos_detalle.length > 0 ? 
              conductor.reconocimientos_detalle.map(d => <li key={d.id}><strong>{new Date(d.fecha).toLocaleDateString()}:</strong> {d.motivo}</li>) 
            : <li className="italic">Sin registros</li>}
         </ul>
      </div>
      <div className="border border-gray-200 rounded-lg p-4">
         <h4 className="font-bold text-[#6A1B29] border-b border-gray-100 pb-2 mb-2 flex justify-between text-xs">AMONESTACIONES <span className="text-[#6A1B29]">{conductor.amonestaciones ?? 0}</span></h4>
         <ul className="text-[10px] list-disc pl-4 space-y-1 text-gray-600">
            {conductor.amonestaciones_detalle && conductor.amonestaciones_detalle.length > 0 ? 
              conductor.amonestaciones_detalle.map(d => <li key={d.id}><strong>{new Date(d.fecha).toLocaleDateString()}:</strong> {d.motivo}</li>) 
            : <li className="italic">Sin registros</li>}
         </ul>
      </div>
      <div className="col-span-2 border border-gray-200 rounded-lg p-4 text-xs">
         <h4 className="font-bold text-[#6A1B29] border-b border-gray-100 pb-2 mb-2">CONDICIONAMIENTOS</h4>
         <div className="flex gap-4">
           <p className="flex-1"><strong className="text-gray-700">Médicos:</strong> {conductor.condicionamientos_medicos || 'N/A'}</p>
           <p className="flex-1"><strong className="text-gray-700">Jurídicos:</strong> {conductor.condicionamientos_juridicos || 'N/A'}</p>
         </div>
      </div>
      <div className="col-span-2 border border-gray-200 rounded-lg p-4 text-xs">
         <h4 className="font-bold text-[#6A1B29] border-b border-gray-100 pb-2 mb-2">OBSERVACIONES</h4>
         <p className="whitespace-pre-wrap">{conductor.observaciones || 'Sin observaciones registradas...'}</p>
      </div>
    </div>
  </div>
);

export default function InfoGeneralOperador({ conductores }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConductor, setSelectedConductor] = useState(null);

  // Filtrado del buscador principal
  const filteredConductores = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase();
    return conductores.filter(c => 
      String(c.nombre || '').toLowerCase().includes(lower) ||
      String(c.tarjeton || '').toLowerCase().includes(lower) ||
      String(c.id || '').toLowerCase().includes(lower)
    );
  }, [conductores, searchTerm]);

  // Selección
  const handleSelect = (conductor) => {
    setSelectedConductor(conductor);
    setSearchTerm(''); // Opcional: limpiar búsqueda o dejarla
  };

  const defaultConductor = {
    nombre: '------------------------', id: '---', tarjeton: '---', estatus: '---', tipo_tarjeton: '---',
    vigencia_licencia: null, sexo: '---', fecha_nacimiento: null,
    telefono: '---', referencia_1: '---', referencia_2: '---',
    fecha_ingreso: null, amonestaciones_detalle: [], reconocimientos_detalle: [],
    accidentes_siniestros: 0, faltas: 0, retardos: 0, amonestaciones: 0,
    reconocimientos: 0, permutas: 0, permisos: 0, condicionamientos_medicos: '---',
    condicionamientos_juridicos: '---', evaluacion: '---', observaciones: '---',
    ultima_capacitacion: null, proxima_capacitacion: null
  };

  const displayConductor = selectedConductor || defaultConductor;

  const generarDocumentoPDF = async () => {
    const element = document.getElementById('printable-pdf-template');
    
    // Usamos html-to-image que tiene soporte nativo para CSS moderno como oklch (Tailwind v4)
    const imgDataUrl = await toJpeg(element, { quality: 0.98, pixelRatio: 2 });
    
    // Crear el documento PDF
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    
    // Obtener dimensiones reales de la imagen generada
    const img = new Image();
    img.src = imgDataUrl;
    await new Promise((resolve) => { img.onload = resolve; });
    
    // Ajustar la imagen al tamaño de la página A4 con 10mm de margen
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const imgWidth = pdfWidth - margin * 2;
    const imgHeight = (img.height * imgWidth) / img.width;
    
    pdf.addImage(imgDataUrl, 'JPEG', margin, margin, imgWidth, imgHeight);
    return pdf;
  };

  const handlePrint = async () => {
    if (!selectedConductor) return;
    
    // Abrimos la ventana síncronamente para evitar que Safari la bloquee
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<div style="font-family: sans-serif; padding: 20px; text-align: center;">Generando documento oficial en PDF, por favor espere...</div>');
    }

    try {
      const pdf = await generarDocumentoPDF();
      const pdfUrl = pdf.output('bloburl');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <html>
            <head>
              <title>Expediente Operador - ${displayConductor.tarjeton}</title>
              <style>body { margin: 0; padding: 0; overflow: hidden; }</style>
            </head>
            <body>
              <iframe src="${pdfUrl}" width="100%" height="100%" frameborder="0" style="border:0;"></iframe>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Error al generar PDF:', err);
      if (printWindow) {
        printWindow.document.write('<div style="color: red; text-align: center;">Ocurrió un error al generar el PDF.</div>');
      }
    }
  };

  const handleSave = async () => {
    if (!selectedConductor) return;
    try {
      const pdf = await generarDocumentoPDF();
      pdf.save(`Expediente_Operador_${displayConductor.tarjeton}.pdf`);
    } catch (err) {
      console.error('Error al guardar PDF:', err);
    }
  };

  return (
    <>
      {/* Plantilla oculta para PDF y Print */}
      <div className="absolute -left-[9999px] top-0 print:static print:w-full print:block">
        <PrintableTemplate conductor={displayConductor} />
      </div>

      <div className="info-general-container print:hidden">
      {/* Buscador Superior */}
      <div className="search-section bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6 print:hidden">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#6A1B29' }}>Buscar Operador</h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#6A1B29] focus:border-[#6A1B29] sm:text-sm transition-colors"
            placeholder="Buscar por Nombre, ID o Tarjetón..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Resultados del Buscador */}
        {searchTerm && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredConductores.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {filteredConductores.map(c => (
                  <li 
                    key={c.id} 
                    className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors"
                    onClick={() => handleSelect(c)}
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">{c.nombre}</p>
                      <p className="text-xs text-gray-500">ID: {c.id} | Tarjetón: {c.tarjeton}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.estatus === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {c.estatus === 'activo' ? 'Activo' : 'Baja'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-sm text-gray-500 text-center">No se encontraron operadores.</p>
            )}
          </div>
        )}
      </div>

      {/* Controles de Acción */}
      <div className="flex justify-end gap-3 mb-4 print:hidden">
        <button 
          onClick={handlePrint}
          disabled={!selectedConductor}
          className={`px-4 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 transition-colors flex items-center gap-2 ${!selectedConductor ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Imprimir
        </button>
        <button 
          onClick={handleSave}
          disabled={!selectedConductor}
          className={`px-4 py-2 bg-[#6A1B29] border border-transparent rounded shadow-sm text-sm font-medium text-white transition-colors flex items-center gap-2 ${!selectedConductor ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#50131f]'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          Guardar
        </button>
      </div>

      {/* Perfil del Operador */}
        <div className="operator-profile space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* A. Encabezado / Identidad */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden col-span-1 lg:col-span-3">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#fdfbfb' }}>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 shrink-0 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-inner overflow-hidden object-cover" style={{ backgroundColor: '#6A1B29' }}>
                    {displayConductor.nombre && displayConductor.nombre !== '------------------------' ? displayConductor.nombre.charAt(0).toUpperCase() : 'O'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{displayConductor.nombre}</h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span><span className="font-semibold">ID / Empleado:</span> {displayConductor.id}</span>
                      <span>•</span>
                      <span><span className="font-semibold">Tarjetón:</span> {displayConductor.tarjeton}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${displayConductor.estatus === 'activo' ? 'bg-green-100 text-green-800' : (displayConductor.estatus === '---' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-800')}`}>
                    <span className={`h-2 w-2 rounded-full mr-2 ${displayConductor.estatus === 'activo' ? 'bg-green-500' : (displayConductor.estatus === '---' ? 'bg-gray-400' : 'bg-red-500')}`}></span>
                    {displayConductor.estatus === 'activo' ? 'ACTIVO' : (displayConductor.estatus === '---' ? 'SIN DATOS' : 'BAJA')}
                  </span>
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="font-semibold">Vigencia Licencia:</span> {displayConductor.vigencia_licencia ? new Date(displayConductor.vigencia_licencia).toLocaleDateString() : 'No registrada'}
                  </div>
                </div>
              </div>
            </div>

            {/* B. Datos Personales y de Contacto */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#6A1B29' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                Datos Personales
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500 font-medium">Sexo</span>
                  <span className="text-gray-900 font-semibold">{displayConductor.sexo || 'No especificado'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500 font-medium">Edad</span>
                  <span className="text-gray-900 font-semibold">{displayConductor.fecha_nacimiento === null ? '---' : calcularEdad(displayConductor.fecha_nacimiento)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500 font-medium">Teléfono</span>
                  <span className="text-gray-900 font-semibold">{displayConductor.telefono || 'No registrado'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500 font-medium">Referencia 1</span>
                  <span className="text-gray-900 font-semibold">{displayConductor.referencia_1 || 'No registrada'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Referencia 2</span>
                  <span className="text-gray-900 font-semibold">{displayConductor.referencia_2 || 'No registrada'}</span>
                </div>
              </div>
            </div>

            {/* C. Antigüedad y Fechas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#6A1B29' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Antigüedad y Fechas
              </h3>
              <div className="space-y-4 text-sm mt-6">
                <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">Fecha de Ingreso</span>
                    <span className="text-gray-900 font-bold text-lg mt-1">{displayConductor.fecha_ingreso ? new Date(displayConductor.fecha_ingreso).toLocaleDateString() : 'No registrada'}</span>
                  </div>
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                
                <div className="bg-[#6A1B29] p-4 rounded-lg flex items-center justify-between shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-white text-xs uppercase tracking-wider font-bold">Antigüedad Total</span>
                    <span className="text-white font-bold text-lg mt-1">{displayConductor.fecha_ingreso === null ? '---' : calcularAntiguedad(displayConductor.fecha_ingreso)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* D. Historial y Métricas Operativas (Kardex) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 lg:col-span-3">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: '#6A1B29' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Historial y Métricas Operativas (Kardex)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="border border-gray-100 bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-800">{displayConductor.accidentes_siniestros ?? 0}</div>
                  <div className="text-xs text-gray-500 uppercase font-bold mt-1 tracking-wider">Accidentes</div>
                </div>
                <div className="border border-gray-100 bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-800">{displayConductor.faltas ?? 0}</div>
                  <div className="text-xs text-gray-500 uppercase font-bold mt-1 tracking-wider">Faltas</div>
                </div>
                <div className="border border-gray-100 bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-800">{displayConductor.retardos ?? 0}</div>
                  <div className="text-xs text-gray-500 uppercase font-bold mt-1 tracking-wider">Retardos</div>
                </div>
                <div className="border border-gray-100 bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-800">{displayConductor.cambios ?? displayConductor.permutas ?? 0}</div>
                  <div className="text-xs text-gray-500 uppercase font-bold mt-1 tracking-wider">Cambios</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <span className="block text-sm font-semibold text-gray-500 mb-1">Capacitaciones</span>
                    <div className="flex gap-4 text-sm">
                      <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-md border border-blue-100 flex-1">
                        <span className="block text-xs uppercase opacity-70 font-bold mb-1">Última</span>
                        <span className="font-medium">{displayConductor.ultima_capacitacion ? new Date(displayConductor.ultima_capacitacion).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="bg-purple-50 text-purple-800 px-3 py-2 rounded-md border border-purple-100 flex-1">
                        <span className="block text-xs uppercase opacity-70 font-bold mb-1">Próxima</span>
                        <span className="font-medium">{displayConductor.proxima_capacitacion ? new Date(displayConductor.proxima_capacitacion).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <span className="block text-sm font-semibold text-gray-500 mb-1">Condicionamientos</span>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="bg-yellow-50 border border-yellow-100 p-2 rounded">
                        <strong className="text-yellow-800 block mb-1">Médicos:</strong> {displayConductor.condicionamientos_medicos || 'Sin especificar'}
                      </div>
                      <div className="bg-red-50 border border-red-100 p-2 rounded">
                        <strong className="text-red-800 block mb-1">Jurídicos:</strong> {displayConductor.condicionamientos_juridicos || 'Sin especificar'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm font-semibold text-gray-500 mb-1">Evaluación General</span>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="font-bold text-gray-800">{displayConductor.evaluacion || 'Sin evaluar'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <span className="block text-sm font-semibold text-gray-500 mb-1 flex justify-between">
                      Reconocimientos
                      <span className="font-bold text-[#6A1B29]">{displayConductor.reconocimientos ?? 0}</span>
                    </span>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 h-32 overflow-y-auto text-sm text-gray-700 print:h-auto print:overflow-visible">
                      {(displayConductor.reconocimientos_detalle && displayConductor.reconocimientos_detalle.length > 0) ? (
                        <ul className="list-disc pl-4 space-y-1">
                          {displayConductor.reconocimientos_detalle.map(d => (
                            <li key={d.id}><strong>{new Date(d.fecha).toLocaleDateString()}:</strong> {d.motivo}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="italic text-gray-400">Sin reconocimientos registrados...</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="block text-sm font-semibold text-gray-500 mb-1 flex justify-between">
                      Amonestaciones
                      <span className="font-bold text-[#6A1B29]">{displayConductor.amonestaciones ?? 0}</span>
                    </span>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 h-32 overflow-y-auto text-sm text-gray-700 print:h-auto print:overflow-visible">
                      {(displayConductor.amonestaciones_detalle && displayConductor.amonestaciones_detalle.length > 0) ? (
                        <ul className="list-disc pl-4 space-y-1">
                          {displayConductor.amonestaciones_detalle.map(d => (
                            <li key={d.id}><strong>{new Date(d.fecha).toLocaleDateString()}:</strong> {d.motivo}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="italic text-gray-400">Sin amonestaciones registradas...</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm font-semibold text-gray-500 mb-2">Observaciones Generales</span>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 h-24 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap">
                      {displayConductor.observaciones || <span className="italic text-gray-400">Sin observaciones registradas...</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
