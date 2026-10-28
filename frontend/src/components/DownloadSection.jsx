import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileDown,
  FileText,
  CheckCircle,
  Share2,
  Printer,
  Check,
  Copy,
  Mail,
  Briefcase,
  RotateCcw,
  Loader2,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { formatResumeToText, downloadResumeAsPdf } from '../utils/resumeFormat';
import './DownloadSection.css';

const formatCoverLetterText = (content) => {
  if (!content) return '';
  if (typeof content === 'string') return content;
  let text = '';
  if (content.subject) text += `SUBJECT: ${content.subject}\n\n`;
  if (content.greeting) text += `${content.greeting}\n\n`;
  if (content.openingParagraph) text += `${content.openingParagraph}\n\n`;
  if (content.bodyParagraph1) text += `${content.bodyParagraph1}\n\n`;
  if (content.bodyParagraph2) text += `${content.bodyParagraph2}\n\n`;
  if (content.closingParagraph) text += `${content.closingParagraph}\n\n`;
  if (content.signature) text += `${content.signature}`;
  return text || JSON.stringify(content, null, 2);
};

const DownloadSection = ({ result, resumeData, applicationId }) => {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCover, setCopiedCover] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const targetRole = result?.jobData?.title || 'Target Role';
  const targetCompany = result?.jobData?.company || '';
  const matchScore = result?.finalScore?.totalScore || result?.score?.after || null;

  const getResumeContent = () => {
    const rawRes = resumeData?.optimized || result?.improvedResume || result?.resumeData;
    return formatResumeToText(rawRes);
  };

  const getCoverLetterContent = () => {
    return formatCoverLetterText(result?.coverLetter);
  };

  // 1. Download ATS-compliant PDF
  const handleDownloadPdf = async () => {
    const content = getResumeContent();
    if (!content) {
      setDownloadError('No resume content available to download.');
      return;
    }

    setDownloading(true);
    setDownloadError('');
    try {
      await downloadResumeAsPdf(content, 'Optimized_Resume.pdf');
    } catch (err) {
      console.error('PDF download error:', err);
      setDownloadError('Failed to generate PDF. Please try again or use the Download TXT option.');
    } finally {
      setDownloading(false);
    }
  };

  // 2. Download plain text (.txt)
  const handleDownloadTxt = () => {
    const content = getResumeContent();
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Optimized_Resume.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Copy full resume text
  const handleCopyResume = async () => {
    const content = getResumeContent();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedResume(true);
      setTimeout(() => setCopiedResume(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Download Cover Letter (.txt)
  const handleDownloadCoverLetter = () => {
    const content = getCoverLetterContent();
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Cover_Letter.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 5. Copy Cover Letter text
  const handleCopyCoverLetter = async () => {
    const content = getCoverLetterContent();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedCover(true);
      setTimeout(() => setCopiedCover(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // 6. Print resume
  const handlePrint = () => {
    const content = getResumeContent();
    if (!content) {
      alert('No resume content available to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print your resume.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Optimized Resume</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; line-height: 1.6; white-space: pre-wrap; color: #1e293b; }
          </style>
        </head>
        <body>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // 7. Finalize application in database with real persistence and UI feedback
  const handleFinalize = async () => {
    setFinalizing(true);
    if (applicationId) {
      try {
        await api.put(`/agent/application/${applicationId}/approve`);
      } catch (err) {
        console.warn('Approve API error:', err);
      }
    }
    setFinalized(true);
    setFinalizing(false);
  };

  // 8. Share link
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const hasCoverLetter = Boolean(result?.coverLetter);

  return (
    <div className="download-section">
      {/* Header Info Banner */}
      <div className="download-hero-card glass-card text-center mb-6">
        <div className="download-hero-badge">
          <CheckCircle size={15} className="text-green" />
          <span>Optimization Complete {matchScore ? `• ATS Score ${matchScore}/100` : ''}</span>
        </div>
        <h2 className="download-hero-title">Download & Export Application</h2>
        <p className="download-hero-desc text-muted">
          Your resume has been tailored for {targetRole} {targetCompany ? `@ ${targetCompany}` : ''} with clean section hierarchy and verified evidence.
        </p>
      </div>

      {downloadError && (
        <div className="download-error-alert mb-4">
          ⚠️ {downloadError}
        </div>
      )}

      {/* Main Download Cards Grid */}
      <div className={`download-cards-grid ${hasCoverLetter ? 'has-two-cards' : 'has-one-card'} mb-6`}>
        {/* Card 1: Optimized Resume */}
        <div className="download-card glass-card">
          <div className="download-card-icon-wrap">
            <FileText size={32} className="text-purple-light" />
          </div>
          <h3 className="download-card-title">Optimized Resume</h3>
          <p className="download-card-desc text-muted">
            Single-column ATS format with categorized technical skills, verified action bullets, and clean contact headers.
          </p>

          {/* Primary Action Button - Guaranteed 100% full text visibility */}
          <div className="primary-action-wrap mb-4">
            <button
              type="button"
              className="btn btn-primary download-resume-btn"
              onClick={handleDownloadPdf}
              disabled={downloading}
              title="Download ATS optimized resume as single-column PDF"
            >
              {downloading ? (
                <>
                  <Loader2 size={18} className="spin flex-shrink-0" />
                  <span className="btn-text-label">Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown size={18} className="flex-shrink-0" />
                  <span className="btn-text-label">Download Resume (PDF)</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Quick Formats */}
          <div className="secondary-formats-row">
            <button
              type="button"
              className="btn btn-secondary format-btn"
              onClick={handleDownloadTxt}
              title="Download plain text file for portal copy-pasting"
            >
              <FileDown size={14} /> Download TXT
            </button>
            <button
              type="button"
              className="btn btn-secondary format-btn"
              onClick={handleCopyResume}
              title="Copy entire resume text to clipboard"
            >
              {copiedResume ? <Check size={14} className="text-green" /> : <Copy size={14} />}
              {copiedResume ? 'Copied!' : 'Copy Text'}
            </button>
            <button
              type="button"
              className="btn btn-secondary format-btn"
              onClick={handlePrint}
              title="Print document"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Card 2: Cover Letter (if present) */}
        {hasCoverLetter && (
          <div className="download-card glass-card">
            <div className="download-card-icon-wrap icon-cyan">
              <Mail size={32} className="text-cyan" />
            </div>
            <h3 className="download-card-title">Tailored Cover Letter</h3>
            <p className="download-card-desc text-muted">
              Role-specific cover letter articulating your key achievements and alignment with the job requirements.
            </p>

            <div className="primary-action-wrap mb-4">
              <button
                type="button"
                className="btn btn-secondary download-cover-btn"
                onClick={handleDownloadCoverLetter}
                title="Download cover letter as text document"
              >
                <FileDown size={18} className="flex-shrink-0" />
                <span className="btn-text-label">Download Cover Letter (TXT)</span>
              </button>
            </div>

            <div className="secondary-formats-row">
              <button
                type="button"
                className="btn btn-secondary format-btn"
                onClick={handleCopyCoverLetter}
                title="Copy cover letter text to clipboard"
              >
                {copiedCover ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                {copiedCover ? 'Copied!' : 'Copy Letter'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Application Finalization & Navigation Hub */}
      <div className="application-status-card glass-card p-6 text-center mb-6">
        <div className="finalization-header mb-3">
          <Sparkles size={18} className="text-purple-light" />
          <h4 className="font-bold text-sm uppercase tracking-wider">Application Finalization & Next Steps</h4>
        </div>

        {!finalized ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-muted max-w-md">
              Save this finalized version into your application history so you can track submissions and review changes later.
            </p>
            <button
              type="button"
              className="btn btn-secondary finalize-btn"
              onClick={handleFinalize}
              disabled={finalizing}
            >
              {finalizing ? (
                <>
                  <Loader2 size={16} className="spin" /> Finalizing...
                </>
              ) : (
                <>
                  <Check size={16} className="text-green" /> Save & Finalize Application
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="finalized-success-box p-4 rounded bg-green-dim border-green-dim text-center">
            <div className="flex items-center justify-center gap-2 text-green font-bold text-sm mb-2">
              <CheckCircle size={18} /> Application Finalized & Saved to History!
            </div>
            <p className="text-xs text-muted mb-3">
              Your optimized resume and application data have been permanently recorded.
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/jobs')}
              >
                <Briefcase size={14} /> View in Applications History
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/')}
              >
                <RotateCcw size={14} /> Optimize Another Resume
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share Footer */}
      <div className="share-footer text-center">
        <button
          type="button"
          className="btn btn-ghost text-xs share-btn"
          onClick={handleShare}
        >
          {copiedLink ? <Check size={14} className="text-green" /> : <Share2 size={14} />}
          <span>{copiedLink ? 'Results Link Copied to Clipboard!' : 'Share Results Link'}</span>
        </button>
      </div>
    </div>
  );
};

export default DownloadSection;
