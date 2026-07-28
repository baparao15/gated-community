import api from './api';

export const businessAPI = {
  list: (params) => api.get('/business', { params }),
  mine: () => api.get('/business/mine'),
  get: (id) => api.get(`/business/${id}`),
  create: (payload) => api.post('/business', payload),
  update: (id, payload) => api.patch(`/business/${id}`, payload),
  remove: (id) => api.delete(`/business/${id}`),
};
