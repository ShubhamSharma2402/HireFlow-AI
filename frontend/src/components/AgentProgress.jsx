import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, X } from 'lucide-react';
import './AgentProgress.css';

const AgentProgress = ({ onCancel }) => {
  const steps = [
    'Parsing Resume',
    'Parsing Job Description',
    'Extracting Keywords',
    'Computing Match Score',
    'Improving Resume',
    'Generating Cover Letter',
    'Creating Q&A',
    'Finalizing Application'
  ];
  
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 600); // adjust timing for demo
    
    return () => clearInterval(interval);
  }, []);

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="agent-overlay">
      <div className="agent-modal glass-card">
        <button className="cancel-btn" onClick={onCancel}><X size={20}/></button>
        
        <div className="text-center mb-6">
          <Loader2 className="spinner mx-auto text-purple mb-4" size={48} />
          <h3>Agent is working...</h3>
          <p className="text-muted">{steps[currentStep]}</p>
        </div>
        
        <div className="progress-container mb-6">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="steps-list">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`agent-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
            >
              <div className="step-indicator">
                {index < currentStep ? <CheckCircle size={16} /> : <div className="dot"></div>}
              </div>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentProgress;
