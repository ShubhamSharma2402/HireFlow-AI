import React, { useEffect, useState } from 'react';
import { TrendingUp, Target, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import './ScoreVisualizer.css';

const stopReasonLabels = {
  threshold_met_at_baseline: 'Already met threshold — optimization skipped',
  threshold_met: 'Score threshold reached',
  insufficient_improvement: 'Stopped: further improvement was minimal',
  max_attempts_reached: 'All optimization attempts used',
  rewrite_failed: 'Rewriter encountered an issue — best result selected',
  baseline_sufficient: 'Resume already well-matched',
};

const toText = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.description || val.suggestion || val.issue || val.skill || val.text || val.name || JSON.stringify(val);
  }
  return String(val);
};

const ScoreVisualizer = ({ score, suggestions = [], atsIssues = [], stopReason = '', iterations = 0 }) => {
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
    if (val < 65) return 'var(--yellow)';
    if (val < 80) return 'var(--cyan)';
    return 'var(--green)';
  };

  const getLabel = (val) => {
    if (val < 50) return 'Low Match';
    if (val < 65) return 'Below Threshold';
    if (val < 80) return 'Good Match';
    return 'Strong Match';
  };

  const CircleScore = ({ val, label, size = 120 }) => {
    const r = size * 0.4;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (circumference * val) / 100;
    const color = getColor(val);

    return (
      <div className="circle-score">
        <div className="circle-score-ring" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
            />
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size/2} ${size/2})`}
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
            />
          </svg>
          <div className="circle-score-inner">
            <span className="circle-score-val" style={{ color }}>{val}</span>
            <span className="circle-score-pct">/ 100</span>
          </div>
        </div>
        <p className="circle-score-label">{label}</p>
        <p className="circle-score-sublabel" style={{ color }}>{getLabel(val)}</p>
      </div>
    );
  };

  const improvement = score.after - score.before;

  return (
    <div className="score-visualizer">
      {/* Main score display */}
      <div className="glass-card score-hero">
        <div className="score-circles">
          <CircleScore val={animatedBefore} label="Original Score" />
          <div className="score-arrow-area">
            <div className="score-arrow">→</div>
            {improvement > 0 && (
              <div className="improvement-pill" style={{ color: getColor(score.after) }}>
                +{improvement} pts
              </div>
            )}
            {improvement === 0 && (
              <div className="improvement-pill improvement-neutral">No change</div>
            )}
          </div>
          <CircleScore val={animatedAfter} label="Optimized Score" />
        </div>

        {/* Stop reason / iterations */}
        {(stopReason || iterations > 0) && (
          <div className="score-meta-row">
            {iterations > 0 && (
              <span className="score-meta-item">
                <TrendingUp size={14} /> {iterations} optimization attempt{iterations !== 1 ? 's' : ''}
              </span>
            )}
            {stopReason && stopReasonLabels[stopReason] && (
              <span className="score-meta-item">
                <Info size={14} /> {stopReasonLabels[stopReason]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Score breakdown + keyword coverage */}
      <div className="breakdown-grid">
        {/* Breakdown bars */}
        <div className="glass-card breakdown-card">
          <h3>Score Breakdown</h3>
          {Object.entries(score.breakdown || {}).map(([key, val]) => {
            const labelMap = {
              skillsScore: 'Skills Match',
              experienceScore: 'Experience Match',
              keywordsScore: 'Keyword Coverage',
              educationScore: 'Education Match',
              atsScore: 'ATS Readability',
            };
            return (
              <div key={key} className="breakdown-row">
                <span className="breakdown-label">{labelMap[key] || key}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${val}%`, backgroundColor: getColor(val) }}
                  />
                </div>
                <span className="val-text" style={{ color: getColor(val) }}>{val}%</span>
              </div>
            );
          })}
        </div>

        {/* Keyword coverage */}
        <div className="glass-card info-card">
          <h3>Keyword Coverage</h3>

          {/* Matched keywords */}
          {score.strongAreas && score.strongAreas.length > 0 && (
            <div className="keyword-group">
              <div className="keyword-group-header text-green">
                <CheckCircle2 size={14} /> Matched ({score.strongAreas.length})
              </div>
              <div className="keyword-tags">
                {score.strongAreas.map((kw, i) => (
                  <span key={i} className="kw-tag kw-matched">{toText(kw)}</span>
                ))}
              </div>
            </div>
          )}

          {/* Missing keywords */}
          {(score.missingKeywords || score.missingCriticalSkills || []).length > 0 && (
            <div className="keyword-group">
              <div className="keyword-group-header text-red">
                <AlertCircle size={14} /> Missing from Resume
              </div>
              <div className="keyword-tags">
                {[...new Set([
                  ...(score.missingCriticalSkills || []),
                  ...(score.missingKeywords || [])
                ])].slice(0, 12).map((kw, i) => (
                  <span key={i} className="kw-tag kw-missing">{toText(kw)}</span>
                ))}
              </div>
            </div>
          )}

          {/* ATS Issues */}
          {atsIssues && atsIssues.length > 0 && (
            <div className="keyword-group">
              <div className="keyword-group-header text-yellow">
                <AlertCircle size={14} /> ATS Notes
              </div>
              <ul className="ats-issues-list">
                {atsIssues.map((issue, i) => (
                  <li key={i}>{toText(issue)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ATS score note */}
          <div className="ats-score-note">
            <Info size={13} />
            <span>
              This is a keyword-match estimate, not an official ATS score. Different ATS systems
              use proprietary algorithms.
            </span>
          </div>
        </div>
      </div>

      {/* Suggestions from AI */}
      {suggestions && suggestions.length > 0 && (
        <div className="glass-card suggestions-card">
          <h3><Target size={18} /> AI Career Suggestions</h3>
          <ul className="suggestions-list">
            {suggestions.map((s, i) => (
              <li key={i}>{toText(s)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ScoreVisualizer;
