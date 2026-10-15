import React from 'react';
import './MenuFooter.css';

export default function MenuFooter() {
  return (
    <footer className="menu-footer">
      <div className="menu-footer__container">
        {/* Lado Izquierdo: Copyright */}
        <div className="menu-footer__left">
          <p className="menu-footer__copyright">
            Copyrights &copy; 2026 Todos los derechos reservados por STM.
          </p>
        </div>

        {/* Lado Derecho: Contacto en 3 líneas compactas */}
        <div className="menu-footer__right">
          <span className="menu-footer__line">
            <strong className="menu-footer__heading">Contacto:</strong> Blvd. Felipe &Aacute;ngeles KM 86 + 40
          </span>
          <span className="menu-footer__line">
            Col. Venta Prieta, Pachuca de Soto, Hgo., C.P. 42083
          </span>
          <a href="tel:+527711074084" className="menu-footer__phone">
            +52 (771) 107 4084
          </a>
        </div>
      </div>
    </footer>
  );
}
