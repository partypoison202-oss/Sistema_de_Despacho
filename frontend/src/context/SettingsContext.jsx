import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('appFontSize') || 'normal';
  });
  const [showClock, setShowClock] = useState(() => {
    const saved = localStorage.getItem('appShowClock');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('appFontSize', fontSize);
    
    // Aplicar clase al elemento root (html)
    const root = document.documentElement;
    root.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-xlarge');
    
    if (fontSize === 'large') {
      root.classList.add('font-scale-large');
    } else if (fontSize === 'xlarge') {
      root.classList.add('font-scale-xlarge');
    } else {
      root.classList.add('font-scale-normal');
    }
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('appShowClock', showClock);
  }, [showClock]);

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, showClock, setShowClock }}>
      {children}
    </SettingsContext.Provider>
  );
};
