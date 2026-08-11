import React, { useState } from 'react';
import { FileText, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import './ResumeComparison.css';

/**
 * Formats resume content (raw string or object) into clean multiline HTML blocks.
 * Applies highlights:
 * - mode === 'original': Highlights change.original in RED.
 * - mode === 'optimized': Replaces change.original with change.improved and highlights in GREEN.
 */
const formatResumeView = (resumeData, changes = [], mode = 'optimized', highlightEnabled = true) => {
  let rawText = '';

  if (typeof resumeData === 'string') {
    rawText = resumeData;
  } else if (resumeData && typeof resumeData === 'object') {
    if (resumeData.rawText) {
      rawText = resumeData.rawText;
    } else {
      // Build structured text if rawText not present
      const parts = [];
      if (resumeData.name) parts.push(`NAME: ${resumeData.name}`);
      if (resumeData.email || resumeData.phone) parts.push(`CONTACT: ${[resumeData.email, resumeData.phone].filter(Boolean).join(' | ')}`);
      if (resumeData.summary) parts.push(`SUMMARY:\n${resumeData.summary}`);
      if (resumeData.skills && resumeData.skills.length) {
        parts.push(`SKILLS:\n${Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : resumeData.skills}`);
      }
      if (resumeData.experience && resumeData.experience.length) {
        parts.push(`EXPERIENCE:\n` + resumeData.experience.map(e => (typeof e === 'string' ? e : `• ${e.title || 'Role'} @ ${e.company || ''}: ${Array.isArray(e.bullets) ? e.bullets.join('; ') : ''}`)).join('\n'));
      }
      if (resumeData.education && resumeData.education.length) {
        parts.push(`EDUCATION:\n` + resumeData.education.map(ed => (typeof ed === 'string' ? ed : `${ed.degree || ''} - ${ed.institution || ''}`)).join('\n'));
      }
      rawText = parts.join('\n\n');
    }
  }

  if (!rawText || rawText.trim().length === 0) {
    return '<p className="text-muted italic p-4">No content available for this section.</p>';
  }

  let processedText = rawText;

  // Process highlights
  if (highlightEnabled && changes && changes.length > 0) {
    changes.forEach((c) => {
      const orig = (c.original || c.old || '').trim();
      const imp = (c.improved || c.new || '').trim();

      if (mode === 'original') {
        // Red highlight on original
        if (orig && orig.length > 3 && processedText.includes(orig)) {
          processedText = processedText.replace(
            orig,
            `<mark class="removed-text">${orig}</mark>`
          );
        }
      } else if (mode === 'optimized') {
        // Green highlight on improved
        if (orig && imp && processedText.includes(orig)) {
          processedText = processedText.replace(
            orig,
            `<mark class="added-text">${imp}</mark>`
          );
        } else if (imp && imp.length > 3 && processedText.includes(imp)) {
          processedText = processedText.replace(
            imp,
            `<mark class="added-text">${imp}</mark>`
          );
        } else if (imp && imp.length > 3 && !processedText.includes(imp)) {
          processedText += `\n\n<mark class="added-text">• ${imp}</mark>`;
        }
      }
    });
  }

  // Format line breaks and section headers for clean multiline readability
  const formattedHtml = processedText
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<div className="resume-spacer"></div>';

      // Detect Section Headers (all caps or header keywords)
      const isHeader =
        /^(SUMMARY|EXPERIENCE|PROFESSIONAL EXPERIENCE|SKILLS|EDUCATION|PROJECTS|KEY PROJECTS|CERTIFICATIONS|WORK HISTORY):?/i.test(
          trimmed
        );

      if (isHeader) {
        return `<h4 className="resume-section-title">${trimmed}</h4>`;
      }

      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return `<div className="resume-bullet-line">${line}</div>`;
      }

      return `<div className="resume-text-line">${line}</div>`;
    })
    .join('');

  return `<div className="formatted-resume-document">${formattedHtml}</div>`;
};

const ResumeComparison = ({ data }) => {
  const [highlightDiff, setHighlightDiff] = useState(true);

  const originalContent = data?.original || data?.originalText || '';
  const optimizedContent = data?.optimized || data?.optimizedText || '';
  const changes = data?.changes || [];

  const originalHtml = formatResumeView(originalContent, changes, 'original', highlightDiff);
  const optimizedHtml = formatResumeView(optimizedContent, changes, 'optimized', highlightDiff);

  return (
    <div className="resume-comparison">
      <div className="comparison-toolbar flex justify-between items-center p-4 glass-card">
        <div className="flex items-center gap-2">
          <FileText className="text-purple-light" size={22} />
          <div>
            <h3 className="text-base font-bold">Interactive Side-by-Side Comparison</h3>
            <p className="text-xs text-muted">Readability optimized with side-by-side diff markers</p>
          </div>
        </div>

        <label className="diff-toggle-label flex items-center gap-2 cursor-pointer text-sm font-semibold">
          <input
            type="checkbox"
            checked={highlightDiff}
            onChange={(e) => setHighlightDiff(e.target.checked)}
          />
          <Eye size={18} className={highlightDiff ? 'text-cyan' : 'text-muted'} />
          <span>Show Highlighted Changes ({changes.length})</span>
        </label>
      </div>

      <div className="comparison-grid">
        {/* Original Resume Panel (Left) */}
        <div className="resume-pane glass-card">
          <div className="pane-header flex justify-between items-center mb-3 pb-2 border-b">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red" />
              <span className="badge badge-red font-bold">Original Resume</span>
            </div>
            <span className="text-xs text-muted">Red = Modified/Replaced Lines</span>
          </div>

          <div
            className="pane-content-body"
            dangerouslySetInnerHTML={{ __html: originalHtml }}
          />
        </div>

        {/* Optimized Resume Panel (Right) */}
        <div className="resume-pane glass-card highlight-pane">
          <div className="pane-header flex justify-between items-center mb-3 pb-2 border-b">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green" />
              <span className="badge badge-green font-bold">Optimized Resume</span>
            </div>
            <span className="text-xs text-green font-semibold">Green = AI Rewritten Lines</span>
          </div>

          <div
            className="pane-content-body"
            dangerouslySetInnerHTML={{ __html: optimizedHtml }}
          />
        </div>
      </div>
    </div>
  );
};

export default ResumeComparison;
