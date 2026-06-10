import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ModulePlaceholder from './pages/ModulePlaceholder'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/urbanus"
          element={
            <ModulePlaceholder
              title="Urbanus"
              subtitle="Unidades ECO001 – ECO100"
            />
          }
        />
        <Route
          path="/zafiro"
          element={
            <ModulePlaceholder
              title="Zafiro"
              subtitle="Unidades ECO100 – ECO200"
            />
          }
        />
        <Route
          path="/vagoneta"
          element={
            <ModulePlaceholder
              title="Vagoneta"
              subtitle="Unidades ECO300 – ECO400"
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
