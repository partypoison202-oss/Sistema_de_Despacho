import React, { useState, useEffect, useRef } from 'react';

const AppleDatePicker = ({ value, onChange, placeholder = "Seleccionar fecha" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value) {
      // Evitar problemas de desfase horario separando YYYY-MM-DD
      const parts = value.split('-');
      if (parts.length === 3) {
        setCurrentMonth(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
      } else {
        setCurrentMonth(new Date(value));
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (day) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleTodaySelect = (e) => {
    e.stopPropagation();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setCurrentMonth(today);
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  // Formatear texto para mostrar en el botón
  const formatDisplayValue = () => {
    if (!value) return placeholder;
    const parts = value.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return value;
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }

  // Parsear fecha seleccionada actual
  let selYear = null, selMonth = null, selDay = null;
  if (value) {
    const parts = value.split('-');
    if (parts.length === 3) {
      selYear = parseInt(parts[0]);
      selMonth = parseInt(parts[1]) - 1;
      selDay = parseInt(parts[2]);
    }
  }

  const today = new Date();

  for (let i = 1; i <= daysInMonth; i++) {
    const isSelected = selYear === currentMonth.getFullYear() && selMonth === currentMonth.getMonth() && selDay === i;
    const isToday = today.getDate() === i && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();

    days.push(
      <button
        key={`day-${i}`}
        type="button"
        onClick={(e) => { e.stopPropagation(); handleSelectDate(i); }}
        className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-all duration-150 active:scale-90
          ${isSelected 
            ? 'bg-gradient-to-br from-[#6b1d33] to-[#8d2745] text-white shadow-md shadow-[#6b1d33]/30 scale-105' 
            : isToday 
              ? 'text-[#6b1d33] bg-[#6b1d33]/15 font-bold border border-[#6b1d33]/30' 
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}
        `}
      >
        {i}
      </button>
    );
  }

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="relative inline-block w-full select-none" ref={dropdownRef}>
      {/* Botón trigger estilo iOS Pill / Card */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm hover:shadow hover:bg-white active:scale-[0.98] transition-all duration-150 cursor-pointer"
        style={{ minHeight: '42px' }}
      >
        <div className="flex items-center gap-2 text-slate-700">
          <svg className="w-4 h-4 text-[#6b1d33]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-xs sm:text-sm font-semibold ${value ? 'text-slate-800' : 'text-slate-400'}`}>
            {formatDisplayValue()}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#6b1d33]' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover flotante con diseño iOS */}
      {isOpen && (
        <div 
          className="absolute z-[9999] mt-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-100 p-4 w-72 animate-fade-in-up transition-all"
          style={{ boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 1px 1px rgba(0,0,0,0.05)' }}
        >
          {/* Header del Calendario */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button 
              type="button" 
              onClick={handlePrevMonth} 
              className="p-1.5 rounded-full hover:bg-slate-100 text-[#6b1d33] active:scale-95 transition-all"
              title="Mes anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="font-bold text-slate-800 text-sm tracking-tight">
              {monthNames[currentMonth.getMonth()]} <span className="text-[#6b1d33] font-extrabold">{currentMonth.getFullYear()}</span>
            </span>

            <button 
              type="button" 
              onClick={handleNextMonth} 
              className="p-1.5 rounded-full hover:bg-slate-100 text-[#6b1d33] active:scale-95 transition-all"
              title="Mes siguiente"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((day, idx) => (
              <div key={day} className={`text-center text-[10px] font-bold uppercase tracking-wider ${idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-500'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Matriz de Días */}
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>

          {/* Pie de Popover: Botón Hoy */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center px-1">
            <button
              type="button"
              onClick={handleTodaySelect}
              className="text-xs font-bold text-[#6b1d33] hover:text-[#8d2745] transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppleDatePicker;
