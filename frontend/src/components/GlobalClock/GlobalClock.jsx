import React, { useState, useEffect } from 'react';

const GlobalClock = () => {
  const [time, setTime] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
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
    });
  };

  const formatTimeShort = (date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className="fixed top-[80px] right-4 lg:top-4 z-[9999] bg-white/90 backdrop-blur-sm shadow-md rounded-xl px-4 py-2 border border-gray-200 cursor-pointer flex flex-col items-end transition-all duration-300 hover:shadow-lg hover:bg-white"
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
  );
};

export default GlobalClock;
