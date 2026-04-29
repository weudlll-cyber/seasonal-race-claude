// Backend base URL. Set VITE_API_URL in a .env file to override (e.g. for staging or VPS).
// This file is the single place to change when the server moves from localhost to production.
// Usage in L.2+: import { API_BASE_URL } from '../services/api.js';
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
