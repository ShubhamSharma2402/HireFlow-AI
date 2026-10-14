import React, { useState } from 'react';
import { Download, FileText, Loader2, Eye } from 'lucide-react';
import { formatResumeToText, downloadResumeAsPdf, cleanResumeString } from '../utils/resumeFormat';
import './ResumePreview.css';

/**
 * ResumePreview — Renders a realistic document preview of the optimized resume.
 * Supports both structured format (skillCategories) and legacy format (rawText).
 */
const renderText = (val) => {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.map(renderText).filter(Boolean).join('\n');
  if (typeof val === 'string') return cleanResumeString(val);
  if (typeof val === 'object') {
    return cleanResumeString(
      val.description || val.bullet || val.text || val.name || val.title || val.skill || val.summary || val.achievement || val.certification || JSON.stringify(val)
    );
  }
  return String(val);
};

/**
 * ResumePreview — Renders a realistic document preview of the optimized resume.
 * Supports both structured format (skillCategories) and legacy format (rawText).
 */
const ResumePreview = ({ resume, title = 'Optimized Resume' }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadResumeAsPdf(resume, 'Optimized_Resume.pdf');
    } catch (err) {
      console.error('[ResumePreview] PDF download error:', err);
      setDownloadError('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!resume) {
    return (
      <div className="resume-preview-empty glass-card">
        <FileText size={40} className="text-muted" />
        <p className="text-muted mt-3">No resume to preview yet.</p>
      </div>
    );
  }

  // Extract fields depending on format
  const isStructured = Boolean(resume && (resume.skillCategories || resume.name || resume.experience || resume.projects));
  const name = renderText(resume.name || '');
  const email = renderText(resume.email || '');
  const phone = renderText(resume.phone || '');
  const linkedin = renderText(resume.linkedin || '');
  const github = renderText(resume.github || '');
  const website = renderText(resume.website || '');
  const summary = renderText(resume.summary || '');
  const skillCategories = Array.isArray(resume.skillCategories) ? resume.skillCategories : [];
  const experience = Array.isArray(resume.experience) ? resume.experience : [];
  const projects = Array.isArray(resume.projects) ? resume.projects : [];
  const education = Array.isArray(resume.education) ? resume.education : [];
  const certifications = Array.isArray(resume.certifications) ? resume.certifications : [];
  const achievements = Array.isArray(resume.achievements) ? resume.achievements : [];

  // Contact line
  const contactParts = [email, phone, linkedin, github, website].filter(Boolean);

  // If not structured, fall back to text-based render
  if (!isStructured) {
    const rawText = formatResumeToText(resume);
    return (
      <div className="resume-preview-wrapper">
        <div className="resume-preview-toolbar">
          <div className="rpt-left">
            <Eye size={18} className="text-purple-light" />
            <span className="rpt-title">{title}</span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
        <div className="resume-preview-page glass-card">
          <pre className="resume-raw-text">{rawText}</pre>
        </div>
        {downloadError && <p className="rp-error">{downloadError}</p>}
      </div>
    );
  }

  return (
    <div className="resume-preview-wrapper">
      {/* Toolbar */}
      <div className="resume-preview-toolbar">
        <div className="rpt-left">
          <Eye size={18} className="text-purple-light" />
          <span className="rpt-title">{title}</span>
          <span className="rpt-badge">Document Preview</span>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
          {downloading ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>

      {downloadError && (
        <div className="rp-error-banner">⚠️ {downloadError}</div>
      )}

      {/* Document Page */}
      <div className="resume-preview-page glass-card">
        <div className="rp-doc">
          {/* Header */}
          <div className="rp-doc-header">
            {name && <h1 className="rp-name">{name}</h1>}
            {contactParts.length > 0 && (
              <p className="rp-contact">{contactParts.join(' | ')}</p>
            )}
          </div>

          {/* Summary */}
          {summary && (
            <div className="rp-section">
              <h2 className="rp-section-title">Professional Summary</h2>
              <p className="rp-summary">{summary}</p>
            </div>
          )}

          {/* Skills */}
          {skillCategories.length > 0 && (
            <div className="rp-section">
              <h2 className="rp-section-title">Technical Skills</h2>
              <div className="rp-skills-grid">
                {skillCategories.map((cat, i) => {
                  const skillsArr = Array.isArray(cat.skills)
                    ? cat.skills
                    : (cat.skills ? [cat.skills] : []);
                  return skillsArr.length > 0 ? (
                    <div key={i} className="rp-skill-row">
                      <span className="rp-skill-category">{renderText(cat.category || 'Skills')}:</span>
                      <span className="rp-skill-list">{skillsArr.map(renderText).filter(Boolean).join(', ')}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div className="rp-section">
              <h2 className="rp-section-title">Experience</h2>
              {experience.map((exp, i) => {
                const bullets = Array.isArray(exp.bullets)
                  ? exp.bullets
                  : (exp.bullets ? [exp.bullets] : (exp.description ? [exp.description] : []));
                return (
                  <div key={i} className="rp-entry">
                    <div className="rp-entry-header">
                      <span className="rp-entry-title">{renderText(exp.title || 'Role')}</span>
                      {exp.company && <span className="rp-entry-company"> @ {renderText(exp.company)}</span>}
                      {exp.duration && <span className="rp-entry-date">{renderText(exp.duration)}</span>}
                    </div>
                    {bullets.length > 0 && (
                      <ul className="rp-bullets">
                        {bullets.map((b, bi) => (
                          <li key={bi}>{renderText(b)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div className="rp-section">
              <h2 className="rp-section-title">Projects</h2>
              {projects.map((proj, i) => {
                const bullets = Array.isArray(proj.bullets)
                  ? proj.bullets
                  : (proj.bullets ? [proj.bullets] : (proj.description ? [proj.description] : []));
                return (
                  <div key={i} className="rp-entry">
                    <div className="rp-entry-header">
                      <span className="rp-entry-title">{renderText(proj.name || 'Project')}</span>
                      {proj.technologies && (
                        <span className="rp-entry-tech"> | {renderText(proj.technologies)}</span>
                      )}
                      {(proj.liveUrl || proj.githubUrl) && (
                        <span className="rp-entry-links">
                          {proj.githubUrl && (
                            <a href={renderText(proj.githubUrl)} target="_blank" rel="noreferrer" className="rp-link">
                              GitHub
                            </a>
                          )}
                          {proj.liveUrl && (
                            <a href={renderText(proj.liveUrl)} target="_blank" rel="noreferrer" className="rp-link">
                              Live
                            </a>
                          )}
                        </span>
                      )}
                    </div>
                    {bullets.length > 0 && (
                      <ul className="rp-bullets">
                        {bullets.map((b, bi) => (
                          <li key={bi}>{renderText(b)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className="rp-section">
              <h2 className="rp-section-title">Education</h2>
              {education.map((edu, i) => (
                <div key={i} className="rp-entry">
                  <div className="rp-entry-header">
                    <span className="rp-entry-title">{renderText(edu.degree || '')}</span>
                    {edu.institution && <span className="rp-entry-company"> | {renderText(edu.institution)}</span>}
                    {edu.year && <span className="rp-entry-date">{renderText(edu.year)}</span>}
                    {edu.gpa && <span className="rp-gpa">GPA: {renderText(edu.gpa)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div className="rp-section">
              <h2 className="rp-section-title">Certifications</h2>
              <ul className="rp-bullets">
                {certifications.map((c, i) => <li key={i}>{renderText(c)}</li>)}
              </ul>
            </div>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="rp-section">
              <h2 className="rp-section-title">Achievements</h2>
              <ul className="rp-bullets">
                {achievements.map((a, i) => <li key={i}>{renderText(a)}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
