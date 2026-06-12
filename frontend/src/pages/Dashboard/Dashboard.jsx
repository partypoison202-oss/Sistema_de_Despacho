import Header from '../../components/Header/Header'
import TransportCard from '../../components/TransportCard'
import { transportModules } from '../../config/transportModules'
import './Dashboard.css'

export default function Dashboard() {
  return (
    <div className="dashboard">
      <Header />

      <main className="dashboard__main">
        <p className="dashboard__eyebrow">Seleccione el tipo de transporte</p>
        <h1 className="dashboard__title">Flota de Unidades</h1>
        <p className="dashboard__subtitle">
          Toque la imagen del transporte para comenzar el registro
        </p>

        <div className="dashboard__grid">
          {transportModules.map((module) => (
            <TransportCard
              key={module.id}
              title={module.title}
              subtitle={module.subtitle}
              image={module.image}
              route={module.route}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
