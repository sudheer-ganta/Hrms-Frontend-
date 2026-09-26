export type UserRole = 'SUPER_ADMIN' | 'FOUNDER' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  empCode?: string;
  status: 'active' | 'inactive';
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: boolean;
  isFounder: boolean;
  isEmployee: boolean;
}
