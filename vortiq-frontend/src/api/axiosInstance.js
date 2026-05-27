/**
 * Axios instance for Vortiq API.
 *
 * - Reads base URL from VITE_API_BASE_URL env variable.
 * - Automatically attaches the JWT access token from localStorage
 *   to every request's Authorization header.
 * - No hardcoded URLs or tokens.
 */

import axios from "axios";

let apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
if (apiBaseUrl.endsWith("/api/")) {
  apiBaseUrl = apiBaseUrl.slice(0, -5);
} else if (apiBaseUrl.endsWith("/api")) {
  apiBaseUrl = apiBaseUrl.slice(0, -4);
}

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach JWT token ──
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 (expired token) ──
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear stored tokens and redirect to login
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
