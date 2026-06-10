import { useNavigate } from 'react-router-dom'
import './TransportCard.css'

export default function TransportCard({ title, subtitle, image, route }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="transport-card"
      onClick={() => navigate(route)}
    >
      <div className="transport-card__image-wrap">
        <img src={image} alt={title} className="transport-card__image" />
      </div>
      <h2 className="transport-card__title">{title}</h2>
      <p className="transport-card__subtitle">{subtitle}</p>
    </button>
  )
}
