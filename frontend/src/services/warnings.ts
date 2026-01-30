import api from './api'

export type WarningType = 'grade' | 'attendance' | 'assignment'
export type WarningLevel = 'low' | 'medium' | 'high'

export interface Warning {
  _id: string
  studentId: string
  studentName: string
  type: WarningType
  level: WarningLevel
  course: string
  message: string
  createdBy: string
  createdByName: string
  blockHash?: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export interface WarningListResponse {
  warnings: Warning[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateWarningData {
  studentId: string
  type: WarningType
  level: WarningLevel
  course: string
  message: string
  blockHash?: string
}

export interface UpdateWarningData {
  type?: WarningType
  level?: WarningLevel
  course?: string
  message?: string
  blockHash?: string
  isRead?: boolean
}

export interface WarningCandidate {
  studentId: string
  studentName: string
  studentIdNumber: string
  gradeWarnings: Array<{
    course: string
    score: number
    examType: string
    term: string
    level: 'high' | 'medium' | 'low'
  }>
  attendanceWarnings: Array<{
    course: string
    absentCount: number
    lastAbsentAt: string
    level: 'high' | 'medium' | 'low'
  }>
}

export interface WarningCandidatesResponse {
  candidates: WarningCandidate[]
  total: number
}

export const warningService = {
  async getWarnings(params?: {
    studentId?: string
    type?: WarningType
    level?: WarningLevel
    page?: number
    limit?: number
  }): Promise<WarningListResponse> {
    const response = await api.get<WarningListResponse>('/warnings', { params })
    return response.data
  },

  async createWarning(data: CreateWarningData): Promise<{ message: string; warning: Warning }> {
    const response = await api.post<{ message: string; warning: Warning }>('/warnings', data)
    return response.data
  },

  async updateWarning(
    id: string,
    data: UpdateWarningData
  ): Promise<{ message: string; warning: Warning }> {
    const response = await api.put<{ message: string; warning: Warning }>(`/warnings/${id}`, data)
    return response.data
  },

  async deleteWarning(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/warnings/${id}`)
    return response.data
  },

  async getWarningCandidates(params?: {
    type?: 'grade' | 'attendance' | ''
    gradeThreshold?: number
    attendanceThreshold?: number
  }): Promise<WarningCandidatesResponse> {
    const response = await api.get<WarningCandidatesResponse>('/warnings/candidates', { params })
    return response.data
  },
}
