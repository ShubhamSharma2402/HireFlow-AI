import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, TrendingUp, Shield, Eye, RefreshCw, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { automationAPI } from '../services/api';
import './JobsList.css';

const ScoreBadge = ({ score, type = 'match' }) => {
  const color = score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red';
  return (
    <span className={`score-badge score-${color}`}>
      {score}%
    </span>
  );
};

const JobsList = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState(location.state?.jobs || []);
  const [loading, setLoading] = useState(jobs.length === 0);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('rank');
  const [sortDir, setSortDir] = useState('asc');
  const [filterRole, setFilterRole] = useState('All');

  useEffect(() => {
    if (jobs.length === 0) {
      fetchJobs();
    }
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await automationAPI.getJobs();
      setJobs(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load jobs. Please run automation first.');
    } finally {
      setLoading(false);
    }
  };

  const roles = ['All', ...new Set(jobs.map(j => j.role).filter(Boolean))];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'rank' ? 'asc' : 'desc');
    }
  };

  const sorted = [...jobs]
    .filter(j => filterRole === 'All' || j.role === filterRole)
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'rank') return (a.rank - b.rank) * mul;
      if (sortField === 'matchScore') return (a.matchScore - b.matchScore) * mul;
      if (sortField === 'atsScoreEstimate') return (a.atsScoreEstimate - b.atsScoreEstimate) * mul;
      return 0;
    });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={14} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="jobs-page">
      <div className="container">
        {/* Header */}
        <div className="jobs-header fade-in-up">
          <div>
            <h1>Your <span className="gradient-text">Job Matches</span></h1>
            <p className="text-muted">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} ranked by AI match score
            </p>
          </div>
          <div className="jobs-header-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/automation')}>
              <RefreshCw size={16} /> New Scan
            </button>
          </div>
        </div>

        {/* Filters */}
        {roles.length > 1 && (
          <div className="jobs-filters fade-in-up">
            <Filter size={16} className="text-muted" />
            {roles.map(r => (
              <button
                key={r}
                className={`filter-btn ${filterRole === r ? 'active' : ''}`}
                onClick={() => setFilterRole(r)}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="jobs-loading">
            <div className="spinner" />
            <p className="text-muted">Loading your job matches...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="jobs-error glass-card">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/automation')}>
              Run Automation
            </button>
          </div>
        )}

        {/* Jobs Table */}
        {!loading && !error && sorted.length > 0 && (
          <div className="jobs-table-wrapper fade-in-up">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('rank')} className="sortable">
                    # <SortIcon field="rank" />
                  </th>
                  <th>Job Title</th>
                  <th>Type</th>
                  <th>Company</th>
                  <th onClick={() => handleSort('matchScore')} className="sortable">
                    Match Score <SortIcon field="matchScore" />
                  </th>
                  <th onClick={() => handleSort('atsScoreEstimate')} className="sortable">
                    ATS Score <SortIcon field="atsScoreEstimate" />
                  </th>
                  <th>Skills Gap</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((job, i) => (
                  <tr key={job._id || job.jobId || i} className="job-row">
                    <td className="rank-cell">
                      <span className={`rank-badge ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                        {job.rank}
                      </span>
                    </td>
                    <td>
                      <div className="job-title">{job.title}</div>
                      {job.role && <div className="job-role-tag">{job.role}</div>}
                    </td>
                    <td>
                      <span className={`job-type-tag job-type-${job.jobType || 'unknown'}`}>
                        {job.jobType === 'internship' ? '🎓 Internship'
                         : job.jobType === 'full-time' ? '💼 Full-time'
                         : job.jobType === 'part-time' ? '⏰ Part-time'
                         : job.jobType === 'contract' ? '📝 Contract'
                         : '⚡ Open'}
                      </span>
                    </td>
                    <td className="company-cell">{job.company}</td>
                    <td>
                      <div className="score-cell">
                        <ScoreBadge score={job.matchScore} />
                        <div className="score-bar">
                          <div className="score-fill" style={{ width: `${job.matchScore}%`, background: job.matchScore >= 70 ? 'var(--green)' : job.matchScore >= 50 ? 'var(--yellow)' : 'var(--red)' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <ScoreBadge score={job.atsScoreEstimate} type="ats" />
                    </td>
                    <td>
                      <div className="skills-gap">
                        {(job.missingSkills || []).slice(0, 2).map((s, si) => (
                          <span key={si} className="skill-tag missing">{s}</span>
                        ))}
                        {(job.missingSkills || []).length > 2 && (
                          <span className="skill-tag more">+{job.missingSkills.length - 2}</span>
                        )}
                        {(job.missingSkills || []).length === 0 && (
                          <span className="skill-tag strong">✓ Great match</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary view-btn"
                        onClick={() => navigate(`/jobs/${job._id || job.jobId}`, { state: { job } })}
                      >
                        <Eye size={15} /> Optimize
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && sorted.length === 0 && (
          <div className="jobs-empty glass-card fade-in-up">
            <Briefcase size={48} className="text-muted" />
            <h2>No Jobs Found</h2>
            <p className="text-muted">Run the automation to discover internships matching your profile.</p>
            <button className="btn btn-primary" onClick={() => navigate('/automation')}>
              Start Job Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsList;
