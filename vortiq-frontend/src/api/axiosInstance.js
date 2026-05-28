import axios from "axios";

let apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";

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

// ── Response interceptor ──
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRoute = error.config?.url?.includes("/auth/login");
    const isRegisterRoute = error.config?.url?.includes("/auth/register");

    // Only auto-logout on 401 for non-auth routes
    // (login/register 401 = wrong credentials, not expired session)
    if (status === 401 && !isLoginRoute && !isRegisterRoute) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error); // always let caller handle the error
  }
);

export default axiosInstance;