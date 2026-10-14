import React, { useState } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import ScoreVisualizer from '../components/ScoreVisualizer';
import ResumeComparison from '../components/ResumeComparison';
import ResumePreview from '../components/ResumePreview';
import ExplanationSection from '../components/ExplanationSection';
import CoverLetter from '../components/CoverLetter';
import QASection from '../components/QASection';
import SuggestedSkills from '../components/SuggestedSkills';
import DownloadSection from '../components/DownloadSection';
import ErrorBoundary from '../components/ErrorBoundary';
import { normalizeQAList } from '../utils/qaFormat';
import {
  Activity, FileText, Mail, MessageSquare, Download,
  ArrowLeft, CheckCircle, Eye, AlertTriangle
} from 'lucide-react';
import './Results.css';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('score');

  // Backend response: { result: { jobData, resumeData, improvedResume, initialScore, finalScore, ... } }
  const responseData = location.state?.result;

  if (!responseData) {
    return <Navigate to="/" />;
  }

  // Support both structured backend response and legacy mock
  const result = responseData.result || responseData;

  const scoreData = {
    before: result.initialScore?.totalScore ?? result.score?.before ?? 0,
    after: result.finalScore?.totalScore ?? result.score?.after ?? 0,
    breakdown: result.finalScore?.breakdown ?? result.score?.breakdown ?? {},
    atsScore: result.finalScore?.breakdown?.atsScore ?? result.score?.breakdown?.ats ?? 0,
    atsBefore: result.initialScore?.breakdown?.atsScore ?? 0,
    missingKeywords: result.finalScore?.missingKeywords ?? result.finalScore?.missingCriticalSkills ?? [],
    strongAreas: result.finalScore?.strongAreas ?? [],
    weakAreas: result.finalScore?.weakAreas ?? [],
    atsIssues: result.finalScore?.atsIssues ?? [],
    missingCriticalSkills: result.finalScore?.missingCriticalSkills ?? [],
  };

  const toSafeString = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map(toSafeString).filter(Boolean).join('\n');
    if (typeof val === 'object') {
      return val.description || val.message || val.action || val.step || val.bullet || val.text || val.improved || val.original || JSON.stringify(val);
    }
    return String(val);
  };

  const rawChanges = result.changeLog ?? result.resume?.changes ?? [];
  const changes = Array.isArray(rawChanges)
    ? rawChanges.map(c => {
        if (typeof c === 'string') return { field: 'General', original: '', improved: c, reason: 'Resume improvement' };
        return {
          field: toSafeString(c?.field || c?.section || 'General'),
          original: toSafeString(c?.original || c?.old || ''),
          improved: toSafeString(c?.improved || c?.new || c?.description || ''),
          reason: toSafeString(c?.reason || c?.explanation || 'Optimized for target requirements.')
        };
      })
    : [];

  const resumeData = {
    original: result.resumeData,
    optimized: result.improvedResume,
    changes,
    originalText: result.resumeData?.rawText ?? (typeof result.resumeData === 'string' ? result.resumeData : JSON.stringify(result.resumeData ?? {}, null, 2)),
    optimizedText: result.improvedResume?.rawText ?? (typeof result.improvedResume === 'string' ? result.improvedResume : JSON.stringify(result.improvedResume ?? {}, null, 2)),
  };

  const coverLetterData = result.coverLetter ?? null;
  const qaData = normalizeQAList(result.qaResponses ?? result.qaPrep ?? result.qaList);
  const explanationsData = result.explanations ?? {};
  const unsupportedSkills = result.unsupportedSkills ?? [];
  const confirmedSkills = result.confirmedSkills ?? [];
  const declinedSkills = result.declinedSkills ?? [];
  const userChoice = result.userChoice ?? 'none';
  const iterations = result.iterations ?? 0;
  const stopReason = result.stopReason ?? '';
  const agentDecisions = result.agentDecisions ?? [];
  const improvedResume = result.improvedResume;
  const rawSuggestions = result.suggestions ?? result.explanations?.suggestions ?? [];
  const suggestions = Array.isArray(rawSuggestions)
    ? rawSuggestions.map(toSafeString).filter(Boolean)
    : [toSafeString(rawSuggestions)].filter(Boolean);

  const scoreImprovement = scoreData.after - scoreData.before;
  const totalGapsCount = unsupportedSkills.length + declinedSkills.length;

  const tabs = [
    { id: 'score', label: 'Score Report', icon: <Activity size={16} /> },
    { id: 'preview', label: 'Resume Preview', icon: <Eye size={16} /> },
    { id: 'resume', label: 'Before & After', icon: <FileText size={16} /> },
    { id: 'skills', label: `Skills Gap (${totalGapsCount})`, icon: <AlertTriangle size={16} /> },
    { id: 'cover', label: 'Cover Letter', icon: <Mail size={16} /> },
    { id: 'qa', label: 'Q&A Prep', icon: <MessageSquare size={16} /> },
    { id: 'download', label: 'Download', icon: <Download size={16} /> },
  ];

  return (
    <ErrorBoundary>
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
            <h1>Resume <span className="gradient-text">Optimized</span></h1>
            <p className="text-muted">
              {iterations > 0
                ? `Agent ran ${iterations} optimization attempt${iterations !== 1 ? 's' : ''} — `
                : 'Resume already met the target score — '}
              Score:{' '}
              <span className="score-before">{scoreData.before}</span>
              {' → '}
              <span className="score-after">{scoreData.after}</span>
              {scoreImprovement > 0 && (
                <span className="score-improvement"> (+{scoreImprovement} pts)</span>
              )}
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
                  <span className="decision-step">{toSafeString(d.step)}</span>
                  <span className="decision-msg">{toSafeString(d.message || d.action)}</span>
                  {d.score !== undefined && (
                    <span className="decision-score">Score: {d.score}</span>
                  )}
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
              stopReason={stopReason}
              iterations={iterations}
            />
          )}

          {activeTab === 'preview' && (
            <ResumePreview
              resume={improvedResume}
              title="Optimized Resume"
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

          {activeTab === 'skills' && (
            <SuggestedSkills
              unsupportedSkills={unsupportedSkills}
              confirmedSkills={confirmedSkills}
              declinedSkills={declinedSkills}
              userChoice={userChoice}
              stopReason={stopReason}
            />
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
    </ErrorBoundary>
  );
};

export default Results;
