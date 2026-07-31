// frontend/src/services/api.ts
import axios from 'axios';

// Use import.meta.env for Vite environment variables (not bare global names)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============= PORT MANAGER AUTHENTICATION =============

export interface PortManagerRegisterData {
  email: string;
  password: string;
  full_name: string;
  username: string;
  employee_id: string;
  mobile_number?: string;
  port_name: string;
  department?: string;
  security_pass_id?: string;
}

export interface LoginCredentials {
  username_or_email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
  };
}

export const registerPortManager = async (data: PortManagerRegisterData): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/port-manager/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    let msg = 'Registration failed';
    if (typeof error.detail === 'string') {
      msg = error.detail;
    } else if (Array.isArray(error.detail)) {
      msg = error.detail.map((d: { msg?: string; message?: string }) => d.msg || d.message).join(', ');
    }
    throw new Error(msg);
  }

  return response.json();
};

export const loginPortManager = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/port-manager/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    let msg = 'Login failed';
    if (typeof error.detail === 'string') {
      msg = error.detail;
    } else if (Array.isArray(error.detail)) {
      msg = error.detail.map((d: { msg?: string; message?: string }) => d.msg || d.message).join(', ');
    }
    throw new Error(msg);
  }

  return response.json();
};

export const loginAdmin = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    let msg = 'Admin Login failed';
    if (typeof error.detail === 'string') {
      msg = error.detail;
    } else if (Array.isArray(error.detail)) {
      msg = error.detail.map((d: { msg?: string; message?: string }) => d.msg || d.message).join(', ');
    }
    throw new Error(msg);
  }

  return response.json();
};

// ============= PORT OPERATIONS =============

export const getAllPorts = async (search?: string, congestionLevel?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (congestionLevel && congestionLevel !== 'all') params.append('congestion_level', congestionLevel);

  const response = await fetch(`${API_BASE_URL}/api/ports?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch ports');
  return response.json();
};

export const getPortDetail = async (portId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/ports/${portId}`);
  if (!response.ok) throw new Error('Failed to fetch port detail');
  return response.json();
};

export const flagPortDisruption = async (
  portId: string,
  disruption: {
    disruption_type: string;
    severity: string;
    title: string;
    description?: string;
  },
  token: string
) => {
  const response = await fetch(`${API_BASE_URL}/api/ports/${portId}/disruptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(disruption),
  });

  if (!response.ok) throw new Error('Failed to flag disruption');
  return response.json();
};

export const resolvePortDisruption = async (
  portId: string,
  disruptionId: string,
  token: string
) => {
  const response = await fetch(
    `${API_BASE_URL}/api/ports/${portId}/disruptions/${disruptionId}/resolve`,
    {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error('Failed to resolve disruption');
  return response.json();
};

export default api;