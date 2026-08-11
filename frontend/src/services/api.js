import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const agentAPI = {
  runAgent: (formData) => api.post('/agent/run', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAnalysis: (id) => api.get(`/agent/analysis/${id}`),
  getApplication: (id) => api.get(`/agent/application/${id}`),
};

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
