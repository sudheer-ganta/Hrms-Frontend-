/** Must equal the backend USER_ROLES (checked by the cross-repo contract test). */
export type UserRole = 'SUPER_ADMIN' | 'FOUNDER' | 'HR' | 'EMPLOYEE';

/** Canonical user as returned by login, /auth/me and user management. */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  empCode?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
  role: 'SUPER_ADMIN' | 'FOUNDER' | 'HR' | 'EMPLOYEE';
  empCode?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  isFounder: boolean;
  isHr: boolean;
  isEmployee: boolean;
}
