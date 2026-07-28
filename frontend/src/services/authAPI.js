import api from './api';

export const authAPI = {
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken = localStorage.getItem('refresh_token')) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
};
