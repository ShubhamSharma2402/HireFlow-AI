import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, CheckCircle, Brain, Target, MessageSquare,
  RefreshCw, Layers, History, Shield, Sparkles, AlertCircle, Loader2
} from 'lucide-react';
import { agentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AgentProgress from '../components/AgentProgress';
import SkillConfirmationModal from '../components/SkillConfirmationModal';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { user, mongoUser } = useAuth();

  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [preAnalysis, setPreAnalysis] = useState(null);

  const [formData, setFormData] = useState({
    name: mongoUser?.name || user?.displayName || '',
    jobDescription: '',
    resumeFile: null,
  });
  const [formError, setFormError] = useState('');

  // Primary submission: checks for missing skills first
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.resumeFile) {
      setFormError('Please upload your resume (PDF or TXT format).');
      return;
    }
    if (!formData.jobDescription.trim()) {
      setFormError('Please paste the target job description.');
      return;
    }

    setAnalyzing(true);
    try {
      const data = new FormData();
      data.append('jobText', formData.jobDescription.trim());
      data.append('resume', formData.resumeFile);
      if (formData.name.trim()) data.append('userName', formData.name.trim());

      const res = await agentAPI.analyzeGaps(data);
      setAnalyzing(false);

      if (res && res.data) {
        const { requiresConfirmation, missingSkills } = res.data;

        // If missing skills were detected requiring user decision, display the prominent modal
        if (requiresConfirmation && missingSkills && missingSkills.length > 0) {
          setPreAnalysis(res.data);
          setShowConfirmModal(true);
        } else {
          // If already >= 80 or no missing skills, proceed directly
          executeOptimization([], 'none', [], res.data.extractedResumeText);
        }
      } else {
        // Fallback to direct run if analysis returned no payload
        executeOptimization([], 'none');
      }
    } catch (error) {
      setAnalyzing(false);
      const msg = error?.response?.data?.message || error.message || 'Error analyzing resume against target role.';
      setFormError(msg);
      console.error('Pre-analysis error:', error);
    }
  };

  // User confirmed: Yes, Add to Resume
  const handleConfirmSkills = () => {
    setShowConfirmModal(false);
    const confirmedSkills = (preAnalysis?.missingSkills || []).map(item =>
      typeof item === 'string' ? item : item.skill
    );
    executeOptimization(confirmedSkills, 'add_confirmed', [], preAnalysis?.extractedResumeText);
  };

  // User declined: No, Continue Without Adding
  const handleDeclineSkills = () => {
    setShowConfirmModal(false);
    const declinedSkills = (preAnalysis?.missingSkills || []).map(item =>
      typeof item === 'string' ? item : item.skill
    );
    executeOptimization([], 'declined', declinedSkills, preAnalysis?.extractedResumeText);
  };

  // Executes the full agentic optimization loop with explicit user confirmation choice
  const executeOptimization = async (confirmedSkills = [], userChoice = 'none', declinedSkills = [], cachedResumeText = null) => {
    setLoading(true);
    setFormError('');

    try {
      const data = new FormData();
      data.append('userName', formData.name.trim() || mongoUser?.name || user?.displayName || 'Candidate');
      if (user?.uid || mongoUser?._id) {
        data.append('userId', mongoUser?._id || user?.uid);
      }
      data.append('jobText', formData.jobDescription.trim());

      // Use cached extracted text if available to avoid re-parsing PDF, or attach file
      if (cachedResumeText) {
        data.append('resumeText', cachedResumeText);
      } else {
        data.append('resume', formData.resumeFile);
      }

      data.append('userChoice', userChoice);
      data.append('confirmedSkills', JSON.stringify(confirmedSkills));
      data.append('declinedSkills', JSON.stringify(declinedSkills));

      const res = await agentAPI.runAgent(data);
      setLoading(false);

      if (res && res.success) {
        navigate('/results', { state: { result: res.data } });
      } else {
        setFormError(res?.message || 'Agent returned an unexpected response. Please try again.');
        console.error('Agent response:', res);
      }
    } catch (error) {
      setLoading(false);
      const msg = error?.response?.data?.message || error.message || 'Error running optimization session.';
      setFormError(msg);
      console.error('Agent error:', error);
    }
  };

  return (
    <div className="home-page">
      {/* Skill Confirmation Modal shown before resume generation */}
      <SkillConfirmationModal
        isOpen={showConfirmModal}
        missingSkills={preAnalysis?.missingSkills || []}
        baselineScore={preAnalysis?.baselineScore || 0}
        targetThreshold={preAnalysis?.targetThreshold || 80}
        onConfirm={handleConfirmSkills}
        onDecline={handleDeclineSkills}
      />

      {loading && <AgentProgress onCancel={() => setLoading(false)} />}

      {/* Hero / Header Section */}
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-tag-badge">
            <Sparkles size={13} />
            <span>Agentic Resume Optimization • ATS Target 80</span>
          </div>

          <h1>Tailor Your Resume to Any Target Role</h1>
          <p className="hero-subtitle">
            Upload your resume and paste the job description. Our bounded AI agent optimizes
            structure, integrates missing evidence-backed keywords, and re-scores your profile to maximize recruiter impact.
          </p>

          <div className="stats-container">
            <div className="stat-card">
              <h3>80 pts</h3>
              <p>Target ATS Score</p>
            </div>
            <div className="stat-card">
              <h3>Bounded</h3>
              <p>Max 2 Iterations</p>
            </div>
            <div className="stat-card">
              <h3>Factual</h3>
              <p>User-Confirmed Skills</p>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Workspace / Upload Card */}
      <section className="upload-section">
        <div className="container">
          <div className="upload-card">
            <div className="card-header-area">
              <h2>Optimization Workspace</h2>
              <p>
                Provide your existing resume and target job requirements to begin the optimization loop.
              </p>
            </div>

            {formError && (
              <div className="form-error-banner">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="upload-form">
              <div className="form-group">
                <label>Candidate Name (Optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Alex Morgan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Resume File (PDF or TXT) *</label>
                <div className="file-drop-area">
                  <div className="drop-icon-box">
                    <Upload size={20} />
                  </div>
                  <span className="drop-primary-text">
                    {formData.resumeFile ? formData.resumeFile.name : 'Choose a file or drag & drop here'}
                  </span>
                  <span className="drop-hint-text">Supported formats: PDF or Plain Text (up to 10MB)</span>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setFormData({ ...formData, resumeFile: e.target.files[0] })}
                  />
                  {formData.resumeFile && (
                    <div className="file-selected-badge">
                      <CheckCircle size={14} /> File attached ready for parsing
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Target Job Description *</label>
                <textarea
                  className="input-field job-textarea"
                  placeholder="Paste the full job description here (title, requirements, responsibilities, technical qualifications)..."
                  value={formData.jobDescription}
                  onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                  rows={8}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary submit-btn"
                disabled={analyzing || loading}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>Analyzing Requirements & Skill Gaps...</span>
                  </>
                ) : (
                  <>
                    <Brain size={18} />
                    <span>Start Optimization Session</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* How the Agent Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <div className="text-center">
            <h2 className="section-title">How the Optimization Agent Works</h2>
            <p className="section-subtitle">
              A disciplined, bounded decision loop that respects candidate facts while maximizing ATS match.
            </p>
          </div>

          <div className="steps-container">
            {[
              {
                step: '01',
                title: 'Parse & Gap Check',
                desc: 'Extracts skills across entire resume and job description to identify genuine gaps.'
              },
              {
                step: '02',
                title: 'Confirm Skills',
                desc: 'Prompts you to confirm whether you possess missing skills before rewriting.'
              },
              {
                step: '03',
                title: 'Full Rewrite',
                desc: 'Rewrites complete resume with categorized skills and concise action bullets.'
              },
              {
                step: '04',
                title: 'Validate & Score',
                desc: 'Enforces factual integrity and re-scores against target threshold (80).'
              },
              {
                step: '05',
                title: 'Deliver & Export',
                desc: 'Selects the best valid candidate with real PDF export, cover letter, and Q&A prep.'
              },
            ].map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-number">{s.step}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <div className="container">
          <div className="text-center">
            <h2 className="section-title">Engineered for ATS & Recruiter Precision</h2>
            <p className="section-subtitle">
              Built to pass automated screening while maintaining honest candidate credentials.
            </p>
          </div>

          <div className="grid-cols-3">
            {[
              {
                icon: <Target size={18} />,
                title: 'Evidence-Aware Mapping',
                desc: 'Skills are only integrated if backed by resume evidence or explicit user confirmation.'
              },
              {
                icon: <Layers size={18} />,
                title: 'Intelligent Categorization',
                desc: 'Organizes skills under standard headings (Frontend, Backend, Databases) rather than dumping keywords.'
              },
              {
                icon: <FileText size={18} />,
                title: 'Action-Oriented Bullets',
                desc: 'Converts weak descriptions into concise 1–1.5 line bullets: Action verb + approach + verifiable outcome.'
              },
              {
                icon: <MessageSquare size={18} />,
                title: 'Tailored Cover Letter & Q&A',
                desc: 'Generates role-aligned cover letters and interview prep based strictly on candidate facts.'
              },
              {
                icon: <RefreshCw size={18} />,
                title: 'Bounded Decision Loop',
                desc: 'Target score threshold (80) and max 2 attempts prevent hallucination loops and wasted calls.'
              },
              {
                icon: <History size={18} />,
                title: 'Selectable Text PDF Export',
                desc: 'Download clean, single-column, ATS-friendly PDFs with verified font and layout rendering.'
              },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon-box">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
