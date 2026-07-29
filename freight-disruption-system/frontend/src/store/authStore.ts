// frontend/src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'operations' | 'port' | 'admin' | null;

export interface PortManagerData {
  fullName: string;
  employeeId: string;
  email: string;
  mobileNumber: string;
  portName: string;
  username: string;
  department?: string;
  securityPassId?: string;
}

interface AuthState {
  role: UserRole;
  isAuthenticated: boolean;
  user: {
    name: string;
    email: string;
    organization?: string;
    employeeId?: string;
    mobileNumber?: string;
    portName?: string;
    username?: string;
    department?: string;
  } | null;
  setRole: (role: UserRole) => void;
  login: (emailOrUser: string, password: string, role: UserRole, assignedPort?: string) => Promise<boolean>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    employeeId?: string;
    mobileNumber?: string;
    portName?: string;
    username?: string;
    department?: string;
  }) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      isAuthenticated: false,
      user: null,

      setRole: (role) => set({ role }),

      login: async (emailOrUser, password, role, assignedPort) => {
        // Simulate API check
        await new Promise((resolve) => setTimeout(resolve, 600));

        if (password && password.trim().length > 0) {
          const userNameFormatted = emailOrUser.includes('@')
            ? emailOrUser.split('@')[0].replace('.', ' ').toUpperCase()
            : emailOrUser.toUpperCase();

          set({
            role: role || 'port',
            isAuthenticated: true,
            user: {
              name: userNameFormatted,
              email: emailOrUser.includes('@') ? emailOrUser : `${emailOrUser}@portops.gov`,
              username: emailOrUser,
              portName: assignedPort || 'Port of Rotterdam',
              employeeId: `PM-${Math.floor(10000 + Math.random() * 90000)}`,
            },
          });
          return true;
        }
        return false;
      },

      register: async (data) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));

        set({
          role: data.role || 'port',
          isAuthenticated: true,
          user: {
            name: data.name,
            email: data.email,
            employeeId: data.employeeId || `PM-${Math.floor(10000 + Math.random() * 90000)}`,
            mobileNumber: data.mobileNumber || '+1 (555) 019-2834',
            portName: data.portName || 'Port of Rotterdam',
            username: data.username || data.email.split('@')[0],
            department: data.department || 'Terminal Operations Command',
          },
        });
        return true;
      },

      logout: () =>
        set({
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