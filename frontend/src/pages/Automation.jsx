import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, Loader, Briefcase, Cpu, BarChart2, ArrowRight, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { automationAPI } from '../services/api';
import './Automation.css';

const ROLES = [
  { id: 'SDE', label: 'SDE / Software Engineer', icon: '💻' },
  { id: 'Frontend', label: 'Frontend Developer', icon: '🎨' },
  { id: 'Backend', label: 'Backend Developer', icon: '⚙️' },
  { id: 'Full Stack', label: 'Full Stack Developer', icon: '🔗' },
  { id: 'Data Science', label: 'Data Science', icon: '📊' },
  { id: 'Machine Learning', label: 'Machine Learning / AI', icon: '🤖' },
  { id: 'DevOps', label: 'DevOps / Cloud', icon: '☁️' },
  { id: 'Mobile', label: 'Mobile Development', icon: '📱' },
  { id: 'UI/UX', label: 'UI/UX Design', icon: '🖌️' },
  { id: 'Product', label: 'Product Management', icon: '🎯' },
];

const STEPS = [
  { id: 1, label: 'Resume', icon: <FileText size={18} /> },
  { id: 2, label: 'Roles', icon: <Briefcase size={18} /> },
  { id: 3, label: 'Processing', icon: <Cpu size={18} /> },
  { id: 4, label: 'Results', icon: <BarChart2 size={18} /> },
];

const Automation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [resumeFile, setResumeFile] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  const toggleRole = (roleId) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setResumeFile(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.pdf') || file.name.endsWith('.txt'))) {
      setResumeFile(file);
    }
  };

  const handleStart = async () => {
    if (!resumeFile) { setError('Please upload your resume first.'); return; }
    if (selectedRoles.length === 0) { setError('Please select at least one role.'); return; }
    setError('');
    setProcessing(true);
    setStep(3);

    try {
      setProcessingStep('🧠 Planning your job search...');
      await new Promise(r => setTimeout(r, 600));

      setProcessingStep('🌐 Fetching live jobs from Adzuna API...');
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('roles', JSON.stringify(selectedRoles));

      const res = await automationAPI.start(formData);

      setProcessingStep('📊 Computing match scores and ranking jobs...');
      await new Promise(r => setTimeout(r, 400));

      setProcessingStep('✅ Done! Redirecting to your job matches...');
      await new Promise(r => setTimeout(r, 600));

      // Navigate to jobs list with data
      navigate('/jobs', { state: { jobs: res.data.jobs, freshScan: true } });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Something went wrong';
      setError(msg);
      setProcessing(false);
      setStep(2);
    }
  };

  return (
    <div className="automation-page">
      <div className="automation-bg" />
      <div className="container">
        {/* Header */}
        <div className="automation-header fade-in-up">
          <div className="badge">🤖 Automation Mode</div>
          <h1>AI-Powered <span className="gradient-text">Job Discovery</span></h1>
          <p className="text-muted">Upload your resume, select target roles — our agents will find, match, and rank internships for you.</p>
        </div>

        {/* Step indicator */}
        <div className="step-indicator fade-in-up">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`step-dot ${
                step > s.id ? 'done' : step === s.id ? 'active' : ''
              }`}>
                {step > s.id ? <CheckCircle size={16} /> : s.icon}
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`step-line ${step > s.id ? 'done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Resume Upload */}
        {step === 1 && (
          <div className="auto-card glass-card fade-in-up">
            <h2><FileText size={22} /> Upload Your Resume</h2>
            <p className="text-muted mb-4">We'll extract your skills and suggest matching roles automatically.</p>

            <div
              className={`file-drop-zone ${resumeFile ? 'has-file' : ''}`}
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              {resumeFile ? (
                <div className="file-selected">
                  <CheckCircle size={32} className="text-green" />
                  <p className="file-name">{resumeFile.name}</p>
                  <p className="text-muted text-sm">Click to replace</p>
                </div>
              ) : (
                <div className="file-placeholder">
                  <Upload size={32} className="text-muted" />
                  <p>Drag & drop or <span className="text-purple">click to upload</span></p>
                  <p className="text-muted text-sm">PDF or TXT • Max 10MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <button
              className="btn btn-primary auto-next-btn"
              onClick={() => resumeFile ? setStep(2) : setError('Please upload your resume first.')}
            >
              Continue <ArrowRight size={18} />
            </button>
            {error && <p className="auto-error">{error}</p>}
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 2 && (
          <div className="auto-card glass-card fade-in-up">
            <h2><Briefcase size={22} /> Select Target Roles</h2>
            <p className="text-muted mb-4">
              We'll fetch live job listings from <strong>Adzuna API</strong> and rank them for your profile.
            </p>

            <div className="roles-grid">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  className={`role-card ${selectedRoles.includes(role.id) ? 'selected' : ''}`}
                  onClick={() => toggleRole(role.id)}
                >
                  <span className="role-icon">{role.icon}</span>
                  <span className="role-label">{role.label}</span>
                  {selectedRoles.includes(role.id) && (
                    <CheckCircle size={16} className="role-check" />
                  )}
                </button>
              ))}
            </div>

            {selectedRoles.length > 0 && (
              <p className="roles-summary text-muted">
                {selectedRoles.length} role{selectedRoles.length > 1 ? 's' : ''} selected
                → will scrape <strong className="text-cyan">{selectedRoles.length * 2} internships</strong>
              </p>
            )}

            {error && <p className="auto-error">{error}</p>}

            <div className="auto-actions">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStart}
                disabled={selectedRoles.length === 0}
              >
                <Cpu size={18} /> Start AI Agents
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 3 && (
          <div className="auto-card glass-card fade-in-up processing-card">
            <div className="processing-animation">
              <div className="processing-ring" />
              <Cpu size={36} className="processing-icon" />
            </div>
            <h2>Agents Running</h2>
            <p className="text-muted">{processingStep}</p>

            <div className="agent-pipeline">
              {[
                { label: 'Planner Agent', desc: 'Breaking task into subtasks', done: true },
                { label: 'Scraper Agent', desc: 'Fetching Adzuna job listings', done: processingStep.includes('Computing') || processingStep.includes('Done') },
                { label: 'Matching Agent', desc: 'Computing resume-job similarity', done: processingStep.includes('Done') },
                { label: 'Ranking Agent', desc: 'Ranking by match score', done: processingStep.includes('Done') },
              ].map((a, i) => (
                <div key={i} className={`agent-item ${a.done ? 'done' : 'pending'}`}>
                  <div className="agent-dot">
                    {a.done ? <CheckCircle size={14} /> : <Loader size={14} className="spin" />}
                  </div>
                  <div>
                    <div className="agent-name">{a.label}</div>
                    <div className="agent-desc text-muted">{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Automation;
