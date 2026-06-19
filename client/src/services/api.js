import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request Interceptor: Inject JWT token from localStorage dynamically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 unauthorized errors (expired/invalid tokens)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout
      localStorage.removeItem('token');
      // Redirect to login if on a protected route
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- API Service Methods ---

export const authAPI = {
  register: async (name, email, password) => {
    const response = await api.post('/api/auth/register', { name, email, password });
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  }
};

export const subscribersAPI = {
  getAll: async (page = 1, limit = 10, search = '', status = '') => {
    const response = await api.get('/api/subscribers', {
      params: { page, limit, search, status }
    });
    return response.data;
  },
  addOne: async (name, email) => {
    const response = await api.post('/api/subscribers', { name, email });
    return response.data;
  },
  importCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/subscribers/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  remove: async (id) => {
    const response = await api.delete(`/api/subscribers/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/api/subscribers/stats');
    return response.data;
  },
  sendDirect: async (id, subject, body, attachments = []) => {
    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('body', body);
    // Append each File object under the 'attachments' key
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
    const response = await api.post(`/api/subscribers/${id}/send-direct`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

export const campaignsAPI = {
  getAll: async (page = 1, limit = 10, status = '') => {
    const response = await api.get('/api/campaigns', {
      params: { page, limit, status }
    });
    return response.data;
  },
  create: async (title, subject, body) => {
    const response = await api.post('/api/campaigns', { title, subject, body });
    return response.data;
  },
  getOne: async (id) => {
    const response = await api.get(`/api/campaigns/${id}`);
    return response.data;
  },
  update: async (id, title, subject, body) => {
    const response = await api.put(`/api/campaigns/${id}`, { title, subject, body });
    return response.data;
  },
  remove: async (id) => {
    const response = await api.delete(`/api/campaigns/${id}`);
    return response.data;
  },
  send: async (id) => {
    const response = await api.post(`/api/campaigns/${id}/send`);
    return response.data;
  },
  getStatus: async (id) => {
    const response = await api.get(`/api/campaigns/${id}/status`);
    return response.data;
  },
  resendNonOpeners: async (id) => {
    const response = await api.post(`/api/campaigns/${id}/resend-non-openers`);
    return response.data;
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/api/campaigns/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  sendTest: async (id, email) => {
    const response = await api.post(`/api/campaigns/${id}/send-test`, { email });
    return response.data;
  }
};

export const analyticsAPI = {
  getOverview: async () => {
    const response = await api.get('/api/analytics/overview');
    return response.data;
  },
  getCampaign: async (id) => {
    const response = await api.get(`/api/analytics/campaigns/${id}`);
    return response.data;
  },
  getGrowth: async () => {
    const response = await api.get('/api/analytics/subscribers/growth');
    return response.data;
  }
};

export const aiAPI = {
  writeCampaign: async (topic, tone, audience, type, prompt) => {
    const response = await api.post('/api/ai/write-campaign', { topic, tone, audience, type, prompt });
    return response.data;
  },
  optimizeSubject: async (subjectLine) => {
    const response = await api.post('/api/ai/optimize-subject', { subjectLine });
    return response.data;
  },
  analyzeCampaign: async (campaignId) => {
    const response = await api.post('/api/ai/analyze-campaign', { campaignId });
    return response.data;
  },
  rewrite: async (body, option) => {
    const response = await api.post('/api/ai/rewrite', { body, option });
    return response.data;
  },
  suggestSubjects: async (topic, body) => {
    const response = await api.post('/api/ai/suggest-subjects', { topic, body });
    return response.data;
  }
};

export default api;
