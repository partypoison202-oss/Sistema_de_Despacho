import { headerConfig } from '../../config/header';
import './Header.css';

export default function Header() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        
        {/* LOGO 1: Ya no es un link */}
        <div className="app-header__brand">
          <img 
            src={headerConfig.image} 
            alt={headerConfig.alt} 
            className="app-header__brand-logo-1"
          />
        </div>
        
        {/* LOGO 2: Ya no es un link */}
        <div className="app-header__brand">
          <img 
            src="/images/sitmah_logo.png" 
            alt="Logo SITMAH" 
            className="app-header__brand-logo-2" 
          />
        </div>
        
      </div>
    </header>
  );
}