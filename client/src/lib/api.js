import axios from 'axios';
import { supabase } from './supabase.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Attach current Supabase JWT to every outbound request.
// supabase.auth.getSession() always returns the live (refreshed) token.
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Surface server-side error messages cleanly
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error ?? err.message;
    return Promise.reject(new Error(message));
  }
);

export default api;
