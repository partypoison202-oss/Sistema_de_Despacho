import { Link, useNavigate } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div 
        className="app-header__inner" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '100%' 
        }}
      >
        {/* LOGO INSTITUCIONAL */}
        <Link to="/" className="app-header__brand" aria-label={headerConfig.alt}>
          <img
            src={headerConfig.image}
            alt={headerConfig.alt}
            className="app-header__brand-image"
          />
        </Link>

        {/* 🚀 BOTÓN DE CARGA DE EXCEL CORREGIDO */}
        <button 
          type="button" 
          onClick={(e) => {
            e.preventDefault(); 
            // 🔍 CORRECCIÓN: Cambiado de '/CargaExcel' a '/cargar-excel' para coincidir con App.jsx
            navigate('/cargar-excel'); 
          }} 
          className="btn-header-excel"
          style={{
            backgroundColor: '#BC955B', // Dorado institucional
            color: '#ffffff',
            border: 'none',
            padding: '0.6rem 1.4rem',
            borderRadius: '0.5rem',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'background-color 0.2s, transform 0.1s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#9E7B43'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#BC955B'}
        >
          {/* Icono sutil de suma (+) */}
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Cargar Excel
        </button>
      </div>
    </header>
  );
}