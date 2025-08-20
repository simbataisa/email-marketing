/**
 * Authentication store using Zustand
 * Manages user authentication state and API calls
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  getCurrentUser: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

// Configure axios defaults
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

axios.defaults.baseURL = API_BASE_URL;

// Add request interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await axios.post('/api/auth/login', {
            email,
            password
          });
          
          const { user, token } = response.data;
          
          set({
            user,
            token,
            isLoading: false,
            error: null
          });
          
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Login failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          return false;
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await axios.post('/api/auth/register', userData);
          
          const { user, token } = response.data;
          
          set({
            user,
            token,
            isLoading: false,
            error: null
          });
          
          return true;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Registration failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          error: null
        });
      },

      clearError: () => {
        set({ error: null });
      },

      getCurrentUser: async () => {
        const { token } = get();
        
        if (!token) {
          return;
        }
        
        try {
          const response = await axios.get('/api/auth/me');
          const user = response.data.user;
          
          set({ user });
        } catch (error) {
          console.error('Failed to get current user:', error);
          // Don't logout here as it might be a temporary network issue
        }
      },

      initializeAuth: async () => {
        const { token, getCurrentUser } = get();
        
        if (token) {
          await getCurrentUser();
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token
      })
    }
  )
);