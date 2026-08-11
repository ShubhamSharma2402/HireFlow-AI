import React from 'react';
import { Info, Plus, Edit2, Layout, CheckCircle2 } from 'lucide-react';
import './ExplanationSection.css';

const ExplanationSection = ({ changes = [], explanations = {}, overallSummary = '' }) => {
  const getIcon = (field) => {
    const f = String(field || '').toLowerCase();
    if (f.includes('summary')) return <Edit2 size={16} className="text-purple" />;
    if (f.includes('skill') || f.includes('keyword')) return <Plus size={16} className="text-cyan" />;
    return <Layout size={16} className="text-orange" />;
  };

  const summaryText =
    overallSummary ||
    explanations.overallSummary ||
    "The AI agent analyzed the job requirements and performed targeted rewrites on weak areas to naturally integrate missing keywords, improve action verbs, and maximize ATS score.";

  return (
    <div className="explanation-section">
      <div className="glass-card summary-card mb-4 p-4">
        <div className="flex items-start gap-3">
          <Info className="text-purple-light mt-1 flex-shrink-0" size={20} />
          <div>
            <h3 className="text-base font-bold mb-1">Why These Changes Were Made</h3>
            <p className="text-muted text-sm leading-relaxed">{summaryText}</p>
          </div>
        </div>
      </div>

      <div className="changes-list flex flex-col gap-3">
        <h4 className="text-sm font-semibold text-muted tracking-wider uppercase mb-1">
          Detailed Improvements ({changes.length})
        </h4>

        {changes.length === 0 ? (
          <div className="glass-card p-4 text-center text-muted text-sm">
            <CheckCircle2 size={24} className="text-green mx-auto mb-2" />
            Resume already meets target requirements! No major rewrites required.
          </div>
        ) : (
          changes.map((change, i) => {
            const field = change.field || change.section || 'General';
            const originalText = change.original || change.old || '';
            const improvedText = change.improved || change.new || '';
            const reason = change.reason || change.explanation || 'Optimized to match key job requirements.';

            return (
              <div key={i} className="change-card glass-card p-4">
                <div className="change-header flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getIcon(field)}
                    <span className="badge badge-purple text-xs capitalize">{field}</span>
                  </div>
                </div>

                <div className="change-details text-sm">
                  {originalText && (
                    <div className="removed-text mb-2 p-2 rounded bg-red-dim border-red-dim text-xs">
                      <strong>Original:</strong> {originalText}
                    </div>
                  )}

                  {improvedText && (
                    <div className="added-text mb-2 p-2 rounded bg-green-dim border-green-dim text-xs">
                      <strong>Improved:</strong> {improvedText}
                    </div>
                  )}

                  <div className="reason-text text-xs text-muted mt-2 pt-2 border-t border-glass">
                    <strong className="text-cyan">Rationale:</strong> {reason}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ExplanationSection;
