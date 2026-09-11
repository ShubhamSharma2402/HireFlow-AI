import axios from 'axios';
import { auth } from '../firebase';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

// Auto-attach Firebase ID token to all requests if user is logged in
api.interceptors.request.use(
  async (config) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[API] Failed to attach auth token:', err.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[API] Unauthorized — user may need to log in again');
    }
    console.error('API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ── Existing APIs (preserved) ────────────────────────────────
export const agentAPI = {
  runAgent: (formData) =>
    api.post('/agent/run', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000, // 3 min
    }),
  getAnalysis: (id) => api.get(`/agent/analysis/${id}`),
  getApplication: (id) => api.get(`/agent/application/${id}`),
  approveApplication: (id) => api.put(`/agent/application/${id}/approve`),
};

// ── New Auth API ─────────────────────────────────────────────
export const authAPI = {
  syncUser: (data) => api.post('/auth/sync', data),
  getMe: () => api.get('/auth/me'),
};

// ── New Automation API ───────────────────────────────────────
export const automationAPI = {
  /** Step 1-4: Upload resume + roles → scrape + match → ranked jobs */
  start: (formData) =>
    api.post('/automation/start', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min (scraping can be slow)
    }),

  /** Get all ranked job matches for current user */
  getJobs: () => api.get('/automation/jobs'),

  /** Run full optimization for a specific job */
  optimizeForJob: (jobId) =>
    api.post(`/automation/optimize/${jobId}`, {}, { timeout: 180000 }),
};

// ── Legacy APIs ──────────────────────────────────────────────
export const userAPI = {
  createUser: (data) => api.post('/users', data),
  getUser: (id) => api.get(`/users/${id}`),
};

export const resumeAPI = {
  uploadResume: (data) => api.post('/resume/upload', data),
};

export const jobAPI = {
  saveJob: (data) => api.post('/job', data),
};

export default api;
