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
