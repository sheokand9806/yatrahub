import axios from 'axios';

// Same origin in production (Express serves the app); proxied by Vite in dev.
const api = axios.create({ baseURL: '/api/v1', withCredentials: true });

export const errorMessage = err =>
  err?.response?.data?.message || err?.message || 'Something went wrong!';

export default api;
