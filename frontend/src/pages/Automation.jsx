import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, Info } from 'lucide-react';
import './Automation.css';

const Automation = () => {
  const navigate = useNavigate();

  return (
    <div className="automation-page">
      <div className="automation-bg" />
      <div className="container">
        <div className="automation-header fade-in-up">
          <div className="badge">Direct Optimization Mode</div>
          <h1>Target-Job <span className="gradient-text">Resume Optimization</span></h1>
          <p className="text-muted">
            HireFlow AI focuses on precise, evidence-aware resume optimization for specific job descriptions.
          </p>
        </div>

        <div className="auto-card glass-card fade-in-up text-center p-8 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-purple-dim rounded-full flex items-center justify-center mx-auto mb-4 text-purple-light">
            <FileText size={32} />
          </div>

          <h2 className="text-2xl font-bold mb-3">Provide Your Target Job Directly</h2>
          <p className="text-muted mb-6 leading-relaxed">
            External automated scraping has been removed in favor of direct, accurate job matching.
            Upload your resume and paste the target job description to run our complete, bounded
            agentic optimization loop.
          </p>

          <div className="bg-card p-4 rounded-lg border border-glass mb-6 text-left">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green" /> What the Agent Delivers:
            </h4>
            <ul className="text-sm text-muted space-y-1.5 pl-6 list-disc">
              <li>Complete rewritten resume with standard ATS headings</li>
              <li>Categorized technical skills (Frontend, Backend, Databases, etc.)</li>
              <li>Concise, action-oriented project bullets (1–1.5 lines per bullet)</li>
              <li>Evidence-grounded keyword integration without hallucinated skills</li>
              <li>Separate report for suggested unsupported skills to validate</li>
              <li>Downloadable ATS-friendly PDF with selectable text</li>
              <li>Customized cover letter and technical interview Q&A prep</li>
            </ul>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/')}
          >
            Start Optimization Session <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Automation;
