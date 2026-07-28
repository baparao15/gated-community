import api from './api';

export const marketplaceAPI = {
  list: (params) => api.get('/marketplace', { params }),
  mine: () => api.get('/marketplace/mine'),
  myOrders: () => api.get('/marketplace/orders/mine'),
  get: (id) => api.get(`/marketplace/${id}`),
  create: (payload) => api.post('/marketplace', payload),
  update: (id, payload) => api.patch(`/marketplace/${id}`, payload),
  remove: (id) => api.delete(`/marketplace/${id}`),
  order: (id, payload) => api.post(`/marketplace/${id}/order`, payload),
  updateOrder: (id, orderId, payload) => api.patch(`/marketplace/${id}/orders/${orderId}`, payload),
};
