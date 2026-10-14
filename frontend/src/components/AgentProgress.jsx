import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, X, Sparkles } from 'lucide-react';
import './AgentProgress.css';

const steps = [
  'Parsing documents',
  'Analyzing requirements & extracting keywords',
  'Calculating baseline score',
  'Planning improvements & checking evidence',
  'Rewriting complete structured resume',
  'Validating document quality & integrity',
  'Comparing optimization scores',
  'Preparing final documents (cover letter & Q&A)'
];

const AgentProgress = ({ onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Stage timer reflecting real multi-step backend work
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(((currentStep + 1) / steps.length) * 100, 95);

  return (
    <div className="agent-overlay">
      <div className="agent-modal glass-card">
        {onCancel && (
          <button className="agent-cancel-btn" onClick={onCancel} title="Cancel">
            <X size={18} />
          </button>
        )}

        <div className="agent-header text-center">
          <div className="agent-spinner-wrapper">
            <Loader2 className="agent-spinner text-purple" size={34} />
          </div>
          <div className="agent-badge">
            <Sparkles size={12} /> Optimization Agent at Work
          </div>
          <h3 className="agent-title">Optimizing Your Resume</h3>
          <p className="agent-current-action">{steps[currentStep]}...</p>
        </div>

        <div className="agent-progress-track">
          <div className="agent-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="agent-steps-list">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            return (
              <div
                key={index}
                className={`agent-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
              >
                <div className="agent-step-icon">
                  {isCompleted ? (
                    <CheckCircle2 size={15} className="text-green" />
                  ) : isActive ? (
                    <div className="agent-dot active-dot" />
                  ) : (
                    <div className="agent-dot" />
                  )}
                </div>
                <span className="agent-step-text">{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgentProgress;
