import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Results from './pages/Results';
import Login from './pages/Login';
import Automation from './pages/Automation';
import JobsList from './pages/JobsList';
import JobDetail from './pages/JobDetail';

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Accessible without auth (manual mode) */}
            <Route path="/" element={<Home />} />
            <Route path="/results" element={<Results />} />

            {/* Auth-protected routes (automation mode) */}
            <Route path="/automation" element={
              <ProtectedRoute><Automation /></ProtectedRoute>
            } />
            <Route path="/jobs" element={
              <ProtectedRoute><JobsList /></ProtectedRoute>
            } />
            <Route path="/jobs/:jobId" element={
              <ProtectedRoute><JobDetail /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
