import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* All main application routes require authentication */}
            <Route path="/" element={
              <ProtectedRoute><Home /></ProtectedRoute>
            } />
            <Route path="/results" element={
              <ProtectedRoute><Results /></ProtectedRoute>
            } />
            <Route path="/automation" element={
              <ProtectedRoute><Automation /></ProtectedRoute>
            } />
            <Route path="/jobs" element={
              <ProtectedRoute><JobsList /></ProtectedRoute>
            } />
            <Route path="/jobs/:jobId" element={
              <ProtectedRoute><JobDetail /></ProtectedRoute>
            } />

            {/* Catch-all redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
