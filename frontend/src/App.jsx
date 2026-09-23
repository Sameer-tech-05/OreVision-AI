import { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar.jsx'
import Dashboard from './components/Dashboard.jsx'
import PredictionForm from './components/PredictionForm.jsx'
import PredictionResult from './components/PredictionResult.jsx'
import ProspectivityMap from './components/ProspectivityMap.jsx'
import Analytics from './components/Analytics.jsx'
import Footer from './components/Footer.jsx'
import { getHealth } from './services/api.js'
import './App.css'

export default function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(null)
  const [lastPrediction, setLastPrediction] = useState(null)
  const [predictionHistory, setPredictionHistory] = useState([])

  const refreshHealth = useCallback(async () => {
    try {
      const data = await getHealth()
      setHealth(data)
      setHealthError(null)
    } catch (err) {
      setHealth(null)
      setHealthError(err.message)
    }
  }, [])

  useEffect(() => {
    refreshHealth()
    const interval = setInterval(refreshHealth, 30000)
    return () => clearInterval(interval)
  }, [refreshHealth])

  const handleNewPrediction = (prediction) => {
    setLastPrediction(prediction)
    setPredictionHistory((prev) => [prediction, ...prev].slice(0, 25))
  }

  return (
    <div className="app-shell">
      <Navbar activeView={activeView} onNavigate={setActiveView} health={health} />

      <main className="app-main">
        {activeView === 'dashboard' && (
          <Dashboard
            health={health}
            healthError={healthError}
            predictionHistory={predictionHistory}
            onNavigate={setActiveView}
          />
        )}

        {activeView === 'predict' && (
          <div className="predict-view">
            <PredictionForm onResult={handleNewPrediction} />
            <PredictionResult prediction={lastPrediction} />
          </div>
        )}

        {activeView === 'map' && <ProspectivityMap predictionHistory={predictionHistory} />}

        {activeView === 'analytics' && <Analytics predictionHistory={predictionHistory} />}
      </main>

      <Footer />
    </div>
  )
}
