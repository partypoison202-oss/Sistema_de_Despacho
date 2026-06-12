import { Link } from 'react-router-dom'
import { headerConfig } from '../../config/header'
import './Header.css'

export default function Header() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="app-header__brand" aria-label={headerConfig.alt}>
          <img
            src={headerConfig.image}
            alt={headerConfig.alt}
            className="app-header__brand-image"
          />
        </Link>
      </div>
    </header>
  )
}
