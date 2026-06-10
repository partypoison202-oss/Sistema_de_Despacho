import { Link } from 'react-router-dom'
import Header from '../components/Header'
import './ModulePlaceholder.css'

export default function ModulePlaceholder({ title, subtitle }) {
  return (
    <div className="module-page">
      <Header />

      <main className="module-page__main">
        <p className="module-page__eyebrow">{subtitle}</p>
        <h1 className="module-page__title">{title}</h1>
        <p className="module-page__message">
          Módulo en construcción. Aquí irá el formulario de registro.
        </p>
        <Link to="/" className="module-page__back">
          ← Volver al inicio
        </Link>
      </main>
    </div>
  )
}
