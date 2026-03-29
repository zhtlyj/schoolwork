import api from './api'

export type WarningType = 'grade' | 'credit_semester' | 'credit_total'
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
  /** 成绩预警时：该课程最低分数（后端补充） */
  score?: number | null
  /** 成绩预警时：该课程考勤缺勤次数（后端补充） */
  absentCount?: number | null
  /** 学期时间（成绩预警从 Grade 取 term，学分预警为 course） */
  term?: string | null
  /** 学期学分预警时：该学期已获得学分（后端补充） */
  earnedCredits?: number | null
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
  creditWarnings: Array<{
    scope: 'semester' | 'total'
    term?: string
    earnedCredits: number
    threshold: number
    level: 'high' | 'medium' | 'low'
  }>
}

export interface WarningCandidatesResponse {
  candidates: WarningCandidate[]
  total: number
}

/** 预警管理列表行（候选 + 已下发状态） */
export interface ManagementListItem {
  studentId: string
  studentName: string
  type: WarningType
  level: WarningLevel
  course: string
  message: string
  score?: number | null
  absentCount?: number | null
  term?: string | null
  earnedCredits?: number | null
  /** 已下发的预警 ID，有则显示取消预警 */
  issuedWarningId?: string | null
  /** 链上存证交易哈希 */
  blockHash?: string | null
}

export interface ManagementListResponse {
  items: ManagementListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const warningService = {
  async getWarningById(id: string): Promise<{ warning: Warning }> {
    const response = await api.get<{ warning: Warning }>(`/warnings/${id}`)
    return response.data
  },

  async getWarnings(params?: {
    studentId?: string
    type?: WarningType
    level?: WarningLevel
    course?: string
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

  async deleteWarning(id: string, reason: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/warnings/${id}`, {
      data: { reason },
    })
    return response.data
  },

  async getWarningCandidates(params?: {
    type?: 'grade' | 'credit_semester' | 'credit_total' | ''
    gradeHigh?: number
    gradeMedium?: number
    gradeLow?: number
    semesterHigh?: number
    semesterMedium?: number
    semesterLow?: number
    totalHigh?: number
    totalMedium?: number
    totalLow?: number
  }): Promise<WarningCandidatesResponse> {
    const response = await api.get<WarningCandidatesResponse>('/warnings/candidates', { params })
    return response.data
  },

  async getManagementList(params?: {
    type?: 'grade' | 'credit_semester' | 'credit_total' | ''
    level?: WarningLevel
    course?: string
    studentId?: string
    page?: number
    limit?: number
    gradeHigh?: number
    gradeMedium?: number
    gradeLow?: number
    semesterHigh?: number
    semesterMedium?: number
    semesterLow?: number
    totalHigh?: number
    totalMedium?: number
    totalLow?: number
  }): Promise<ManagementListResponse> {
    const response = await api.get<ManagementListResponse>('/warnings/management-list', { params })
    return response.data
  },
}
