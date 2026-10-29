import React, { useState, useRef } from 'react';
import { FileText, Eye, ArrowUp, ArrowDown, MoveVertical } from 'lucide-react';
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

  // If passed as rawText or unparsed string
  if (typeof resumeData === 'string') {
    if (!resumeData.trim()) {
      return '<p class="text-muted p-4 text-center">No document content available.</p>';
    }
    return renderRawTextDocument(resumeData, changes, mode, highlightEnabled);
  }

  // Check if object is empty or has content
  const hasContent = Boolean(
    resumeData.name ||
    resumeData.summary ||
    (resumeData.skillCategories && resumeData.skillCategories.length > 0) ||
    (resumeData.skills && resumeData.skills.length > 0) ||
    (resumeData.experience && resumeData.experience.length > 0) ||
    (resumeData.projects && resumeData.projects.length > 0) ||
    (resumeData.education && resumeData.education.length > 0) ||
    resumeData.rawText
  );

  if (!hasContent) {
    return '<p class="text-muted p-4 text-center">No document content available.</p>';
  }

  // If object has rawText and lacks structured sections, use rawText renderer
  if (resumeData.rawText && (!resumeData.skillCategories || resumeData.skillCategories.length === 0) && (!resumeData.experience || resumeData.experience.length === 0)) {
    return renderRawTextDocument(resumeData.rawText, changes, mode, highlightEnabled);
  }

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

  // Fallback if legacy skills array exists instead of categories
  if (skillCategories.length === 0 && Array.isArray(resumeData.skills) && resumeData.skills.length > 0) {
    skillCategories = [{ category: 'Technical Skills', skills: resumeData.skills }];
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

  const highlightText = (text) => {
    const sText = safeStr(text);
    if (!sText || !highlightEnabled) return sText;
    const lower = sText.toLowerCase();
    for (const [key] of changeMap.entries()) {
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
  if (contact) {
    const contactLinks = contact.split(/\s*\|\s*/).map(part => {
      let href = null;
      if (part.includes('@')) {
        href = `mailto:${part.trim()}`;
      } else if (/linkedin\.com\/in\/[^\s]+/i.test(part)) {
        const match = part.match(/linkedin\.com\/in\/[^\s]+/i);
        href = `https://www.${match[0].replace(/^www\./i, '')}`;
      } else if (/github\.com\/[^\s]+/i.test(part)) {
        const match = part.match(/github\.com\/[^\s]+/i);
        href = `https://www.${match[0].replace(/^www\./i, '')}`;
      } else if (/leetcode\.com\/[^\s]+/i.test(part)) {
        const match = part.match(/leetcode\.com\/[^\s]+/i);
        href = `https://${match[0]}`;
      } else if (/^https?:\/\//i.test(part)) {
        href = part.trim();
      }

      if (href) {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">${part}</a>`;
      }
      return `<span>${part}</span>`;
    }).join(' | ');

    html += `<p class="comp-contact">${contactLinks}</p>`;
  }
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
  }

  // Experience
  if (experience.length > 0) {
    html += '<div class="comp-section">';
    html += '<h3 class="comp-section-title">Experience</h3>';
    experience.forEach(exp => {
      const title = safeStr(exp.title || '');
      const company = safeStr(exp.company || '');
      const duration = safeStr(exp.duration || exp.dates || '');
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : (exp.description ? [exp.description] : []);

      html += '<div class="comp-entry">';
      html += '<div class="comp-entry-header">';
      html += `<div><strong class="comp-entry-title">${title}</strong> <span class="comp-entry-company">— ${company}</span></div>`;
      if (duration) html += `<span class="comp-entry-date">${duration}</span>`;
      html += '</div>';

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
      const pName = safeStr(proj.name || proj.title || '');
      const tech = safeStr(proj.technologies || proj.tech || '');
      const bullets = Array.isArray(proj.bullets) ? proj.bullets : (proj.description ? [proj.description] : []);

      html += '<div class="comp-entry">';
      html += '<div class="comp-entry-header">';
      html += `<div><strong class="comp-entry-title">${pName}</strong>`;
      if (tech) html += ` <span class="comp-entry-tech">(${tech})</span>`;
      html += '</div></div>';

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
      const degree = safeStr(edu.degree || '');
      const institution = safeStr(edu.institution || edu.school || '');
      const year = safeStr(edu.year || edu.dates || '');
      const gpa = safeStr(edu.gpa || '');

      html += '<div class="comp-entry">';
      html += '<div class="comp-entry-header">';
      html += `<div><strong class="comp-entry-title">${degree}</strong> <span class="comp-entry-company">— ${institution}</span></div>`;
      if (year) html += `<span class="comp-entry-date">${year}${gpa ? ` | GPA: ${gpa}` : ''}</span>`;
      html += '</div></div>';
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
  const lines = String(rawText).split('\n');
  let html = '<div class="comp-document-sheet">';

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      html += '<div class="comp-spacer"></div>';
      return;
    }

    if (i === 0 && trimmed.length < 60) {
      html += `<div class="comp-doc-header"><h1 class="comp-name">${trimmed}</h1></div>`;
      return;
    }

    const isSection = /^(summary|professional summary|skills|technical skills|experience|work experience|projects|education|certifications|achievements):?$/i.test(trimmed);
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

const ResumeComparison = ({
  data,
  originalResume,
  optimizedResume,
  changes: propChanges,
  originalText,
  optimizedText
}) => {
  const [highlightDiff, setHighlightDiff] = useState(true);
  const originalPaneRef = useRef(null);
  const optimizedPaneRef = useRef(null);

  // Safely resolve content whether passed via data bundle or individual props
  const originalContent = originalResume || data?.original || originalText || data?.originalText || '';
  const optimizedContent = optimizedResume || data?.optimized || optimizedText || data?.optimizedText || '';
  const changes = propChanges || data?.changes || [];

  const originalHtml = renderFormattedDocument(originalContent, changes, 'original', highlightDiff);
  const optimizedHtml = renderFormattedDocument(optimizedContent, changes, 'optimized', highlightDiff);

  const scrollTo = (ref, position) => {
    if (ref.current) {
      ref.current.scrollTo({
        top: position === 'top' ? 0 : ref.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="resume-comparison">
      {/* Toolbar */}
      <div className="diff-toolbar">
        <div className="flex items-center gap-2">
          <FileText className="text-accent" size={20} />
          <div>
            <h3 style={{ fontSize: '0.985rem', fontWeight: 650 }}>Side-by-Side Document Comparison</h3>
            <p className="text-xs text-muted">Original and optimized resume panes with independent scrolling controls</p>
          </div>
        </div>

        <label className="diff-toggle-label flex items-center gap-2 cursor-pointer text-sm font-semibold">
          <input
            type="checkbox"
            checked={highlightDiff}
            onChange={(e) => setHighlightDiff(e.target.checked)}
          />
          <Eye size={16} className={highlightDiff ? 'text-accent' : 'text-muted'} />
          <span>Highlight Changes ({changes.length})</span>
        </label>
      </div>

      {/* Side-by-Side Dual Pane (Grid 1fr 1fr) */}
      <div className="side-by-side-panes">
        {/* Original Resume Panel (Left) */}
        <div className="pane-wrapper">
          <div className="pane-header">
            <div className="pane-header-left">
              <span className="badge badge-error">Original Resume</span>
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                <MoveVertical size={11} /> Independent Scroll
              </span>
            </div>
            <div className="pane-controls">
              <button
                type="button"
                className="pane-scroll-btn"
                title="Scroll to top"
                onClick={() => scrollTo(originalPaneRef, 'top')}
              >
                <ArrowUp size={11} /> Top
              </button>
              <button
                type="button"
                className="pane-scroll-btn"
                title="Scroll to bottom"
                onClick={() => scrollTo(originalPaneRef, 'bottom')}
              >
                <ArrowDown size={11} /> End
              </button>
            </div>
          </div>
          <div
            ref={originalPaneRef}
            className="document-sheet-pane"
            tabIndex={0}
            aria-label="Original resume document viewer"
            dangerouslySetInnerHTML={{ __html: originalHtml }}
          />
        </div>

        {/* Optimized Resume Panel (Right) */}
        <div className="pane-wrapper">
          <div className="pane-header">
            <div className="pane-header-left">
              <span className="badge badge-success">Optimized ATS Resume</span>
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                <MoveVertical size={11} /> Independent Scroll
              </span>
            </div>
            <div className="pane-controls">
              <button
                type="button"
                className="pane-scroll-btn"
                title="Scroll to top"
                onClick={() => scrollTo(optimizedPaneRef, 'top')}
              >
                <ArrowUp size={11} /> Top
              </button>
              <button
                type="button"
                className="pane-scroll-btn"
                title="Scroll to bottom"
                onClick={() => scrollTo(optimizedPaneRef, 'bottom')}
              >
                <ArrowDown size={11} /> End
              </button>
            </div>
          </div>
          <div
            ref={optimizedPaneRef}
            className="document-sheet-pane"
            tabIndex={0}
            aria-label="Optimized resume document viewer"
            dangerouslySetInnerHTML={{ __html: optimizedHtml }}
          />
        </div>
      </div>
    </div>
  );
};

export default ResumeComparison;
