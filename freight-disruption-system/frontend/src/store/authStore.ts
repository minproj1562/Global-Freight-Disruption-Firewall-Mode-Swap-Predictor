// frontend/src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  registerPortManager, 
  loginPortManager, 
  type PortManagerRegisterData as APIPortManagerData,
  type LoginCredentials 
} from '@/services/api';

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
  token: string | null; // JWT token
  user: {
    id?: string; // User ID from backend
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
    securityPassId?: string;
  }) => Promise<boolean>;
  logout: () => void;
  setAuthSession: (
    user: { id?: string; name: string; email: string; username?: string; portName?: string },
    token: string,
    role: UserRole
  ) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      isAuthenticated: false,
      token: null,
      user: null,

      setRole: (role) => set({ role }),

      login: async (emailOrUser, password, role, assignedPort) => {
        try {
          // Call real backend API
          const credentials: LoginCredentials = {
            username_or_email: emailOrUser,
            password,
            role: role || undefined,
          };

          const response = await loginPortManager(credentials);

          // Store token in localStorage for axios interceptor
          localStorage.setItem('token', response.access_token);

          // Map backend response to frontend user structure
          set({
            role: response.user.role as UserRole,
            isAuthenticated: true,
            token: response.access_token,
            user: {
              id: response.user.id,
              name: response.user.full_name,
              email: response.user.email,
              username: response.user.username,
              portName: assignedPort || 'Port of Rotterdam',
            },
          });

          return true;
        } catch (error: any) {
          console.error('Backend Login error:', error);
          
          // Re-throw error so PortManagerAuthPage can display backend error message if backend is active
          if (error.message && !error.message.includes('Failed to fetch')) {
            throw error;
          }

          // Fallback to demo mode only if backend server is offline (Failed to fetch)
          if (password && password.trim().length > 0) {
            const userNameFormatted = emailOrUser.includes('@')
              ? emailOrUser.split('@')[0].replace('.', ' ').toUpperCase()
              : emailOrUser.toUpperCase();

            const demoToken = 'demo-token';
            localStorage.setItem('token', demoToken);

            set({
              role: role || 'port',
              isAuthenticated: true,
              token: demoToken,
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
        }
      },

      register: async (data) => {
        try {
          // Map frontend data to backend API format
          const apiData: APIPortManagerData = {
            email: data.email,
            password: data.password,
            full_name: data.name,
            username: data.username || data.email.split('@')[0],
            employee_id: data.employeeId || `PM-${Math.floor(10000 + Math.random() * 90000)}`,
            mobile_number: data.mobileNumber || undefined,
            port_name: data.portName || 'Port of Rotterdam',
            department: data.department || undefined,
            security_pass_id: data.securityPassId || undefined,
          };

          const response = await registerPortManager(apiData);

          // Store token in localStorage for axios interceptor
          localStorage.setItem('token', response.access_token);

          // Set authenticated state
          set({
            role: response.user.role as UserRole,
            isAuthenticated: true,
            token: response.access_token,
            user: {
              id: response.user.id,
              name: response.user.full_name,
              email: response.user.email,
              username: response.user.username,
              employeeId: apiData.employee_id,
              mobileNumber: data.mobileNumber || '+1 (555) 019-2834',
              portName: data.portName || 'Port of Rotterdam',
              department: data.department || 'Terminal Operations Command',
            },
          });

          return true;
        } catch (error: any) {
          console.error('Backend Registration error:', error);
          
          // Re-throw error so PortManagerAuthPage can display backend error message if backend is active
          if (error.message && !error.message.includes('Failed to fetch')) {
            throw error;
          }

          // Fallback to demo mode only if backend server is offline (Failed to fetch)
          const demoToken = 'demo-token';
          localStorage.setItem('token', demoToken);

          set({
            role: data.role || 'port',
            isAuthenticated: true,
            token: demoToken,
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
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
        set({
          role: null,
          isAuthenticated: false,
          token: null,
          user: null,
        });
      },

      setAuthSession: (user, token, role) => {
        localStorage.setItem('token', token);
        set({
          role,
          isAuthenticated: true,
          token,
          user,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);