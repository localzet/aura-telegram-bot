import axios from "axios";

// In dev mode, use proxy. In production, use full URL or relative /api
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "/api"
    : typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:3000/api`
      : "/api");

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  },
);
