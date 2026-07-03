import React, { useState, useEffect } from 'react';

const GlobalClock = () => {
  const [time, setTime] = useState(new Date());

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

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-white/90 backdrop-blur-sm shadow-lg rounded-xl px-4 py-2 border border-gray-200 pointer-events-none flex flex-col items-end">
      <span className="text-base font-bold text-gray-800">{formatTime(time)}</span>
      <span className="text-xs font-medium text-gray-500 capitalize">{formatDate(time)}</span>
    </div>
  );
};

export default GlobalClock;
