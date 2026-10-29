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
    { id: 'score', label: 'Score Report', icon: <Activity size={15} /> },
    { id: 'preview', label: 'Resume Preview', icon: <Eye size={15} /> },
    { id: 'resume', label: 'Before & After', icon: <FileText size={15} /> },
    { id: 'explanations', label: 'Changes & Logic', icon: <CheckCircle size={15} /> },
    {
      id: 'skills',
      label: 'Confirmed & Gaps',
      icon: <AlertTriangle size={15} />,
      badge: totalGapsCount > 0 ? totalGapsCount : undefined,
    },
    { id: 'cover', label: 'Cover Letter', icon: <Mail size={15} /> },
    { id: 'qa', label: 'Interview Q&A', icon: <MessageSquare size={15} /> },
    { id: 'download', label: 'Finalize & Export', icon: <Download size={15} /> },
  ];

  return (
    <div className="results-page">
      {/* Refined Results Header Bar */}
      <div className="results-header-bar">
        <div className="container">
          <div className="results-header-content">
            <div className="results-title-group">
              <button
                className="back-btn"
                onClick={() => navigate('/')}
                title="Back to Optimizer"
                aria-label="Back to Optimizer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="results-role-title">
                  {result.jobData?.title || 'Target Role Optimization'}
                </h1>
                <p className="results-role-meta">
                  {result.jobData?.company ? `${result.jobData.company} • ` : ''}
                  ATS Match: <strong style={{ color: 'var(--text-primary)' }}>{scoreData.before} → {scoreData.after}/100</strong>
                  {scoreImprovement > 0 && <span style={{ color: 'var(--success)', marginLeft: '6px', fontWeight: 600 }}> (+{scoreImprovement} pts)</span>}
                </p>
              </div>
            </div>

            <div className="results-header-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
                Optimize Another
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('download')}>
                <Download size={14} /> Export Document
              </button>
            </div>
          </div>

          {/* Segmented SaaS Navigation Tabs */}
          <div className="results-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`result-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="tab-badge">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="container results-tab-content">
        <ErrorBoundary>
          {activeTab === 'score' && (
            <ScoreVisualizer
              score={scoreData}
              suggestions={suggestions}
              atsIssues={scoreData.atsIssues}
              stopReason={stopReason}
              iterations={iterations}
              agentDecisions={agentDecisions}
            />
          )}

          {activeTab === 'preview' && (
            <ResumePreview
              resume={improvedResume || resumeData.optimized || resumeData.original}
              title={`Optimized Resume — ${result.jobData?.title || 'Target Role'}`}
            />
          )}

          {activeTab === 'resume' && (
            <ResumeComparison
              originalResume={resumeData.original}
              optimizedResume={resumeData.optimized}
              changes={resumeData.changes}
              originalText={resumeData.originalText}
              optimizedText={resumeData.optimizedText}
            />
          )}

          {activeTab === 'explanations' && (
            <ExplanationSection
              changes={resumeData.changes}
              explanations={explanationsData}
              overallSummary={result.explanations?.overallSummary || ''}
            />
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
            <CoverLetter
              content={coverLetterData}
              jobData={result.jobData}
              resumeData={resumeData.optimized || resumeData.original}
            />
          )}

          {activeTab === 'qa' && (
            <QASection
              qaList={qaData}
              jobData={result.jobData}
            />
          )}

          {activeTab === 'download' && (
            <DownloadSection
              result={result}
              resumeData={resumeData}
              applicationId={responseData.applicationId}
            />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Results;
