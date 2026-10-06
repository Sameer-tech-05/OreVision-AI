import React, {
  useState,
  useEffect,
  useCallback,
} from 'react'

import Navbar from './components/Navbar.jsx'
import Dashboard from './components/Dashboard.jsx'
import PredictionForm from './components/PredictionForm.jsx'
import PredictionResult from './components/PredictionResult.jsx'
import ProspectivityMap from './components/ProspectivityMap.jsx'
import Analytics from './components/Analytics.jsx'
import Footer from './components/Footer.jsx'

import { getHealth } from './services/api.js'

import './App.css'


/* =========================================================
   ERROR BOUNDARY
========================================================= */

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error)
    console.error('Component Stack:', errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '400px',
            padding: '40px',
            color: '#f0f4f4',
            background: '#151a1a',
            borderRadius: '16px',
            margin: '30px',
          }}
        >
          <h2
            style={{
              color: '#ff7046',
              marginBottom: '12px',
            }}
          >
            Prediction Page Error
          </h2>

          <p
            style={{
              color: '#9aa3a3',
              marginBottom: '18px',
            }}
          >
            Something went wrong while loading this page.
          </p>

          <div
            style={{
              padding: '15px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: '#e8eeee',
              fontFamily: 'monospace',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.error?.message ||
              'Unknown React error'}
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '11px 18px',
              border: '0',
              borderRadius: '8px',
              background: '#ef5e35',
              color: '#fff',
              fontWeight: '800',
              cursor: 'pointer',
            }}
          >
            Reload Application
          </button>
        </div>
      )
    }

    return this.props.children
  }
}


/* =========================================================
   MAIN APP
========================================================= */

export default function App() {

  const [activeView, setActiveView] =
    useState('dashboard')

  const [health, setHealth] =
    useState(null)

  const [healthError, setHealthError] =
    useState(null)

  const [lastPrediction, setLastPrediction] =
    useState(null)

  const [predictionHistory, setPredictionHistory] =
    useState([])


  /* =======================================================
     BACKEND HEALTH
  ======================================================= */

  const refreshHealth = useCallback(async () => {

    try {

      const data = await getHealth()

      setHealth(data)

      setHealthError(null)

    } catch (err) {

      console.error(
        'Backend health error:',
        err
      )

      setHealth(null)

      setHealthError(
        err?.message ||
        'Backend connection failed'
      )
    }

  }, [])


  /* =======================================================
     HEALTH CHECK
  ======================================================= */

  useEffect(() => {

    refreshHealth()

    const interval = setInterval(
      refreshHealth,
      30000
    )

    return () => {
      clearInterval(interval)
    }

  }, [refreshHealth])


  /* =======================================================
     NEW PREDICTION
  ======================================================= */

  const handleNewPrediction = useCallback(
    (prediction) => {

      if (!prediction) {
        return
      }

      setLastPrediction(prediction)

      setPredictionHistory((prev) => [
        prediction,
        ...prev,
      ].slice(0, 25))

    },
    []
  )


  /* =======================================================
     VIEW PREDICTION ON MAP
  ======================================================= */

  const handleViewPredictionOnMap = useCallback(() => {

    if (!lastPrediction) {
      return
    }

    setActiveView('map')

  }, [lastPrediction])


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const handleNavigation = useCallback((view) => {

    console.log(
      'Navigation:',
      view
    )

    setActiveView(view)

  }, [])


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div className="app-shell">

      {/* ===================================================
          NAVBAR
      =================================================== */}

      <Navbar
        activeView={activeView}
        onNavigate={handleNavigation}
        health={health}
      />


      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main className="app-main">


        {/* =================================================
            DASHBOARD
        ================================================= */}

        {activeView === 'dashboard' && (

          <AppErrorBoundary>

            <Dashboard
              health={health}
              healthError={healthError}
              predictionHistory={predictionHistory}
              onNavigate={handleNavigation}
            />

          </AppErrorBoundary>

        )}


        {/* =================================================
            PREDICTION
        ================================================= */}

        {activeView === 'predict' && (

          <AppErrorBoundary>

            <div className="predict-view">

              <PredictionForm
                onResult={handleNewPrediction}
              />

              <PredictionResult
                prediction={lastPrediction}
                onViewMap={
                  handleViewPredictionOnMap
                }
              />

            </div>

          </AppErrorBoundary>

        )}


        {/* =================================================
            MAP
        ================================================= */}

        {activeView === 'map' && (

          <AppErrorBoundary>

            <ProspectivityMap
              prediction={lastPrediction}
              predictionHistory={
                predictionHistory
              }
              onPrediction={
                handleNewPrediction
              }
            />

          </AppErrorBoundary>

        )}


        {/* =================================================
            ANALYTICS
        ================================================= */}

        {activeView === 'analytics' && (

          <AppErrorBoundary>

            <Analytics
              predictionHistory={
                predictionHistory
              }
            />

          </AppErrorBoundary>

        )}

      </main>


      {/* ===================================================
          FOOTER
      =================================================== */}

      <Footer />

    </div>
  )
}