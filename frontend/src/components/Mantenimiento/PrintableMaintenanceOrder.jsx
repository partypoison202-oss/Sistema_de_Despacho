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
      className="font-sans relative bg-white text-black flex flex-col"
      style={{
        width: '1100px',
        minHeight: '850px',
        margin: '0 auto',
      }}
    >
      {/* === HEADER (ESTILO INICIO DE OPERACIÓN) === */}
      <div className="flex justify-between items-center px-8 py-4" style={{ backgroundColor: '#6b1d33' }}>
        <div className="flex items-center w-1/3">
          <img 
            src={stmLogo} 
            alt="STM" 
            className="h-12" 
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <div className="text-right w-2/3 text-white">
          <h1 className="text-2xl font-black tracking-widest uppercase">Reporte de Falla</h1>
          <h2 className="text-lg font-bold uppercase mt-0.5">
            Orden de Mantenimiento ECO: <span className="font-black text-white">{data.eco}</span>
          </h2>
        </div>
      </div>

      <div className="px-10 pb-8 relative z-10 flex flex-col h-full mt-6 flex-1">
        
        {/* === FECHA, INCIDENCIA Y FOLIO === */}
        <div className="flex justify-between items-center mb-4">
          <div className="border-[3px] rounded-xl px-8 py-2 shadow-sm flex items-center justify-center min-w-[180px]" style={{ borderColor: '#b8924b' }}>
            <span className="text-xl font-black text-[#6b1d33] uppercase">{data.fecha}</span>
          </div>

          <div className="flex justify-end gap-3">
            <div className="border-2 rounded-lg px-4 py-1 flex flex-col items-center justify-center shadow-sm min-w-[120px]" style={{ backgroundColor: '#ffffff', borderColor: '#b8924b' }}>
              <span className="font-bold text-[9px] tracking-wider text-[#6b1d33] mb-0.5">INCIDENCIA</span>
              <span className="text-xl font-black text-[#6b1d33] leading-none">{data.incidencia}</span>
            </div>
            {data.folio && (
              <div className="border-2 rounded-lg px-4 py-1 flex flex-col items-center justify-center shadow-sm min-w-[140px]" style={{ backgroundColor: '#ffffff', borderColor: '#b8924b' }}>
                <span className="font-bold text-[9px] tracking-wider text-[#6b1d33] mb-0.5">FOLIO ORDEN</span>
                <span className="text-xl font-black text-[#6b1d33] leading-none">{data.folio}</span>
              </div>
            )}
          </div>
        </div>

        {/* === INFO DEL OPERADOR Y SERVICIO === */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-12 gap-4 mb-3">
            <div className="col-span-8 flex gap-2 items-end border-b pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-[13px] text-[#6b1d33]">OPERADOR:</span>
              <span className="flex-1 text-lg font-semibold uppercase">{data.operador || ''}</span>
            </div>
            <div className="col-span-4 flex gap-2 items-end border-b pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-[13px] text-[#6b1d33]">ID (TARJETÓN):</span>
              <span className="flex-1 text-lg font-semibold text-center uppercase">{data.tarjeton || ''}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="flex gap-2 items-end border-b pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-[13px] text-[#6b1d33]">SERVICIO:</span>
              <span className="flex-1 text-lg font-semibold text-center uppercase">{data.servicio || ''}</span>
            </div>
            <div className="flex gap-2 items-end border-b pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-[13px] text-[#6b1d33]">CORRIDA:</span>
              <span className="flex-1 text-lg font-semibold text-center uppercase">{data.corrida || ''}</span>
            </div>
            <div className="flex gap-2 items-end border-b pb-1" style={{ borderColor: '#d1d5db' }}>
              <span className="font-bold text-[13px] text-[#6b1d33]">KM:</span>
              <span className="flex-1 text-lg font-semibold text-center uppercase">{data.km || ''}</span>
            </div>
          </div>
        </div>

        {/* === TABLA DE REPORTES === */}
        <div className="border-2 rounded-t-lg overflow-hidden flex flex-col flex-1 min-h-[220px] mb-4 shadow-sm" style={{ borderColor: '#374151' }}>
          <div className="grid grid-cols-3 font-bold text-sm uppercase text-center divide-x-2" style={{ backgroundColor: '#6b1d33', color: '#ffffff', borderColor: '#ffffff' }}>
            <div className="py-2" style={{ borderRightColor: '#ffffff' }}>Falla Reportada</div>
            <div className="py-2" style={{ borderRightColor: '#ffffff' }}>Diagnóstico</div>
            <div className="py-2">Descripción de Mantenimiento</div>
          </div>
          <div className="grid grid-cols-3 flex-1 divide-x-2" style={{ borderColor: '#374151' }}>
            <div className="p-3 text-sm whitespace-pre-wrap font-semibold uppercase" style={{ borderRightColor: '#374151' }}>{data.falla_reportada}</div>
            <div className="p-3 text-sm whitespace-pre-wrap font-semibold" style={{ borderRightColor: '#374151' }}>{data.diagnostico}</div>
            <div className="p-3 text-sm whitespace-pre-wrap font-semibold">{data.descripcion_mantenimiento}</div>
          </div>
        </div>

        {/* === TIEMPOS Y FIRMAS === */}
        <div className="grid grid-cols-12 gap-6 mb-2">
          
          {/* Tiempos */}
          <div className="col-span-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center border rounded-md overflow-hidden" style={{ borderColor: '#374151', backgroundColor: '#f3f4f6' }}>
              <span className="font-bold text-xs uppercase px-2 py-1.5 w-[55%] flex items-center justify-center border-r" style={{ borderColor: '#374151' }}>Hora de Reporte:</span>
              <span className="text-sm px-2 font-bold w-[45%] flex items-center justify-center" style={{ backgroundColor: '#ffffff', minHeight: '32px' }}>{data.hora_reporte}</span>
            </div>
            <div className="flex items-center border rounded-md overflow-hidden" style={{ borderColor: '#374151', backgroundColor: '#f3f4f6' }}>
              <span className="font-bold text-xs uppercase px-2 py-1.5 w-[55%] flex items-center justify-center border-r" style={{ borderColor: '#374151' }}>Entrada Taller:</span>
              <span className="text-sm px-2 font-bold w-[45%] flex items-center justify-center" style={{ backgroundColor: '#ffffff', minHeight: '32px' }}>&nbsp;</span>
            </div>
            <div className="flex items-center border rounded-md overflow-hidden" style={{ borderColor: '#374151', backgroundColor: '#f3f4f6' }}>
              <span className="font-bold text-xs uppercase px-2 py-1.5 w-[55%] flex items-center justify-center border-r" style={{ borderColor: '#374151' }}>Salida Taller:</span>
              <span className="text-sm px-2 font-bold w-[45%] flex items-center justify-center" style={{ backgroundColor: '#ffffff', minHeight: '32px' }}>&nbsp;</span>
            </div>
          </div>

          {/* Firmas */}
          <div className="col-span-8 grid grid-cols-3 gap-4">
            <div className="border rounded-md h-[120px] flex flex-col shadow-sm" style={{ borderColor: '#374151' }}>
              <div className="font-bold text-center text-xs py-1" style={{ backgroundColor: '#374151', color: '#ffffff' }}>REPORTÓ</div>
              <div className="flex-1 flex flex-col items-center justify-end pb-2 relative bg-white">
                {data.firma_base64 && (
                  <img src={data.firma_base64} alt="Firma Reportó" className="absolute inset-0 w-full h-full object-contain px-2 py-1" />
                )}
                <span className="text-[10px] border-t border-black pt-1 px-8 mt-auto relative z-10 w-[85%] text-center font-semibold tracking-wider">FIRMA</span>
              </div>
            </div>
            <div className="border rounded-md h-[120px] flex flex-col shadow-sm" style={{ borderColor: '#374151' }}>
              <div className="font-bold text-center text-xs py-1" style={{ backgroundColor: '#374151', color: '#ffffff' }}>RECIBIÓ</div>
              <div className="flex-1 flex flex-col items-center justify-end pb-2 bg-white">
                <span className="text-[10px] border-t border-black pt-1 px-4 w-[85%] text-center font-semibold tracking-wider">NOMBRE Y FIRMA</span>
              </div>
            </div>
            <div className="border rounded-md h-[120px] flex flex-col shadow-sm" style={{ borderColor: '#374151' }}>
              <div className="font-bold text-center text-xs py-1" style={{ backgroundColor: '#374151', color: '#ffffff' }}>VALIDÓ</div>
              <div className="flex-1 flex flex-col items-center justify-end pb-2 bg-white">
                <span className="text-[10px] border-t border-black pt-1 px-4 w-[85%] text-center font-semibold tracking-wider">NOMBRE Y FIRMA</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

export default PrintableMaintenanceOrder;
