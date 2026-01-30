import api from './api'

export interface User {
  id: string
  username: string
  email: string
  role: 'student' | 'staff' | 'admin'
  studentId?: string
  staffId?: string
  name: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  role: 'student' | 'staff' | 'admin'
  studentId?: string
  staffId?: string
  name: string
}

export interface LoginData {
  username: string
  password: string
}

export interface AuthResponse {
  message: string
  token: string
  user: User
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data)
    return response.data
  },
}

