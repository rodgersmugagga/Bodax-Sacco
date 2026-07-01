import axios from 'axios';

// In production (Render), VITE_API_BASE_URL is the full API origin,
// e.g. "https://bodax-api.onrender.com".
// In local dev it is empty, so axios uses the Vite proxy via "/api".
const baseURL = (typeof __API_BASE_URL__ !== 'undefined' && __API_BASE_URL__)
  ? `${__API_BASE_URL__}/api`
  : '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bodax_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
