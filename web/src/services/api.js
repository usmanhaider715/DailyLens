import axios from 'axios';

const baseURL =
  typeof window !== 'undefined'
    ? '/api'
    : `${process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api`;

export const api = axios.create({ baseURL, timeout: 60000 });

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

if (typeof window !== 'undefined') {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error?.response?.status === 401 &&
        window.location.pathname.startsWith('/admin') &&
        !window.location.pathname.startsWith('/admin/login')
      ) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = `/admin/login?from=${encodeURIComponent(window.location.pathname)}`;
      }
      return Promise.reject(error);
    },
  );
}
