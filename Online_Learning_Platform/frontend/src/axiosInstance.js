/**
 * Centralised Axios instance for all API calls.
 *
 * In development, VITE_API_URL is not set so baseURL falls back to ""
 * and Vite's dev proxy (configured in vite.config.js) forwards requests
 * to http://localhost:1935.
 *
 * In production (Vercel), VITE_API_URL must be set to the Render backend URL,
 * e.g. https://your-olp-backend.onrender.com
 */
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  // withCredentials removed — no longer using cookies
});

// Automatically attach token to every request via Authorization header
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
