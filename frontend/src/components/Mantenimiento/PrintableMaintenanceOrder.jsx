import React from 'react';
import stmLogo from '../../assets/logo-stm.webp';

/**
 * Componente estructurado idéntico al formato físico (Orientación Horizontal/Landscape).
 * Está diseñado para ser renderizado por html2canvas + jsPDF.
 */
const PrintableMaintenanceOrder = React.forwardRef(({ data }, ref) => {
  if (!data) return null;

  return (
    <div 
      ref={ref} 
      className="font-sans relative bg-white text-black"
      style={{
        width: '1100px', // Tamaño fijo apaisado (Landscape)
        minHeight: '850px',
        margin: '0 auto',
      }}
    >
      {/* === FRANJA COLOR SITMAH SUPERIOR === */}
      <div style={{ height: '16px', backgroundColor: '#6b1d33', width: '100%' }}></div>
      <div style={{ height: '4px', backgroundColor: '#9ca3af', width: '100%', marginBottom: '24px' }}></div>

      <div className="px-10 pb-8 relative z-10 flex flex-col h-full" style={{ minHeight: '806px' }}>
        {/* === HEADER === */}
        <div className="flex justify-between items-center border-b-4 pb-4 mb-6" style={{ borderColor: '#6b1d33' }}>
          <div className="flex items-center gap-4 w-1/4">
            <img src={stmLogo} alt="STM" className="h-14" />
          </div>
          <div className="text-center w-2/4">
            <h1 className="text-4xl font-black tracking-widest uppercase text-[#6b1d33]">Reporte de Falla</h1>
            <h2 className="text-2xl font-bold uppercase mt-1 text-gray-800">
              Orden de Mantenimiento ECO: <span className="underline underline-offset-4 font-black text-black">{data.eco}</span>
            </h2>
          </div>
          <div className="flex justify-end w-1/4">
            <div className="border-2 rounded-lg px-6 py-2 flex flex-col items-center shadow-sm" style={{ backgroundColor: '#fdf2f8', borderColor: '#6b1d33' }}>
              <span className="font-bold text-xs tracking-wider text-[#6b1d33]">INCIDENCIA</span>
              <span className="text-3xl font-black text-[#6b1d33]">{data.folio}</span>
            </div>
          </div>
        </div>

        {/* === INFO DEL OPERADOR Y SERVICIO === */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-5 mb-6 shadow-sm">
          <div className="grid grid-cols-12 gap-6 mb-4">
            <div className="col-span-8 flex gap-3 items-end border-b-2 pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-sm text-[#6b1d33]">OPERADOR:</span>
              <span className="flex-1 text-xl font-medium">{data.operador || '_________________________'}</span>
            </div>
            <div className="col-span-4 flex gap-3 items-end border-b-2 pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-sm text-[#6b1d33]">ID (TARJETÓN):</span>
              <span className="flex-1 text-xl font-medium text-center">{data.tarjeton || '_________'}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-6">
            <div className="flex gap-2 items-end border-b-2 pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-sm text-[#6b1d33]">FECHA:</span>
              <span className="flex-1 text-xl font-medium text-center">{data.fecha}</span>
            </div>
            <div className="flex gap-2 items-end border-b-2 pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-sm text-[#6b1d33]">SERVICIO:</span>
              <span className="flex-1 text-xl font-medium text-center">{data.servicio}</span>
            </div>
            <div className="flex gap-2 items-end border-b-2 pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-sm text-[#6b1d33]">CORRIDA:</span>
              <span className="flex-1 text-xl font-medium text-center">{data.corrida}</span>
            </div>
            <div className="flex gap-2 items-end border-b-2 pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-sm text-[#6b1d33]">KM:</span>
              <span className="flex-1 text-xl font-medium text-center">{data.km}</span>
            </div>
          </div>
        </div>

        {/* === TABLA DE REPORTES === */}
        <div className="border-2 rounded-t-lg overflow-hidden flex flex-col flex-1 min-h-[220px] mb-6 shadow-sm" style={{ borderColor: '#374151' }}>
          <div className="grid grid-cols-3 font-bold text-base uppercase text-center divide-x-2" style={{ backgroundColor: '#6b1d33', color: '#ffffff', borderColor: '#ffffff' }}>
            <div className="py-3" style={{ borderRightColor: '#ffffff' }}>Falla Reportada</div>
            <div className="py-3" style={{ borderRightColor: '#ffffff' }}>Diagnóstico</div>
            <div className="py-3">Descripción de Mantenimiento</div>
          </div>
          <div className="grid grid-cols-3 flex-1 divide-x-2" style={{ borderColor: '#374151' }}>
            <div className="p-4 text-base whitespace-pre-wrap font-medium" style={{ borderRightColor: '#374151' }}>{data.falla_reportada}</div>
            <div className="p-4 text-base whitespace-pre-wrap font-medium" style={{ borderRightColor: '#374151' }}>{data.diagnostico}</div>
            <div className="p-4 text-base whitespace-pre-wrap font-medium">{data.descripcion_mantenimiento}</div>
          </div>
        </div>

        {/* === TIEMPOS Y FIRMAS === */}
        <div className="grid grid-cols-12 gap-8 mb-4">
          
          {/* Tiempos */}
          <div className="col-span-4 flex flex-col justify-between space-y-4">
            <div className="flex items-center border-2 rounded-md overflow-hidden" style={{ borderColor: '#374151', backgroundColor: '#f3f4f6' }}>
              <span className="font-bold text-sm uppercase px-3 py-2 flex-1 border-r-2" style={{ borderColor: '#374151' }}>Hora de Reporte:</span>
              <span className="text-base px-4 font-bold w-36 flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>{data.hora_reporte}</span>
            </div>
            <div className="flex items-center border-2 rounded-md overflow-hidden" style={{ borderColor: '#374151', backgroundColor: '#f3f4f6' }}>
              <span className="font-bold text-sm uppercase px-3 py-2 flex-1 border-r-2" style={{ borderColor: '#374151' }}>Entrada Taller:</span>
              <span className="text-base px-4 font-bold w-36 flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>&nbsp;</span>
            </div>
            <div className="flex items-center border-2 rounded-md overflow-hidden" style={{ borderColor: '#374151', backgroundColor: '#f3f4f6' }}>
              <span className="font-bold text-sm uppercase px-3 py-2 flex-1 border-r-2" style={{ borderColor: '#374151' }}>Salida Taller:</span>
              <span className="text-base px-4 font-bold w-36 flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>&nbsp;</span>
            </div>
          </div>

          {/* Firmas */}
          <div className="col-span-8 grid grid-cols-3 gap-6">
            <div className="border-2 rounded-md h-36 flex flex-col shadow-sm" style={{ borderColor: '#374151' }}>
              <div className="font-bold text-center text-sm py-1.5" style={{ backgroundColor: '#374151', color: '#ffffff' }}>REPORTÓ</div>
              <div className="flex-1 flex flex-col items-center justify-end pb-3 relative bg-white">
                {data.firma_base64 && (
                  <img src={data.firma_base64} alt="Firma Reportó" className="absolute inset-0 w-full h-full object-contain px-2 py-1" />
                )}
                <span className="text-xs border-t-2 border-black pt-1 px-10 mt-auto relative z-10 w-4/5 text-center font-semibold">FIRMA</span>
              </div>
            </div>
            <div className="border-2 rounded-md h-36 flex flex-col shadow-sm" style={{ borderColor: '#374151' }}>
              <div className="font-bold text-center text-sm py-1.5" style={{ backgroundColor: '#374151', color: '#ffffff' }}>RECIBIÓ</div>
              <div className="flex-1 flex flex-col items-center justify-end pb-3 bg-white">
                <span className="text-xs border-t-2 border-black pt-1 px-4 w-4/5 text-center font-semibold">NOMBRE Y FIRMA</span>
              </div>
            </div>
            <div className="border-2 rounded-md h-36 flex flex-col shadow-sm" style={{ borderColor: '#374151' }}>
              <div className="font-bold text-center text-sm py-1.5" style={{ backgroundColor: '#374151', color: '#ffffff' }}>VALIDÓ</div>
              <div className="flex-1 flex flex-col items-center justify-end pb-3 bg-white">
                <span className="text-xs border-t-2 border-black pt-1 px-4 w-4/5 text-center font-semibold">NOMBRE Y FIRMA</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

export default PrintableMaintenanceOrder;
