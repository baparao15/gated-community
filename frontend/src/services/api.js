import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 9000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The backend rotates the refresh token on every use and rejects the previous one, so
// when several requests 401 at the same moment they must share a single refresh call —
// otherwise every request but the first would race with an already-stale token and get
// the whole session logged out.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const requestUrl = original?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/register')
      || requestUrl.includes('/auth/refresh')
      || requestUrl.includes('/auth/forgot-password')
      || requestUrl.includes('/auth/reset-password');
    const refreshToken = localStorage.getItem('refresh_token');
    if (error.response?.status === 401 && refreshToken && !isAuthRequest && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
            .then(({ data }) => {
              localStorage.setItem('access_token', data.data.accessToken);
              localStorage.setItem('refresh_token', data.data.refreshToken);
              return data.data.accessToken;
            })
            .finally(() => { refreshPromise = null; });
        }
        const accessToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('community_user');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
