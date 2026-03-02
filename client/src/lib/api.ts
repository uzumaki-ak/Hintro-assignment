import axios from "axios";

// Get the API base URL based on environment
const getBaseURL = (): string => {
  // In production, use the full API URL
  if (import.meta.env.PROD) {
    const apiUrl = import.meta.env.VITE_API_URL || "https://hintro-api.onrender.com";
    return `${apiUrl}/api`;
  }
  // In development, use relative path (proxied by Vite)
  return "/api";
};

// Axios instance with base URL and auth interceptor
const api = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request if available in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses by clearing auth state and redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
