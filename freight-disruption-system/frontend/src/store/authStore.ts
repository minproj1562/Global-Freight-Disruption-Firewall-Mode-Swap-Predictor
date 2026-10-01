// frontend/src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  registerPortManager, 
  loginPortManager, 
  registerLogisticsManager,
  loginLogisticsManager,
  loginAdmin,
  type PortManagerRegisterData as APIPortManagerData,
  type LogisticsManagerRegisterData,
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
    portId?: string;   // Real DB id of the assigned port (Port Managers)
    portCode?: string; // UN/LOCODE of the assigned port
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
    organization?: string;
    employeeId?: string;
    mobileNumber?: string;
    portName?: string;
    username?: string;
    department?: string;
    securityPassId?: string;
  }) => Promise<boolean>;
  logout: () => void;
  setAuthSession: (
    user: {
      id?: string;
      name: string;
      email: string;
      username?: string;
      portId?: string;
      portCode?: string;
      portName?: string;
    },
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
          // Call real backend API based on role
          const credentials: LoginCredentials = {
            username_or_email: emailOrUser,
            password,
            role: role || undefined,
          };

          let response;
          if (role === 'operations') {
            response = await loginLogisticsManager(credentials);
          } else if (role === 'admin') {
            response = await loginAdmin(credentials);
          } else {
            response = await loginPortManager(credentials);
          }

          // Store token in localStorage for axios interceptor
          localStorage.setItem('token', response.access_token);
          localStorage.setItem('user', JSON.stringify(response.user));

          // For Port Managers the backend returns the port they registered with.
          const assigned = response.port ?? null;

          // Map backend response to frontend user structure
          set({
            role: (response.user.role === 'operations' || response.user.role === 'Logistics Manager') ? 'operations' : (response.user.role as UserRole),
            isAuthenticated: true,
            token: response.access_token,
            user: {
              id: response.user.id,
              name: response.user.full_name,
              email: response.user.email,
              username: response.user.username,
              portId: assigned?.id,
              portCode: assigned?.code,
              portName: assigned?.name ?? assignedPort,
            },
          });

          return true;
        } catch (error: any) {
          console.error('Backend Login error:', error);
          
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
              role: role || 'operations',
              isAuthenticated: true,
              token: demoToken,
              user: {
                name: userNameFormatted,
                email: emailOrUser.includes('@') ? emailOrUser : `${emailOrUser}@freightfirewall.com`,
                username: emailOrUser,
                portName: assignedPort || 'Port of Rotterdam',
                employeeId: `LM-${Math.floor(10000 + Math.random() * 90000)}`,
              },
            });
            return true;
          }
          
          return false;
        }
      },

      register: async (data) => {
        try {
          let response;
          if (data.role === 'operations') {
            const logisticsData: LogisticsManagerRegisterData = {
              email: data.email,
              password: data.password,
              full_name: data.name,
              username: data.username || data.email.split('@')[0],
              company_name: data.organization || 'Freight Firewall Global Logistics Ltd',
              employee_id: data.employeeId || `LM-${Math.floor(10000 + Math.random() * 90000)}`,
              department: data.department || 'Operations',
              region: 'Global',
            };
            response = await registerLogisticsManager(logisticsData);
          } else {
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
            response = await registerPortManager(apiData);
          }

          // Store token in localStorage
          localStorage.setItem('token', response.access_token);
          localStorage.setItem('user', JSON.stringify(response.user));

          const assigned = response.port ?? null;

          // Set authenticated state
          set({
            role: data.role,
            isAuthenticated: true,
            token: response.access_token,
            user: {
              id: response.user.id,
              name: response.user.full_name,
              email: response.user.email,
              username: response.user.username,
              employeeId: data.employeeId,
              mobileNumber: data.mobileNumber || '+1 (555) 019-2834',
              portId: assigned?.id,
              portCode: assigned?.code,
              portName: assigned?.name ?? data.portName ?? 'Port of Rotterdam',
              department: data.department || 'Operations Command',
            },
          });

          return true;
        } catch (error: any) {
          console.error('Backend Registration error:', error);
          
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
        localStorage.removeItem('user');
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