import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const eventsApi = {
  list: () => api.get('/events'),
  get: (id: string) => api.get(`/events/${id}`),
  create: (data: { name: string; store_name?: string }) => api.post('/events', data),
  join: (invite_code: string) => api.post('/events/join', { invite_code }),
  update: (id: string, data: { name: string; store_name?: string }) => api.patch(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
};

export const itemsApi = {
  add: (data: {
    event_id: string;
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    notes?: string;
    requested_for?: string;
  }) => api.post('/items', data),
  claim: (id: string) => api.patch(`/items/${id}/claim`),
  unclaim: (id: string) => api.patch(`/items/${id}/unclaim`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/items/${id}/status`, { status }),
  updateRequestedFor: (id: string, requested_for: string) =>
    api.patch(`/items/${id}/requested-for`, { requested_for }),
  update: (id: string, data: { name?: string; quantity?: number; unit?: string; category?: string; notes?: string }) =>
    api.patch(`/items/${id}`, data),
  delete: (id: string) => api.delete(`/items/${id}`),
};
