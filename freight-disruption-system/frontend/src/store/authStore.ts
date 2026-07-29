// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'operations' | 'port' | 'admin' | null;

export interface UserProfile {
  name: string;
  employeeId?: string;
  email: string;
  mobileNumber?: string;
  portName?: string;
  username?: string;
  department?: string;
  accessLevel?: string;
  role: UserRole;
}

interface AuthState {
  role: UserRole;
  isAuthenticated: boolean;
  user: UserProfile | null;
  setRole: (role: UserRole) => void;
  login: (credentials: {
    usernameOrEmail: string;
    password: string;
    employeeId?: string;
    role: UserRole;
  }) => Promise<boolean>;
  registerPortManager: (details: {
    fullName: string;
    employeeId: string;
    email: string;
    mobileNumber: string;
    portName: string;
    username: string;
    password: string;
    department?: string;
    accessLevel?: string;
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

      login: async ({ usernameOrEmail, password, employeeId, role }) => {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Demo condition (or any password demo123/admin)
        if (password === 'demo123' || password.length >= 6) {
          set({
            role: role || 'port',
            isAuthenticated: true,
            user: {
              name: usernameOrEmail.includes('@')
                ? usernameOrEmail.split('@')[0].toUpperCase()
                : usernameOrEmail,
              email: usernameOrEmail.includes('@')
                ? usernameOrEmail
                : `${usernameOrEmail}@portauthority.gov`,
              employeeId: employeeId || 'PM-88204',
              portName: 'Port of Rotterdam',
              username: usernameOrEmail,
              department: 'Harbor Control & Quay Ops',
              accessLevel: 'Senior Port Director',
              role: role || 'port',
            },
          });
          return true;
        }
        return false;
      },

      registerPortManager: async (details) => {
        // Simulate API network call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        set({
          role: 'port',
          isAuthenticated: true,
          user: {
            name: details.fullName,
            employeeId: details.employeeId,
            email: details.email,
            mobileNumber: details.mobileNumber,
            portName: details.portName,
            username: details.username,
            department: details.department || 'Harbor Operations',
            accessLevel: details.accessLevel || 'Port Authority Manager',
            role: 'port',
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
      name: 'auth-storage-v2',
    }
  )
);