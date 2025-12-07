import { create } from "zustand";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("admin_token"),
  isAuthenticated: !!localStorage.getItem("admin_token"),

  init: () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  },

  login: async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/admin/auth/login`, {
        username,
        password,
      });
      const { token } = response.data;
      localStorage.setItem("admin_token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      set({ token, isAuthenticated: true });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  },

  logout: () => {
    const token = get().token;
    if (token) {
      axios.post(`${API_URL}/admin/auth/logout`, { token }).catch(() => {});
    }
    localStorage.removeItem("admin_token");
    delete axios.defaults.headers.common["Authorization"];
    set({ token: null, isAuthenticated: false });
  },
}));
