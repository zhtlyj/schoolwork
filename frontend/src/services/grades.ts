import api from './api'

export type ExamType = 'midterm' | 'final' | 'regular'

export interface Grade {
  _id: string
  studentId: string
  studentName: string
  course: string
  score: number
  examType: ExamType
  term: string
  createdAt: string
  updatedAt: string
}

export interface GradeListResponse {
  grades: Grade[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const gradeService = {
  async getGrades(params?: {
    studentId?: string
    term?: string
    course?: string
    examType?: ExamType
    page?: number
    limit?: number
  }): Promise<GradeListResponse> {
    const response = await api.get<GradeListResponse>('/grades', { params })
    return response.data
  },
}


