import React, { useEffect, useState } from 'react';
import './ScoreVisualizer.css';

const ScoreVisualizer = ({ score }) => {
  const [animatedBefore, setAnimatedBefore] = useState(0);
  const [animatedAfter, setAnimatedAfter] = useState(0);
  
  useEffect(() => {
    const animate = (target, setter) => {
      let current = 0;
      const step = Math.ceil(target / 50);
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(current);
        }
      }, 20);
    };
    
    animate(score.before, setAnimatedBefore);
    animate(score.after, setAnimatedAfter);
  }, [score]);

  const getColor = (val) => {
    if (val < 50) return 'var(--red)';
    if (val < 70) return 'var(--yellow)';
    return 'var(--green)';
  };

  const CircleScore = ({ val, label }) => {
    const dashArray = 251.2;
    const dashOffset = dashArray - (dashArray * val) / 100;
    const color = getColor(val);
    
    return (
      <div className="circle-score">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-glass)" strokeWidth="8" />
          <circle 
            cx="50" cy="50" r="40" 
            fill="none" 
            stroke={color} 
            strokeWidth="8" 
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="circle-content">
          <span className="score-val">{val}</span>
        </div>
        <p className="score-label">{label}</p>
      </div>
    );
  };

  return (
    <div className="score-visualizer">
      <div className="glass-card score-hero">
        <div className="score-circles">
          <CircleScore val={animatedBefore} label="Original Score" />
          <div className="score-arrow">→</div>
          <CircleScore val={animatedAfter} label="Optimized Score" />
        </div>
        <div className="improvement-badge">
          +{score.after - score.before} Points (+{Math.round(((score.after - score.before)/score.before)*100)}%)
        </div>
      </div>
      
      <div className="breakdown-grid">
        <div className="glass-card breakdown-card">
          <h3>Score Breakdown</h3>
          {Object.entries(score.breakdown).map(([key, val]) => (
            <div key={key} className="breakdown-row">
              <span className="capitalize">{key}</span>
              <div className="bar-track">
                <div 
                  className="bar-fill" 
                  style={{ width: `${val}%`, backgroundColor: getColor(val) }}
                ></div>
              </div>
              <span className="val-text">{val}%</span>
            </div>
          ))}
        </div>
        
        <div className="glass-card info-card">
          <h3>ATS Compatibility</h3>
          <p className="text-muted mb-4">Your resume has been reformatted to ensure perfect parsing by standard Applicant Tracking Systems.</p>
          <ul className="check-list">
            <li>✔ Standard section headers used</li>
            <li>✔ Complex tables/columns removed</li>
            <li>✔ Font types normalized</li>
            <li>✔ Action verbs maximized</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScoreVisualizer;
