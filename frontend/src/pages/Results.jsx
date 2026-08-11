import React, { useState } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import ScoreVisualizer from '../components/ScoreVisualizer';
import ResumeComparison from '../components/ResumeComparison';
import ExplanationSection from '../components/ExplanationSection';
import CoverLetter from '../components/CoverLetter';
import QASection from '../components/QASection';
import DownloadSection from '../components/DownloadSection';
import { normalizeQAList } from '../utils/qaFormat';
import { Activity, FileText, Mail, MessageSquare, Download, ArrowLeft, CheckCircle } from 'lucide-react';
import './Results.css';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('score');

  // The backend response structure: { result: { jobData, resumeData, improvedResume, initialScore, finalScore, changeLog, coverLetter, qaResponses, explanations, suggestions, agentDecisions } }
  const responseData = location.state?.result;

  if (!responseData) {
    return <Navigate to="/" />;
  }

  // Support both the real backend structure and legacy mock structure
  const result = responseData.result || responseData;

  const scoreData = {
    before: result.initialScore?.totalScore ?? result.score?.before ?? 0,
    after: result.finalScore?.totalScore ?? result.score?.after ?? 0,
    breakdown: result.finalScore?.breakdown ?? result.score?.breakdown ?? {},
    atsScore: result.finalScore?.breakdown?.atsScore ?? result.score?.breakdown?.ats ?? 0,
    atsBefore: result.initialScore?.breakdown?.atsScore ?? 0,
    missingKeywords: result.finalScore?.missingKeywords ?? [],
    strongAreas: result.finalScore?.strongAreas ?? [],
    weakAreas: result.finalScore?.weakAreas ?? [],
    atsIssues: result.finalScore?.atsIssues ?? [],
  };

  const resumeData = {
    original: result.resumeData,
    optimized: result.improvedResume,
    changes: result.changeLog ?? result.resume?.changes ?? [],
    originalText: result.resumeData?.rawText ?? JSON.stringify(result.resumeData ?? {}, null, 2),
    optimizedText: result.improvedResume?.rawText ?? JSON.stringify(result.improvedResume ?? {}, null, 2),
  };

  const coverLetterData = result.coverLetter ?? null;
  const qaData = normalizeQAList(result.qaResponses ?? result.qaPrep ?? result.qaList);
  const explanationsData = result.explanations ?? {};
  const suggestions = result.suggestions ?? [];
  const iterations = result.iterations ?? 0;
  const agentDecisions = result.agentDecisions ?? [];

  const tabs = [
    { id: 'score', label: 'Score Dashboard', icon: <Activity size={18} /> },
    { id: 'resume', label: 'Resume & Changes', icon: <FileText size={18} /> },
    { id: 'cover', label: 'Cover Letter', icon: <Mail size={18} /> },
    { id: 'qa', label: 'Q&A Prep', icon: <MessageSquare size={18} /> },
    { id: 'download', label: 'Download', icon: <Download size={18} /> },
  ];

  return (
    <div className="results-page">
      <div className="container">
        {/* Header */}
        <div className="results-header fade-in-up">
          <button className="btn btn-secondary back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="header-center">
            <div className="success-badge">
              <CheckCircle size={16} />
              Optimization Complete
            </div>
            <h1>Application <span className="gradient-text">Optimized</span></h1>
            <p className="text-muted">
              AI agent ran {iterations} refinement iteration{iterations !== 1 ? 's' : ''} &mdash; 
              Score improved from <span className="score-before">{scoreData.before}</span> to{' '}
              <span className="score-after">{scoreData.after}</span>
            </p>
          </div>
          <div className="header-spacer" />
        </div>

        {/* Agent Decision Log (collapsible) */}
        {agentDecisions.length > 0 && (
          <details className="agent-log glass-card fade-in-up">
            <summary className="agent-log-summary">
              🤖 Agent Decision Log ({agentDecisions.length} steps)
            </summary>
            <div className="agent-log-body">
              {agentDecisions.map((d, i) => (
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
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-inner">
                {tab.icon} {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content fade-in-up">
          {activeTab === 'score' && (
            <ScoreVisualizer
              score={scoreData}
              suggestions={suggestions}
              atsIssues={scoreData.atsIssues}
            />
          )}
          {activeTab === 'resume' && (
            <div className="resume-tab-layout">
              <ResumeComparison data={resumeData} />
              <ExplanationSection
                changes={resumeData.changes}
                explanations={explanationsData}
                overallSummary={explanationsData.overallSummary}
              />
            </div>
          )}
          {activeTab === 'cover' && (
            <CoverLetter content={coverLetterData} />
          )}
          {activeTab === 'qa' && (
            <QASection qaList={qaData} />
          )}
          {activeTab === 'download' && (
            <DownloadSection
              result={result}
              resumeData={resumeData}
              applicationId={responseData.applicationId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Results;
