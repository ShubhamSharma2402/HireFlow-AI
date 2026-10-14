import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Lightbulb, CheckCircle2, Check, X, ShieldAlert } from 'lucide-react';
import './SuggestedSkills.css';

/**
 * SuggestedSkills — Displays skills identified from the job description:
 * 1. User-confirmed skills added to the resume
 * 2. User-declined skills deliberately excluded
 * 3. Unsupported or remaining gap skills requiring candidate validation
 */
const toSkillText = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.skill || val.name || val.description || val.text || JSON.stringify(val);
  }
  return String(val);
};

const SuggestedSkills = ({
  unsupportedSkills = [],
  confirmedSkills = [],
  declinedSkills = [],
  userChoice = 'none',
  stopReason = '',
}) => {
  const [expanded, setExpanded] = useState(null);

  const stopReasonMessages = {
    threshold_met_at_baseline: 'Your resume already met the target ATS score threshold (80 pts) — optimization was not needed.',
    threshold_met: 'Target threshold of 80 pts reached after optimization.',
    insufficient_improvement: 'Optimization stopped because improvement was below the minimum 5-point threshold.',
    max_attempts_reached: 'Maximum optimization attempts (2) were used.',
    rewrite_failed: 'Resume rewriter encountered an issue on an attempt — best valid candidate was retained.',
    baseline_sufficient: 'Resume was already well-matched to the target requirements.',
    '': '',
  };

  const stopMsg = stopReasonMessages[stopReason] || stopReason;

  return (
    <div className="suggested-skills">
      {/* Confirmed Skills Section */}
      {confirmedSkills && confirmedSkills.length > 0 && (
        <div className="glass-card ss-confirmed-card p-4">
          <div className="flex items-center gap-2 mb-2 text-green">
            <Check size={18} />
            <h4 className="font-bold text-sm uppercase tracking-wider">
              Confirmed Skills Added to Resume ({confirmedSkills.length})
            </h4>
          </div>
          <p className="text-xs text-muted mb-3">
            You explicitly confirmed familiarity with these skills. The AI agent integrated them into your
            skills categories without inventing fake projects.
          </p>
          <div className="flex flex-wrap gap-2">
            {confirmedSkills.map((s, i) => (
              <span key={i} className="ss-confirmed-pill">
                <Check size={13} className="text-green" /> {toSkillText(s)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Declined Skills Section */}
      {declinedSkills && declinedSkills.length > 0 && (
        <div className="glass-card ss-declined-card p-4">
          <div className="flex items-center gap-2 mb-2 text-red">
            <X size={18} />
            <h4 className="font-bold text-sm uppercase tracking-wider">
              Declined Skills Excluded from Resume ({declinedSkills.length})
            </h4>
          </div>
          <p className="text-xs text-muted mb-3">
            You opted not to add these requirements. They were strictly excluded from every resume rewrite attempt
            to ensure factual integrity.
          </p>
          <div className="flex flex-wrap gap-2">
            {declinedSkills.map((s, i) => (
              <span key={i} className="ss-declined-pill">
                <X size={13} className="text-red" /> {toSkillText(s)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Remaining Unsupported Skills */}
      {unsupportedSkills && unsupportedSkills.length > 0 ? (
        <>
          <div className="ss-header glass-card">
            <div className="ss-header-icon">
              <AlertTriangle size={20} className="text-yellow" />
            </div>
            <div>
              <h3>Remaining Skill Gaps ({unsupportedSkills.length})</h3>
              <p className="text-muted text-sm">
                These {unsupportedSkills.length} skill{unsupportedSkills.length !== 1 ? 's' : ''} appear in the job description
                but are not represented in your resume.
              </p>
            </div>
          </div>

          <div className="ss-list">
            {unsupportedSkills.map((item, i) => {
              const isOpen = expanded === i;
              const skill = item.skill || item;

              return (
                <div key={i} className={`ss-item glass-card ${isOpen ? 'open' : ''}`}>
                  <button
                    className="ss-item-header"
                    onClick={() => setExpanded(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <div className="ss-item-left">
                      <span className="ss-skill-badge">{toSkillText(skill)}</span>
                      {item.jobRequirement && (
                        <span className="ss-requirement-preview text-muted text-sm">
                          {item.jobRequirement}
                        </span>
                      )}
                    </div>
                    <div className="ss-item-right">
                      {item.relatedEvidence && (
                        <span className="ss-has-evidence text-xs">Has related experience</span>
                      )}
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="ss-item-body">
                      {item.reason && (
                        <div className="ss-detail">
                          <span className="ss-detail-label">Why missing:</span>
                          <span className="text-muted">{item.reason}</span>
                        </div>
                      )}
                      {item.relatedEvidence && (
                        <div className="ss-detail">
                          <span className="ss-detail-label">Related foundation:</span>
                          <span className="text-muted">{item.relatedEvidence}</span>
                        </div>
                      )}
                      {item.action && (
                        <div className="ss-detail ss-action">
                          <Lightbulb size={14} className="text-yellow" />
                          <span className="ss-action-text">{item.action}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        (!confirmedSkills || confirmedSkills.length === 0) && (
          <div className="suggested-skills-empty glass-card">
            <CheckCircle2 size={32} className="text-green" />
            <div>
              <h3>No Remaining Skill Gaps</h3>
              <p className="text-muted text-sm">
                All identified job requirements were verified in your resume.
                {stopMsg && <span> — {stopMsg}</span>}
              </p>
            </div>
          </div>
        )
      )}

      {/* Stop Reason Note */}
      {stopMsg && (
        <div className="ss-stop-reason text-muted text-sm">
          <strong>Optimization summary:</strong> {stopMsg}
        </div>
      )}

      {/* Factual Disclaimer */}
      <div className="ss-disclaimer">
        <ShieldAlert size={14} className="text-yellow" />
        <span>
          HireFlow AI strictly preserves factual truth. Adding skills to a resume should always be backed
          by real capability or active learning.
        </span>
      </div>
    </div>
  );
};

export default SuggestedSkills;
