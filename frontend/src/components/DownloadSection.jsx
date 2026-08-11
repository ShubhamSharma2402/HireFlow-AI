import React, { useState } from 'react';
import { FileDown, CheckCircle, Share2, Printer, Check } from 'lucide-react';
import api from '../services/api';
import { formatResumeToText, downloadResumeAsPdf } from '../utils/resumeFormat';
import './DownloadSection.css';

const DownloadSection = ({ result, resumeData, applicationId }) => {
  const [approved, setApproved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getResumeContent = () => {
    const rawRes = resumeData?.optimized || result?.improvedResume || result?.resumeData;
    return formatResumeToText(rawRes);
  };

  const handleDownloadPdf = async () => {
    const content = getResumeContent();
    if (!content) {
      alert('No resume content available to download.');
      return;
    }

    setDownloading(true);
    try {
      await downloadResumeAsPdf(content, 'Optimized_Resume.pdf');
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

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
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; white-space: pre-wrap; }
          </style>
        </head>
        <body>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleApprove = async () => {
    setApproved(true);
    if (applicationId) {
      try {
        await api.put(`/agent/application/${applicationId}/approve`);
      } catch (err) {
        console.warn('Approve API error:', err);
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="download-section">
      <div className="approval-banner glass-card text-center p-8 mb-8">
        <CheckCircle size={48} className="text-green mx-auto mb-4" />
        <h2 className="mb-2">Ready to Apply!</h2>
        <p className="text-muted mb-6">Your resume has been fully optimized and is ready to download.</p>

        {!approved ? (
          <button className="btn btn-primary btn-lg" onClick={handleApprove}>
            Approve & Finalize Application
          </button>
        ) : (
          <div className="approved-badge text-green font-bold text-lg flex items-center justify-center gap-2">
            <Check size={20} /> Application Approved & Finalized!
          </div>
        )}
      </div>

      <div className="download-grid download-grid-single">
        <div className="glass-card p-6 text-center">
          <FileDown size={40} className="text-purple mx-auto mb-4" />
          <h3 className="mb-2">Optimized Resume</h3>
          <p className="text-muted text-sm mb-6">Tailored for the role and formatted for ATS parsing.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              className="btn btn-primary"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              <FileDown size={16} /> {downloading ? 'Generating PDF...' : 'Download Resume (PDF)'}
            </button>
            <button className="btn btn-secondary" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
          </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <button className="btn btn-secondary" onClick={handleShare}>
          <Share2 size={16} /> {copied ? 'Link Copied!' : 'Share Results Link'}
        </button>
      </div>
    </div>
  );
};

export default DownloadSection;
