import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ScenarioList from './components/ScenarioList'
import ScenarioDetail from './components/ScenarioDetail'
import FisDashboard from './components/FisDashboard'
import ExecutionHistory from './components/ExecutionHistory'
import { ApiProvider } from './contexts/ApiContext'

function App() {
  return (
    <ApiProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<ScenarioList />} />
            <Route path="/scenarios" element={<ScenarioList />} />
            <Route path="/scenarios/:id" element={<ScenarioDetail />} />
            <Route path="/fis" element={<FisDashboard />} />
            <Route path="/executions" element={<ExecutionHistory />} />
          </Routes>
        </Layout>
      </Router>
    </ApiProvider>
  )
}

export default App 