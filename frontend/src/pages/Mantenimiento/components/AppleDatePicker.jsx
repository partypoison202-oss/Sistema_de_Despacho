import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const CALENDAR_WIDTH = 288; // w-72
const CALENDAR_HEIGHT = 320; // approx height

const AppleDatePicker = ({ value, onChange, placeholder = "Seleccionar fecha", disableFuture = true, disablePast = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const calendarRef = useRef(null);

  // Sincroniza el mes con la fecha seleccionada
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setCurrentMonth(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
      } else {
        setCurrentMonth(new Date(value));
      }
    }
  }, [value]);

  // Calcula la posición del calendario
  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 8;

    let left = rect.left + rect.width / 2 - CALENDAR_WIDTH / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - CALENDAR_WIDTH - margin));

    let top = rect.bottom + 8;
    if (top + CALENDAR_HEIGHT > window.innerHeight && rect.top - CALENDAR_HEIGHT - 8 > 0) {
      top = rect.top - CALENDAR_HEIGHT - 8;
    }

    setCoords({ top, left });
  }, []);

  // Reposiciona al abrir y en eventos de resize/scroll
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  // Cierra al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedButton = buttonRef.current && buttonRef.current.contains(event.target);
      const clickedCalendar = calendarRef.current && calendarRef.current.contains(event.target);
      if (!clickedButton && !clickedCalendar) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const today = new Date();
    if (disablePast && (prevMonth.getFullYear() < today.getFullYear() || (prevMonth.getFullYear() === today.getFullYear() && prevMonth.getMonth() < today.getMonth()))) {
      return;
    }
    setCurrentMonth(prevMonth);
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const today = new Date();
    if (disableFuture && (nextMonth.getFullYear() > today.getFullYear() || (nextMonth.getFullYear() === today.getFullYear() && nextMonth.getMonth() > today.getMonth()))) {
      return;
    }
    setCurrentMonth(nextMonth);
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
    const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const isFuture = disableFuture && currentDate > todayDateOnly;
    const isPast = disablePast && currentDate < todayDateOnly;
    const isDisabled = isFuture || isPast;

    days.push(
      <button
        key={`day-${i}`}
        type="button"
        disabled={isDisabled}
        onClick={(e) => { e.stopPropagation(); handleSelectDate(i); }}
        className={`w-8 h-8 flex items-center justify-center rounded-full text-xs transition-all duration-150
          ${isDisabled ? 'opacity-30 cursor-not-allowed text-slate-400 font-normal' : 'active:scale-90 font-semibold cursor-pointer'}
          ${!isDisabled && isSelected 
            ? 'bg-gradient-to-br from-[#6b1d33] to-[#8d2745] text-white shadow-md shadow-[#6b1d33]/30 scale-105' 
            : !isDisabled && isToday 
              ? 'text-[#6b1d33] bg-[#6b1d33]/15 font-bold border border-[#6b1d33]/30' 
              : !isDisabled ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' : ''}
        `}
      >
        {i}
      </button>
    );
  }

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="relative inline-block w-full select-none" ref={wrapperRef}>
      <button
        ref={buttonRef}
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

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={calendarRef}
          className="fixed z-[99999] bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-100 p-4 w-72 animate-fade-in-up transition-all"
          style={{ 
            top: coords.top, 
            left: coords.left,
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 1px 1px rgba(0,0,0,0.05)' 
          }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <button 
              type="button" 
              onClick={handlePrevMonth} 
              disabled={disablePast && currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth()}
              className={`p-1.5 rounded-full transition-all ${disablePast && currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth() ? 'opacity-30 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-[#6b1d33] active:scale-95'}`}
              title="Mes anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800 text-sm tracking-tight">
                {monthNames[currentMonth.getMonth()]}
              </span>
              <select
                value={currentMonth.getFullYear()}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value, 10);
                  const newDate = new Date(newYear, currentMonth.getMonth(), 1);
                  setCurrentMonth(newDate);
                }}
                className="text-[#6b1d33] font-extrabold text-sm bg-transparent border-none outline-none cursor-pointer hover:bg-slate-100 rounded px-1"
                style={{ appearance: 'none', paddingRight: '0.2rem' }}
              >
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 80 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <button 
              type="button" 
              onClick={handleNextMonth} 
              disabled={disableFuture && currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth()}
              className={`p-1.5 rounded-full transition-all ${disableFuture && currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth() ? 'opacity-30 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-[#6b1d33] active:scale-95'}`}
              title="Mes siguiente"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((day, idx) => (
              <div key={day} className={`text-center text-[10px] font-bold uppercase tracking-wider ${idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-500'}`}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>

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
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AppleDatePicker;