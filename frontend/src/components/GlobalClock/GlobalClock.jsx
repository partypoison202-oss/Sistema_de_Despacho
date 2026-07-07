import React, { useState, useEffect } from 'react';

const GlobalClock = ({ className = "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[9999] transition-all" }) => {
  const [time, setTime] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Al inicializar, checar localStorage para persistencia de tema
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
      }
    } else {
      // Auto-detectar preferencia del sistema si no hay nada guardado
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark || document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      }
    }
    
    // Escuchar cambios de preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
          setIsDarkMode(true);
        } else {
          document.documentElement.classList.remove('dark');
          setIsDarkMode(false);
        }
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    
    return () => clearInterval(timer);
  }, []);

  const toggleDarkMode = (e) => {
    e.stopPropagation();
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    setIsDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

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
    });
  };

  const formatTimeShort = (date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Botón de Modo Oscuro */}
      <button 
        onClick={toggleDarkMode}
        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-md rounded-xl p-2 border border-gray-200 cursor-pointer flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:bg-gray-50 text-gray-700"
        title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
      >
        {isDarkMode ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
          </svg>
        )}
      </button>

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
