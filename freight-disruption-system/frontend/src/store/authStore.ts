// frontend/src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'operations' | 'port' | 'admin' | null;

interface AuthState {
  role: UserRole;
  isAuthenticated: boolean;
  user: {
    name: string;
    email: string;
    organization?: string;
  } | null;
  setRole: (role: UserRole) => void;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      isAuthenticated: false,
      user: null,
      
      setRole: (role) => set({ role }),
      
      login: async (email, password, role) => {
        // FASTAPI REPLACEMENT POINT: POST /api/v1/auth/token (OAuth2 password flow)
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Accept demo login credentials
        if (password && password.trim().length > 0) {
          set({
            role: role || 'operations',
            isAuthenticated: true,
            user: {
              name: email.split('@')[0].replace('.', ' ').toUpperCase(),
              email,
            },
          });
          return true;
        }
        return false;
      },
      
      register: async (email, _password, name, role) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock registration (replace with real API call)
        // In production, validate email doesn't exist, hash password, etc.
        set({
          role,
          isAuthenticated: true,
          user: {
            name,
            email,
          },
        });
        return true;
      },
      
      logout: () => set({
        role: null,
        isAuthenticated: false,
        user: null,
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);