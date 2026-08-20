import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import API_BASE from '../../config/api';
import plantillaGafete from '../../assets/plantilla_gafete.png';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';

export default function GeneracionGafete({ conductores }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConductor, setSelectedConductor] = useState(null);
  const [fechaExpedicion, setFechaExpedicion] = useState('2026-01-01');
  const [fechaVigencia, setFechaVigencia] = useState('2026-12-01');

  const formatMonthYear = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return dateString;
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return `${meses[date.getMonth()]} ${date.getFullYear()}`;
  };

  const filteredConductores = conductores.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(term)) ||
      (c.tarjeton && c.tarjeton.toLowerCase().includes(term))
    );
  }).slice(0, 10);

  // Split name roughly into Last Names and First Names
  const formatName = (fullName) => {
    if (!fullName) return { top: '', bottom: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return { top: fullName, bottom: '' };
    
    // Assume first 2 words are last names in Mexico (Paterno Materno Nombres)
    const top = parts.slice(0, 2).join(' ');
    const bottom = parts.slice(2).join(' ');
    return { top, bottom };
  };

  const nameParts = formatName(selectedConductor?.nombre);
  const qrValue = selectedConductor ? `ID:${selectedConductor.id}|TARJETON:${selectedConductor.tarjeton}` : 'SITMAH';
  const fotoUrl = selectedConductor?.foto ? `${API_BASE}/storage/${selectedConductor.foto}` : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="generacion-gafete-container p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-4">
      {/* 
        This grid uses Tailwind classes. We hide the left column and controls when printing.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:p-0">
        
        {/* COLUMNA IZQUIERDA (Controles) - Hidden on print */}
        <div className="lg:col-span-4 flex flex-col gap-6 print:hidden">
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Controles del Gafete</h2>
            <p className="text-sm text-slate-500 mb-4">Busca un operador y completa los datos de expedición.</p>
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Buscar Operador</label>
            <input
              type="text"
              placeholder="Buscar por nombre o tarjetón..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6b1d33] focus:border-transparent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedConductor(null);
              }}
            />
            {searchTerm && !selectedConductor && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredConductores.length > 0 ? (
                  filteredConductores.map(c => (
                    <div
                      key={c.id}
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      onClick={() => {
                        setSelectedConductor(c);
                        setSearchTerm(c.nombre);
                      }}
                    >
                      <div className="font-bold text-slate-800">{c.nombre}</div>
                      <div className="text-xs text-slate-500 mt-1">Tarjetón: <span className="font-semibold text-slate-700">{c.tarjeton}</span></div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500">No se encontraron operadores.</div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Mes/Año Expedición</label>
              <AppleDatePicker
                value={fechaExpedicion}
                onChange={setFechaExpedicion}
                placeholder="Seleccionar Fecha"
                disableFuture={false}
                disablePast={false}
                mode="month"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Mes/Año Vigencia</label>
              <AppleDatePicker
                value={fechaVigencia}
                onChange={setFechaVigencia}
                placeholder="Seleccionar Fecha"
                disableFuture={false}
                disablePast={false}
                mode="month"
              />
            </div>
          </div>

          <div className="mt-auto pt-6">
            <button
              onClick={handlePrint}
              disabled={!selectedConductor}
              className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                selectedConductor 
                  ? 'bg-[#6b1d33] hover:bg-[#8a2542] text-white shadow-md' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir Gafete
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA (Vista Previa) */}
        <div className="lg:col-span-8 flex justify-center items-start overflow-x-auto print:overflow-visible print:col-span-12 print:block">
          
          <div className="print-area relative w-full max-w-[850px] bg-white print:max-w-[850px] shadow-xl print:shadow-none mx-auto overflow-hidden rounded-md print:rounded-none"
               style={{ aspectRatio: '850 / 540' }}>
            
            {/* Background Template */}
            <div 
              className="absolute inset-0 bg-no-repeat bg-center bg-contain"
              style={{ backgroundImage: `url(${plantillaGafete})` }}
            ></div>

            {selectedConductor && (
              <>
                <div className="absolute bg-slate-100 flex items-center justify-center overflow-hidden z-10"
                     style={{
                        top: '30%', left: '65%', width: '16.5%', height: '30%'
                     }}>
                  {fotoUrl ? (
                     <img 
                       src={fotoUrl} 
                       alt="Operador" 
                       className="w-full h-full object-cover" 
                       onError={(e) => {
                         e.target.onerror = null;
                         e.target.style.display = 'none';
                         if (e.target.nextElementSibling) {
                           e.target.nextElementSibling.style.display = 'block';
                         }
                       }}
                     />
                  ) : null}
                  <span 
                    className="text-slate-400 text-sm font-semibold"
                    style={{ display: fotoUrl ? 'none' : 'block' }}
                  >
                    FOTO
                  </span>
                </div>

                {/* 2. NOMBRE DEL OPERADOR - Lado Derecho */}
                <div className="absolute z-10 flex flex-col items-center justify-center"
                     style={{ left: '55%', top: '65%', width: '35%' }}>
                  <span className="font-bold text-[#451421] text-[1.2rem] uppercase tracking-wide leading-tight">{nameParts.top}</span>
                  <span className="font-medium text-[#6b1d33] text-[1.1rem] uppercase leading-tight mt-0.5">{nameParts.bottom}</span>
                </div>

                {/* 3. CÓDIGO QR - Lado Izquierdo */}
                <div className="absolute bg-white p-1 z-10"
                     style={{ left: '19%', top: '13.5%', width: '16%', aspectRatio: '1/1' }}>
                  <QRCode
                    value={qrValue}
                    size={256}
                    style={{ height: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                  />
                </div>

                {/* 4. FECHA DE EXPEDICIÓN - Franja Guinda Izquierda */}
                <div className="absolute z-10 text-white font-bold tracking-wider text-[8px] uppercase"
                     style={{ left: '16.5%', top: '87%' }}>
                  {formatMonthYear(fechaExpedicion)}
                </div>

                {/* 5. FECHA DE VIGENCIA - Franja Guinda Izquierda */}
                <div className="absolute z-10 text-white font-bold tracking-wider text-[8px] uppercase"
                     style={{ left: '36.5%', top: '87%' }}>
                  {formatMonthYear(fechaVigencia)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Styles to isolate the badge on print */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Ocultar todo por defecto pero preservando el flujo para no romper React */
          body * {
            visibility: hidden;
          }
          
          /* Quitar márgenes de la página y ocultar cualquier desborde para evitar hojas extra */
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden !important;
            background: white;
          }

          /* Mostrar únicamente el área de impresión y todos sus hijos */
          .print-area, .print-area * {
            visibility: visible;
          }
          
          /* Centrar el gafete en la hoja y escalarlo a un tamaño de tarjetón promedio */
          .print-area {
            position: absolute !important;
            left: 50% !important;
            top: 35% !important;
            width: 100% !important;
            max-width: 850px !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            transform: translate(-50%, -50%) scale(0.95) !important;
            transform-origin: center center;
          }
          
          @page {
            size: landscape;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
}
