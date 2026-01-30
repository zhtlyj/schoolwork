import api from './api'

export interface Student {
  id: string
  username: string
  email: string
  studentId: string
  name: string
  role: 'student'
  createdAt: string
}

export interface StudentListResponse {
  students: Student[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateStudentData {
  username: string
  email: string
  password: string
  studentId: string
  name: string
}

export interface UpdateStudentData {
  username?: string
  email?: string
  password?: string
  studentId?: string
  name?: string
}

export const studentService = {
  // 获取学生列表
  async getStudents(params?: {
    search?: string
    page?: number
    limit?: number
  }): Promise<StudentListResponse> {
    const response = await api.get<StudentListResponse>('/students', { params })
    return response.data
  },

  // 获取单个学生信息
  async getStudent(id: string): Promise<{ student: Student }> {
    const response = await api.get<{ student: Student }>(`/students/${id}`)
    return response.data
  },

  // 添加学生
  async createStudent(data: CreateStudentData): Promise<{ message: string; student: Student }> {
    const response = await api.post<{ message: string; student: Student }>('/students', data)
    return response.data
  },

  // 更新学生信息
  async updateStudent(
    id: string,
    data: UpdateStudentData
  ): Promise<{ message: string; student: Student }> {
    const response = await api.put<{ message: string; student: Student }>(`/students/${id}`, data)
    return response.data
  },

  // 删除学生
  async deleteStudent(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/students/${id}`)
    return response.data
  },
}

