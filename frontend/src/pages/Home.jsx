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
        const { requiresConfirmation, missingSkills, baselineScore, targetThreshold } = res.data;

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

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background" />
        <div className="container hero-container fade-in-up">
          <div className="badge badge-purple mb-4">
            <Sparkles size={14} className="text-purple-light" /> Genuinely Agentic • ATS Target 80 • Factual Evidence
          </div>
          <h1>
            Transform Your Resume for <br />
            <span className="gradient-text">Your Target Role</span>
          </h1>
          <p className="hero-subtitle">
            Upload your resume and paste your target job description. Our bounded AI agent performs
            full-document rewriting, intelligent skill categorization, and evidence-grounded optimization
            without fabricating qualifications.
          </p>

          <div className="stats-container">
            <div className="stat-card glass-card">
              <h3>80 pts</h3>
              <p>Target ATS Threshold</p>
            </div>
            <div className="stat-card glass-card">
              <h3>Bounded</h3>
              <p>Max 2 Rewrite Attempts</p>
            </div>
            <div className="stat-card glass-card">
              <h3>Truthful</h3>
              <p>User-Confirmed Skills</p>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Optimization Workflow */}
      <section className="upload-section">
        <div className="container">
          <div className="upload-card glass-card fade-in-up">
            <div className="card-header-area text-center mb-6">
              <h2>Resume Optimization Session</h2>
              <p className="text-muted">
                Provide your existing resume and target job requirements to begin the optimization loop.
              </p>
            </div>

            {formError && (
              <div className="form-error-banner flex items-center gap-2 mb-6">
                <AlertCircle size={18} className="text-red flex-shrink-0" />
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
                <label>Resume (PDF or TXT) <span className="text-purple">*</span></label>
                <div className="file-drop-area">
                  <Upload size={32} className="text-muted mb-2" />
                  <p>Drag & drop your resume file or click to browse</p>
                  <p className="text-muted text-xs mt-1">Accepts PDF and TXT (Max 10MB)</p>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setFormData({ ...formData, resumeFile: e.target.files[0] })}
                  />
                  {formData.resumeFile && (
                    <p className="file-name text-green flex items-center justify-center gap-1 mt-2">
                      <CheckCircle size={15} /> {formData.resumeFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Target Job Description <span className="text-purple">*</span></label>
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
                    <Loader2 size={20} className="spin" />
                    Analyzing Skill Gaps...
                  </>
                ) : (
                  <>
                    <Brain size={20} />
                    Start Optimization Session
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* How the Agent Works */}
      <section id="how-it-works" className="how-it-works container">
        <h2 className="section-title text-center">How the Optimization Agent Works</h2>
        <p className="section-subtitle text-center">
          A disciplined, bounded decision loop that respects candidate facts while maximizing ATS match.
        </p>

        <div className="steps-container">
          {[
            {
              icon: <FileText />,
              title: '1. Parse & Check Gaps',
              desc: 'Extracts skills across entire resume and job description to identify genuine gaps.'
            },
            {
              icon: <Target />,
              title: '2. Confirm Skills',
              desc: 'Prompts you to confirm whether you possess missing skills before rewriting.'
            },
            {
              icon: <RefreshCw />,
              title: '3. Full Rewrite',
              desc: 'Rewrites complete resume with categorized skills and concise action bullets.'
            },
            {
              icon: <Shield />,
              title: '4. Validate & Score',
              desc: 'Enforces factual integrity and re-scores against target threshold (80).'
            },
            {
              icon: <CheckCircle />,
              title: '5. Deliver & Export',
              desc: 'Selects the best valid candidate with real PDF export, cover letter, and Q&A prep.'
            },
          ].map((step, i) => (
            <div key={i} className="step-card glass-card text-center">
              <div className="step-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p className="text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features container mb-20">
        <h2 className="section-title text-center">Engineered for ATS & Recruiter Precision</h2>
        <div className="grid grid-cols-3">
          {[
            {
              icon: <Target className="text-cyan" size={32} />,
              title: 'Evidence-Aware Mapping',
              desc: 'Skills are only integrated if backed by resume evidence or explicit user confirmation.'
            },
            {
              icon: <Layers className="text-purple" size={32} />,
              title: 'Intelligent Categorization',
              desc: 'Organizes skills under standard headings (Frontend, Backend, Databases) rather than dumping keywords.'
            },
            {
              icon: <FileText className="text-green" size={32} />,
              title: 'Action-Oriented Bullets',
              desc: 'Converts weak descriptions into concise 1–1.5 line bullets: Action verb + approach + verifiable outcome.'
            },
            {
              icon: <MessageSquare className="text-yellow" size={32} />,
              title: 'Tailored Cover Letter & Q&A',
              desc: 'Generates role-aligned cover letters and interview prep based strictly on candidate facts.'
            },
            {
              icon: <RefreshCw className="text-orange" size={32} />,
              title: 'Bounded Decision Loop',
              desc: 'Target score threshold (80) and max 2 attempts prevent hallucination loops and wasted calls.'
            },
            {
              icon: <History className="text-cyan" size={32} />,
              title: 'Selectable Text PDF Export',
              desc: 'Download clean, single-column, ATS-friendly PDFs with verified font and layout rendering.'
            },
          ].map((f, i) => (
            <div key={i} className="feature-card glass-card">
              <div className="mb-4">{f.icon}</div>
              <h3 className="mb-2">{f.title}</h3>
              <p className="text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
