import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

const GlobalClock = ({ className = "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[9999] transition-all" }) => {
  const { user } = useContext(AuthContext);
  const { showClock } = useSettings();
  const [time, setTime] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    // Asegurar que siempre esté en modo claro
    document.documentElement.classList.remove('dark');
    return () => clearInterval(timer);
  }, []);
  const formatDate = (date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatTimeShort = (date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // No mostrar nada si no hay usuario autenticado o si el reloj está desactivado
  if (!user || !showClock) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Reloj */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-md rounded-xl px-4 py-2 border border-gray-200 cursor-pointer flex flex-col items-end transition-all duration-300 hover:shadow-lg hover:bg-gray-50"
        title="Haz clic para ver más detalles"
      >
        <span className={`font-bold text-gray-800 transition-all duration-300 ${isExpanded ? 'text-base' : 'text-sm'}`}>
          {isExpanded ? formatTime(time) : formatTimeShort(time)}
        </span>
        {isExpanded && (
          <span className="text-xs font-medium text-gray-500 capitalize mt-1 animate-fade-in">
            {formatDate(time)}
          </span>
        )}
      </div>
    </div>
  );
};

export default GlobalClock;
