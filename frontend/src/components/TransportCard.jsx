import { useNavigate } from 'react-router-dom';
import './TransportCard.css';

export default function TransportCard({ 
  title, 
  subtitle, 
  image, 
  route, 
  cantidad = 0, 
  cargando = false 
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="transport-card"
      onClick={() => navigate(route)}
    >
      {/* Badge circular en la esquina superior izquierda */}
      <div className="transport-card__badge">
        {cargando ? (
          <span className="transport-card__badge-loading">…</span>
        ) : (
          <span className="transport-card__badge-number">{cantidad}</span>
        )}
      </div>

      <div className="transport-card__image-wrap">
        <img src={image} alt={title} className="transport-card__image" />
      </div>
      <h2 className="transport-card__title">{title}</h2>
      <p className="transport-card__subtitle">{subtitle}</p>
    </button>
  );
}