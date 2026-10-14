import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Check, X, ShieldAlert, Sparkles, Layers, Wrench } from 'lucide-react';
import './SkillConfirmationModal.css';

/**
 * SkillConfirmationModal — Prominent, accessible modal displayed before resume generation.
 * Prompts the user to explicitly confirm or decline adding detected missing skills
 * into their optimized resume.
 */
const SkillConfirmationModal = ({
  isOpen,
  missingSkills = [],
  baselineScore = 0,
  targetThreshold = 80,
  onConfirm,
  onDecline,
}) => {
  const modalRef = useRef(null);

  // Focus trap & ESC key handling for accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onDecline();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (modalRef.current) {
      modalRef.current.focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  // Group missing skills by technical vs tools/devops/other
  const technicalSkills = missingSkills.filter(
    s => s.type === 'technical' || ['Programming Languages', 'Frontend', 'Backend', 'Databases'].includes(s.category)
  );

  const toolsAndOtherSkills = missingSkills.filter(
    s => !technicalSkills.includes(s)
  );

  return (
    <div
      className="skill-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
      onClick={(e) => {
        // Close if clicked directly on overlay backdrop
        if (e.target === e.currentTarget) onDecline();
      }}
    >
      <div className="skill-modal-container glass-card" ref={modalRef} tabIndex={-1}>
        {/* Header Banner (Sticky Top) */}
        <div className="skill-modal-header">
          <div className="skill-modal-header-content">
            <div className="skill-modal-icon-badge">
              <AlertTriangle size={28} className="text-yellow" />
            </div>
            <div>
              <div className="badge badge-yellow mb-1">Attention Required • Pre-Optimization Check</div>
              <h2 id="modal-heading" className="skill-modal-title">
                Some Job Requirements Are Missing From Your Resume
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="skill-modal-close-btn"
            onClick={onDecline}
            title="Close without adding"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="skill-modal-body">
          <p className="skill-modal-desc">
            Your target job description mentions the following <strong>{missingSkills.length} skills or keywords</strong> that
            we could not verify in your current resume or projects. Would you like to include these in your optimized resume?
          </p>

          {/* Current Score Alert */}
          <div className="score-context-banner">
            <div className="score-pill">
              Baseline ATS Score: <strong>{baselineScore} / 100</strong>
            </div>
            <div className="score-target-text text-muted text-xs">
              Target Threshold: <strong className="text-cyan">{targetThreshold} pts</strong>
            </div>
          </div>

          {/* Grouped Missing Skills Grid */}
          <div className="missing-groups-container">
            {/* Technical Skills Group */}
            {technicalSkills.length > 0 && (
              <div className="missing-group-card">
                <div className="group-card-header">
                  <Layers size={16} className="text-purple-light" />
                  <h4>Technical Skills & Core Technologies ({technicalSkills.length})</h4>
                </div>
                <div className="skills-pill-grid">
                  {technicalSkills.map((item, i) => {
                    const skillName = typeof item === 'string' ? item : item.skill;
                    const importance = item.importance || 'required';
                    return (
                      <div key={i} className="skill-pill-item">
                        <span className="skill-pill-name">{skillName}</span>
                        <span className={`skill-pill-tag ${importance === 'required' ? 'tag-required' : 'tag-preferred'}`}>
                          {importance}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tools, DevOps, & Cloud Skills Group */}
            {toolsAndOtherSkills.length > 0 && (
              <div className="missing-group-card">
                <div className="group-card-header">
                  <Wrench size={16} className="text-cyan" />
                  <h4>Tools, Cloud & Secondary Qualifications ({toolsAndOtherSkills.length})</h4>
                </div>
                <div className="skills-pill-grid">
                  {toolsAndOtherSkills.map((item, i) => {
                    const skillName = typeof item === 'string' ? item : item.skill;
                    const importance = item.importance || 'required';
                    return (
                      <div key={i} className="skill-pill-item">
                        <span className="skill-pill-name">{skillName}</span>
                        <span className={`skill-pill-tag ${importance === 'required' ? 'tag-required' : 'tag-preferred'}`}>
                          {importance}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Prominent Caution Box */}
          <div className="skill-caution-box">
            <ShieldAlert size={20} className="text-yellow flex-shrink-0 mt-0.5" />
            <div>
              <strong>Important Caution:</strong>
              <p className="mt-1 text-sm text-muted">
                Only include skills you genuinely possess. Adding a keyword does not establish that you have professional
                experience with it. If confirmed, the AI agent will categorize them under your skills section but will
                <strong> never invent fake projects or employment history</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer (Always Visible Actions) */}
        <div className="skill-modal-footer">
          <button
            type="button"
            className="btn btn-secondary decline-btn"
            onClick={onDecline}
          >
            <X size={18} /> No, Continue Without Adding
          </button>
          <button
            type="button"
            className="btn btn-primary confirm-btn"
            onClick={onConfirm}
          >
            <Check size={18} /> Yes, Add to Resume
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillConfirmationModal;
