
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ResourcesPage from './pages/ResourcesPage';
import AdmissionSimulatorPage from './pages/AdmissionSimulatorPage';
import OrientationSimulatorPage from './pages/OrientationSimulatorPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ressources" element={<ResourcesPage />} />
            <Route path="/simulateur-admission" element={<AdmissionSimulatorPage />} />
            <Route path="/orientation-v2" element={<OrientationSimulatorPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
