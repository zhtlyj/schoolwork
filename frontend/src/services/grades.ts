import api from './api'

export type ExamType = 'midterm' | 'final' | 'regular'

export interface Grade {
  _id: string
  studentId: string
  studentName: string
  course: string
  score: number
  credits?: number
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

  /** 获取所有不重复的课程名称（用于成绩预警下发时的课程下拉选择） */
  async getCourses(): Promise<{ courses: string[] }> {
    const response = await api.get<{ courses: string[] }>('/grades/courses')
    return response.data
  },

  /** 获取所有不重复的学期（用于学分预警下发时的学期下拉选择） */
  async getTerms(): Promise<{ terms: string[] }> {
    const response = await api.get<{ terms: string[] }>('/grades/terms')
    return response.data
  },
}


