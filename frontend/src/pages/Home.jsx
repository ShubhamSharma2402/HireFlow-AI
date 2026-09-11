import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, ArrowRight, Brain, Target, MessageSquare, RefreshCw, Layers, History, Zap, Bot } from 'lucide-react';
import { agentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AgentProgress from '../components/AgentProgress';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState('manual'); // 'manual' | 'automation'
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    jobDescription: '',
    resumeFile: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.resumeFile || !formData.jobDescription) return;

    setLoading(true);
    try {
      const data = new FormData();
      data.append('userName', formData.name || 'Candidate');
      data.append('jobText', formData.jobDescription);
      data.append('resume', formData.resumeFile);

      const res = await agentAPI.runAgent(data);
      setLoading(false);

      if (res && res.success) {
        navigate('/results', { state: { result: res.data } });
      } else {
        alert('Agent returned an unexpected response. Check the console.');
        console.error('Agent response:', res);
      }
    } catch (error) {
      setLoading(false);
      const msg = error?.response?.data?.message || error.message || 'Unknown error';
      alert(`Error running agent: ${msg}`);
      console.error('Agent error:', error);
    }
  };

  return (
    <div className="home-page">
      {loading && <AgentProgress onCancel={() => setLoading(false)} />}

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background" />
        <div className="hero-glow-ring" />
        <div className="hero-chips">
          {['React', 'Node.js', 'ATS Score', 'Python', 'MongoDB', 'Docker', 'ML / AI', 'TypeScript'].map((chip, i) => (
            <span key={i} className="hero-chip">{chip}</span>
          ))}
        </div>
        <div className="container hero-container fade-in-up">
          <div className="badge">
            <SparklesIcon /> AI-Powered • Agentic • Intelligent
          </div>
          <h1>
            Land Your Dream Job with <br />
            <span className="gradient-text">AI-Powered Precision</span>
          </h1>
          <p className="hero-subtitle">
            Upload your resume and let our multi-agent AI find jobs, optimize your application, beat ATS systems, and impress recruiters — automatically.
          </p>

          <div className="stats-container">
            <div className="stat-card glass-card">
              <h3>94%</h3>
              <p>Match Rate</p>
            </div>
            <div className="stat-card glass-card">
              <h3>3x</h3>
              <p>More Interviews</p>
            </div>
            <div className="stat-card glass-card">
              <h3>100%</h3>
              <p>ATS Optimized</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mode Toggle */}
      <section className="mode-section">
        <div className="container">
          <div className="mode-toggle-wrapper fade-in-up">
            <p className="mode-label text-muted">Choose your mode</p>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
                onClick={() => setMode('manual')}
              >
                <FileText size={18} />
                <span>
                  <strong>Manual Mode</strong>
                  <small>Upload resume + paste job description</small>
                </span>
              </button>
              <button
                className={`mode-btn ${mode === 'automation' ? 'active' : ''}`}
                onClick={() => setMode('automation')}
              >
                <Bot size={18} />
                <span>
                  <strong>Automation Mode</strong>
                  <small>AI finds & applies to jobs for you</small>
                </span>
                <span className="mode-badge">NEW</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Conditional Content by Mode */}
      {mode === 'manual' ? (
        /* ── MANUAL MODE (Existing — Unchanged) ── */
        <section className="upload-section">
          <div className="container">
            <div className="upload-card glass-card fade-in-up">
              <h2>Optimize Your Application</h2>
              <form onSubmit={handleSubmit} className="upload-form">
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Job Description</label>
                  <textarea
                    className="input-field"
                    placeholder="Paste the job description here..."
                    value={formData.jobDescription}
                    onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Resume (PDF or TXT)</label>
                  <div className="file-drop-area">
                    <Upload size={32} className="text-muted mb-2" />
                    <p>Drag & drop or click to upload</p>
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={(e) => setFormData({ ...formData, resumeFile: e.target.files[0] })}
                      required
                    />
                    {formData.resumeFile && (
                      <p className="file-name text-green">{formData.resumeFile.name}</p>
                    )}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary submit-btn">
                  <Brain size={20} />
                  Run AI Agent
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : (
        /* ── AUTOMATION MODE (New) ── */
        <section className="automation-cta-section">
          <div className="container">
            <div className="automation-cta glass-card fade-in-up">
              <div className="automation-cta-icon">
                <Bot size={40} />
              </div>
              <h2>Let AI Do the Job Hunt</h2>
              <p className="text-muted">
                Upload your resume once. Our AI agents will fetch real job listings from Adzuna,
                match them against your skills, rank by compatibility, and optimize your resume
                for each job — all automatically.
              </p>
              <div className="automation-cta-steps">
                {[
                  { step: '1', label: 'Upload Resume', icon: '📄' },
                  { step: '2', label: 'Select Roles', icon: '🎯' },
                  { step: '3', label: 'AI Fetches & Ranks', icon: '🤖' },
                  { step: '4', label: 'Get Optimized Apps', icon: '✅' },
                ].map((s) => (
                  <div key={s.step} className="cta-step">
                    <span className="cta-step-icon">{s.icon}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
              {user ? (
                <button
                  className="btn btn-primary automation-start-btn"
                  onClick={() => navigate('/automation')}
                >
                  <Zap size={20} /> Start Automation
                </button>
              ) : (
                <div className="auth-cta">
                  <p className="text-muted">Sign in to unlock automation mode</p>
                  <button
                    className="btn btn-primary automation-start-btn"
                    onClick={() => navigate('/login')}
                  >
                    Sign In to Continue
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works container">
        <h2 className="section-title text-center">How It Works</h2>
        <div className="steps-container">
          {[
            { icon: <FileText />, title: 'Parse', desc: 'Extracts data from resume & job desc.' },
            { icon: <Target />, title: 'Analyze', desc: 'Identifies gaps & keyword matches.' },
            { icon: <RefreshCw />, title: 'Optimize', desc: 'Rewrites resume to highlight fit.' },
            { icon: <MessageSquare />, title: 'Generate', desc: 'Creates tailored cover letter & Q&A.' },
            { icon: <CheckCircle />, title: 'Review', desc: 'You approve the final ATS-friendly result.' },
          ].map((step, i) => (
            <div key={i} className="step-card glass-card text-center">
              <div className="step-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p className="text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="features container mb-20">
        <h2 className="section-title text-center">Features</h2>
        <div className="grid grid-cols-3">
          {[
            { icon: <Target className="text-cyan" size={32} />, title: 'Match Score', desc: 'See exactly how well your resume matches the job description before and after optimization.' },
            { icon: <Layers className="text-purple" size={32} />, title: 'ATS Optimization', desc: 'Ensures your resume passes through Applicant Tracking Systems with perfect formatting.' },
            { icon: <FileText className="text-green" size={32} />, title: 'Smart Cover Letter', desc: 'Generates a highly personalized cover letter highlighting your most relevant experience.' },
            { icon: <MessageSquare className="text-yellow" size={32} />, title: 'Q&A Prep', desc: 'Anticipates interview questions based on the job and provides tailored answers.' },
            { icon: <RefreshCw className="text-orange" size={32} />, title: 'Before/After Diff', desc: 'Transparently see exactly what the AI changed with an intuitive side-by-side view.' },
            { icon: <History className="text-cyan" size={32} />, title: 'Agent Memory', desc: 'The system remembers your profile and improves suggestions over multiple applications.' },
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

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3l2 5h5l-4 4 1 5-4-3-4 3 1-5-4-4h5l2-5z" />
  </svg>
);

export default Home;
