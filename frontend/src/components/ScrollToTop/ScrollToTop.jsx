import React, { useState, useEffect } from 'react';
import './ScrollToTop.css';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollContainer, setScrollContainer] = useState(null);

  const toggleVisibility = (e) => {
    const target = e.target === document ? document.documentElement : e.target;
    
    // Ignorar contenedores pequeños (dropdowns, modales pequeños, etc.)
    // Solo reaccionar a contenedores que ocupan al menos el 50% de la pantalla
    if (target.clientHeight < window.innerHeight * 0.5) return;

    if (target.scrollTop > 300) {
      setIsVisible(true);
      setScrollContainer(target);
    } else if (target === scrollContainer || !scrollContainer) {
      setIsVisible(false);
      if (target === scrollContainer) {
        setScrollContainer(null);
      }
    }
  };

  const scrollToTop = () => {
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    // Usar la fase de captura (true) para interceptar eventos de scroll en CUALQUIER contenedor
    window.addEventListener('scroll', toggleVisibility, true);
    return () => {
      window.removeEventListener('scroll', toggleVisibility, true);
    };
  }, [scrollContainer]);

  return (
    <div className="scroll-to-top">
      {isVisible && (
        <button onClick={scrollToTop} className="scroll-to-top__button" aria-label="Volver arriba">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5"
          >
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default ScrollToTop;
