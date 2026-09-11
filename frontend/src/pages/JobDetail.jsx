import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Loader, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { automationAPI } from '../services/api';
import ScoreVisualizer from '../components/ScoreVisualizer';
import ResumeComparison from '../components/ResumeComparison';
import ExplanationSection from '../components/ExplanationSection';
import CoverLetter from '../components/CoverLetter';
import QASection from '../components/QASection';
import DownloadSection from '../components/DownloadSection';
import { normalizeQAList } from '../utils/qaFormat';
import { Activity, FileText, Mail, MessageSquare, Download } from 'lucide-react';
import './JobDetail.css';

const JobDetail = () => {
  const { jobId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const job = location.state?.job;

  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('score');

  const runOptimization = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await automationAPI.optimizeForJob(jobId);
      setResult(res.data);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err.message || 'Optimization failed');
      setStatus('error');
    }
  };

  useEffect(() => {
    runOptimization();
  }, [jobId]);

  const tabs = [
    { id: 'score', label: 'Score Dashboard', icon: <Activity size={18} /> },
    { id: 'resume', label: 'Resume & Changes', icon: <FileText size={18} /> },
    { id: 'cover', label: 'Cover Letter', icon: <Mail size={18} /> },
    { id: 'qa', label: 'Q&A Prep', icon: <MessageSquare size={18} /> },
    { id: 'download', label: 'Download', icon: <Download size={18} /> },
  ];

  if (status === 'loading') {
    return (
      <div className="job-detail-loading">
        <div className="loading-content glass-card">
          <div className="loading-ring" />
          <h2>Optimizing Your Resume</h2>
          <p className="text-muted">AI agents are running — parsing, matching, rewriting, and generating your tailored application...</p>
          <div className="loading-steps">
            {['Parsing job requirements', 'Analyzing your resume', 'Rewriting for ATS', 'Generating cover letter', 'Preparing Q&A'].map((s, i) => (
              <div key={i} className="loading-step">
                <Loader size={14} className="spin" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="job-detail-error container">
        <button className="btn btn-secondary back-btn" onClick={() => navigate('/jobs')}>
          <ArrowLeft size={18} /> Back to Jobs
        </button>
        <div className="error-card glass-card">
          <AlertCircle size={40} className="text-red" />
          <h2>Optimization Failed</h2>
          <p className="text-muted">{errorMsg}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={runOptimization}>Retry</button>
            <button className="btn btn-secondary" onClick={() => navigate('/jobs')}>Back to Jobs</button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'done' && result) {
    const r = result.result;

    const scoreData = {
      before: r.initialScore?.totalScore ?? 0,
      after: r.finalScore?.totalScore ?? 0,
      breakdown: r.finalScore?.breakdown ?? {},
      atsScore: r.finalScore?.breakdown?.atsScore ?? 0,
      atsBefore: r.initialScore?.breakdown?.atsScore ?? 0,
      missingKeywords: r.finalScore?.missingKeywords ?? [],
      strongAreas: r.finalScore?.strongAreas ?? [],
      weakAreas: r.finalScore?.weakAreas ?? [],
      atsIssues: r.finalScore?.atsIssues ?? [],
    };

    const resumeData = {
      original: r.resumeData,
      optimized: r.improvedResume,
      changes: r.changeLog ?? [],
      originalText: r.resumeData?.rawText ?? JSON.stringify(r.resumeData ?? {}, null, 2),
      optimizedText: r.improvedResume?.rawText ?? JSON.stringify(r.improvedResume ?? {}, null, 2),
    };

    const qaData = normalizeQAList(r.qaResponses ?? []);

    const applyUrl = job?.redirectUrl || job?.sourceUrl;

    return (
      <div className="job-detail-page">
        <div className="container">
          {/* Header */}
          <div className="detail-header fade-in-up">
            <button className="btn btn-secondary back-btn" onClick={() => navigate('/jobs')}>
              <ArrowLeft size={18} /> All Jobs
            </button>
            <div className="detail-header-center">
              <div className="success-badge">
                <CheckCircle size={14} /> Optimized for {job?.title || 'this role'}
              </div>
              <h1>Application <span className="gradient-text">Ready</span></h1>
              <p className="text-muted">
                Score improved from <span className="score-before">{scoreData.before}</span> to{' '}
                <span className="score-after">{scoreData.after}</span> — {r.iterations || 0} refinement iteration{r.iterations !== 1 ? 's' : ''}
              </p>
              {job && (
                <div className="job-info-bar">
                  <Briefcase size={14} /> {job.title} at {job.company}
                </div>
              )}
              {applyUrl && (
                <div style={{ marginTop: '0.75rem' }}>
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="apply-job-btn"
                  >
                    <ExternalLink size={15} />
                    Apply / View on Adzuna
                  </a>
                </div>
              )}
            </div>
            <div />
          </div>

          {/* Agent Decisions (collapsible) */}
          {r.agentDecisions?.length > 0 && (
            <details className="agent-log glass-card fade-in-up">
              <summary className="agent-log-summary">
                🤖 Agent Decision Log ({r.agentDecisions.length} steps)
              </summary>
              <div className="agent-log-body">
                {r.agentDecisions.map((d, i) => (
                  <div key={i} className="agent-decision-item">
                    <span className="decision-step">{d.step}</span>
                    <span className="decision-msg">{d.message || d.action}</span>
                    {d.score !== undefined && <span className="decision-score">Score: {d.score}</span>}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Tabs */}
          <div className="tabs-container fade-in-up">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-inner">{tab.icon} {tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content fade-in-up">
            {activeTab === 'score' && (
              <ScoreVisualizer
                score={scoreData}
                suggestions={r.suggestions ?? []}
                atsIssues={scoreData.atsIssues}
              />
            )}
            {activeTab === 'resume' && (
              <div className="resume-tab-layout">
                <ResumeComparison data={resumeData} />
                <ExplanationSection
                  changes={resumeData.changes}
                  explanations={r.explanations ?? {}}
                  overallSummary={r.explanations?.overallSummary}
                />
              </div>
            )}
            {activeTab === 'cover' && <CoverLetter content={r.coverLetter} />}
            {activeTab === 'qa' && <QASection qaList={qaData} />}
            {activeTab === 'download' && (
              <DownloadSection
                result={r}
                resumeData={resumeData}
                applicationId={result.applicationId}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default JobDetail;
