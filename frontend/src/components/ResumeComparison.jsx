import React, { useState } from 'react';
import { FileText, Eye, AlertCircle, CheckCircle2, SplitSquareVertical } from 'lucide-react';
import './ResumeComparison.css';

const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(safeStr).filter(Boolean).join(', ');
  if (typeof val === 'object') {
    return val.description || val.bullet || val.text || val.improved || val.original || val.name || val.skill || JSON.stringify(val);
  }
  return String(val);
};

/**
 * Formats structured resume or raw text into clean document markup.
 */
const renderFormattedDocument = (resumeData, changes = [], mode = 'optimized', highlightEnabled = true) => {
  if (!resumeData) {
    return '<p class="text-muted p-4 text-center">No document content available.</p>';
  }

  // If structured completeResume object
  const isStructured = Boolean(resumeData && (resumeData.skillCategories || resumeData.name || resumeData.experience));

  let name = safeStr(resumeData.name || '');
  let contact = [resumeData.email, resumeData.phone, resumeData.linkedin, resumeData.github, resumeData.website]
    .map(safeStr).filter(Boolean).join(' | ');
  let summary = safeStr(resumeData.summary || '');
  let skillCategories = Array.isArray(resumeData.skillCategories) ? resumeData.skillCategories : [];
  let experience = Array.isArray(resumeData.experience) ? resumeData.experience : [];
  let projects = Array.isArray(resumeData.projects) ? resumeData.projects : [];
  let education = Array.isArray(resumeData.education) ? resumeData.education : [];
  let certifications = Array.isArray(resumeData.certifications) ? resumeData.certifications : [];
  let achievements = Array.isArray(resumeData.achievements) ? resumeData.achievements : [];

  // If passed as rawText or unparsed string
  if (!isStructured && typeof resumeData === 'string') {
    return renderRawTextDocument(resumeData, changes, mode, highlightEnabled);
  }

  // Create highlighted diff mappings if enabled
  const changeMap = new Map();
  if (highlightEnabled && Array.isArray(changes) && changes.length > 0) {
    changes.forEach(c => {
      const orig = safeStr(c.original || c.old || '').trim();
      const imp = safeStr(c.improved || c.new || c.description || '').trim();
      if (orig && imp) {
        changeMap.set(mode === 'original' ? orig.toLowerCase() : imp.toLowerCase(), c);
      }
    });
  }

  const highlightText = (text, isHeading = false) => {
    const sText = safeStr(text);
    if (!sText || !highlightEnabled) return sText;
    const lower = sText.toLowerCase();
    for (const [key, c] of changeMap.entries()) {
      if (lower.includes(key) || key.includes(lower)) {
        if (mode === 'original') {
          return `<mark class="doc-removed">${sText}</mark>`;
        } else {
          return `<mark class="doc-added">${sText}</mark>`;
        }
      }
    }
    return sText;
  };

  let html = '<div class="comp-document-sheet">';

  // Header
  html += '<div class="comp-doc-header">';
  if (name) html += `<h1 class="comp-name">${name}</h1>`;
  if (contact) html += `<p class="comp-contact">${contact}</p>`;
  html += '</div>';

  // Summary
  if (summary) {
    html += '<div class="comp-section">';
    html += '<h3 class="comp-section-title">Professional Summary</h3>';
    html += `<p class="comp-summary">${highlightText(summary)}</p>`;
    html += '</div>';
  }

  // Skills
  if (skillCategories.length > 0) {
    html += '<div class="comp-section">';
    html += '<h3 class="comp-section-title">Technical Skills</h3>';
    html += '<div class="comp-skills-list">';
    skillCategories.forEach(cat => {
      const catName = safeStr(cat.category || 'Skills');
      const skillsArr = Array.isArray(cat.skills)
        ? cat.skills.map(safeStr).filter(Boolean)
        : [safeStr(cat.skills)].filter(Boolean);
      if (skillsArr.length > 0) {
        const skillsText = skillsArr.join(', ');
        html += `<div class="comp-skill-row"><strong>${catName}:</strong> <span>${highlightText(skillsText)}</span></div>`;
      }
    });
    html += '</div></div>';
  } else if (resumeData.skills && resumeData.skills.length > 0) {
    html += '<div class="comp-section">';
    html += '<h3 class="comp-section-title">Skills</h3>';
    const skillsText = Array.isArray(resumeData.skills)
      ? resumeData.skills.map(safeStr).filter(Boolean).join(', ')
      : safeStr(resumeData.skills);
    html += `<p class="comp-text">${highlightText(skillsText)}</p>`;
    html += '</div>';
  }

  // Experience
  if (experience.length > 0) {
    html += '<div class="comp-section">';
    html += '<h3 class="comp-section-title">Experience</h3>';
    experience.forEach(exp => {
      html += '<div class="comp-entry">';
      html += '<div class="comp-entry-header">';
      html += `<span class="comp-entry-title">${safeStr(exp.title || 'Role')}</span>`;
      if (exp.company) html += ` <span class="comp-entry-company">@ ${safeStr(exp.company)}</span>`;
      if (exp.duration) html += ` <span class="comp-entry-date">${safeStr(exp.duration)}</span>`;
      html += '</div>';
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : (exp.bullets ? [exp.bullets] : []);
      if (bullets.length > 0) {
        html += '<ul class="comp-bullets">';
        bullets.forEach(b => {
          html += `<li>${highlightText(safeStr(b))}</li>`;
        });
        html += '</ul>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  // Projects
  if (projects.length > 0) {
    html += '<div class="comp-section">';
    html += '<h3 class="comp-section-title">Projects</h3>';
    projects.forEach(proj => {
      html += '<div class="comp-entry">';
      html += '<div class="comp-entry-header">';
      html += `<span class="comp-entry-title">${safeStr(proj.name || 'Project')}</span>`;
      if (proj.technologies) html += ` <span class="comp-entry-tech">| ${safeStr(proj.technologies)}</span>`;
      html += '</div>';
      const bullets = Array.isArray(proj.bullets) ? proj.bullets : (proj.bullets ? [proj.bullets] : []);
      if (bullets.length > 0) {
        html += '<ul class="comp-bullets">';
        bullets.forEach(b => {
          html += `<li>${highlightText(safeStr(b))}</li>`;
        });
        html += '</ul>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  // Education
  if (education.length > 0) {
    html += '<div class="comp-section">';
    html += '<h3 class="comp-section-title">Education</h3>';
    education.forEach(edu => {
      html += '<div class="comp-entry">';
      html += `<span class="comp-entry-title">${safeStr(edu.degree || '')}</span>`;
      if (edu.institution) html += ` <span class="comp-entry-company">| ${safeStr(edu.institution)}</span>`;
      if (edu.year) html += ` <span class="comp-entry-date">${safeStr(edu.year)}</span>`;
      html += '</div>';
    });
    html += '</div>';
  }

  // Certifications
  if (certifications.length > 0) {
    html += '<div class="comp-section">';
    html += '<h3 class="comp-section-title">Certifications</h3>';
    html += '<ul class="comp-bullets">';
    certifications.forEach(c => {
      html += `<li>${highlightText(safeStr(c))}</li>`;
    });
    html += '</ul></div>';
  }

  // Achievements
  if (achievements.length > 0) {
    html += '<div class="comp-section">';
    html += '<h3 class="comp-section-title">Achievements</h3>';
    html += '<ul class="comp-bullets">';
    achievements.forEach(a => {
      html += `<li>${highlightText(safeStr(a))}</li>`;
    });
    html += '</ul></div>';
  }

  html += '</div>';
  return html;
};

/**
 * Fallback for unparsed or raw text original resumes
 */
function renderRawTextDocument(rawText, changes = [], mode = 'original', highlightEnabled = true) {
  const lines = rawText.split('\n');
  let html = '<div class="comp-document-sheet">';

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      html += '<div class="comp-spacer"></div>';
      return;
    }

    if (i === 0 && trimmed.length < 50) {
      html += `<div class="comp-doc-header"><h1 class="comp-name">${trimmed}</h1></div>`;
      return;
    }

    const isSection = /^(summary|professional summary|skills|technical skills|experience|work experience|projects|education|certifications):?$/i.test(trimmed);
    if (isSection) {
      html += `<h3 class="comp-section-title">${trimmed}</h3>`;
      return;
    }

    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const cleanBullet = trimmed.replace(/^[•\-\*]\s*/, '');
      html += `<div class="comp-bullet-line">• ${cleanBullet}</div>`;
      return;
    }

    html += `<div class="comp-text-line">${trimmed}</div>`;
  });

  html += '</div>';
  return html;
}

const ResumeComparison = ({ data }) => {
  const [highlightDiff, setHighlightDiff] = useState(true);

  const originalContent = data?.original || data?.originalText || '';
  const optimizedContent = data?.optimized || data?.optimizedText || '';
  const changes = data?.changes || [];

  const originalHtml = renderFormattedDocument(originalContent, changes, 'original', highlightDiff);
  const optimizedHtml = renderFormattedDocument(optimizedContent, changes, 'optimized', highlightDiff);

  return (
    <div className="resume-comparison">
      {/* Toolbar */}
      <div className="comparison-toolbar flex justify-between items-center p-4 glass-card">
        <div className="flex items-center gap-2">
          <FileText className="text-purple-light" size={22} />
          <div>
            <h3 className="text-base font-bold">Document Comparison</h3>
            <p className="text-xs text-muted">Formatted document view comparing original vs ATS-optimized resume</p>
          </div>
        </div>

        <label className="diff-toggle-label flex items-center gap-2 cursor-pointer text-sm font-semibold">
          <input
            type="checkbox"
            checked={highlightDiff}
            onChange={(e) => setHighlightDiff(e.target.checked)}
          />
          <Eye size={18} className={highlightDiff ? 'text-cyan' : 'text-muted'} />
          <span>Highlight Changes ({changes.length})</span>
        </label>
      </div>

      {/* Side-by-Side Formatted Document Sheets */}
      <div className="comparison-grid">
        {/* Original Resume Panel (Left) */}
        <div className="resume-sheet-wrapper">
          <div className="pane-header-bar flex justify-between items-center mb-2">
            <span className="badge badge-red font-bold">Original Resume</span>
            <span className="text-xs text-muted">Red highlight = Replaced or improved lines</span>
          </div>
          <div
            className="document-sheet-pane glass-card"
            dangerouslySetInnerHTML={{ __html: originalHtml }}
          />
        </div>

        {/* Optimized Resume Panel (Right) */}
        <div className="resume-sheet-wrapper">
          <div className="pane-header-bar flex justify-between items-center mb-2">
            <span className="badge badge-green font-bold">Optimized ATS Resume</span>
            <span className="text-xs text-muted">Green highlight = Evidenced & confirmed improvements</span>
          </div>
          <div
            className="document-sheet-pane glass-card"
            dangerouslySetInnerHTML={{ __html: optimizedHtml }}
          />
        </div>
      </div>
    </div>
  );
};

export default ResumeComparison;
