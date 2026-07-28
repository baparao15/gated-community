import api from './api';

export const bookingAPI = {
  facilities: (params) => api.get('/facilities', { params }),
  create: (payload) => api.post('/bookings', payload),
  list: (params) => api.get('/bookings', { params }),
  approve: (id, action = 'approve') => api.patch(`/bookings/${id}/approve`, { action }),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`),
};
