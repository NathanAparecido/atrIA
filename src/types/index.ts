export type Department =
  | 'n2'
  | 'noc'
  | 'financeiro'
  | 'tecnico_campo'
  | 'infra'
  | 'n3'
  | 'comercial'
  | 'gerencia'
  | 'diretoria';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  first_name: string;
  phone: string | null;
  department: Department;
  created_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  phone?: string;
  department: Department;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  session_id: string;
  message: string;
  response: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}
