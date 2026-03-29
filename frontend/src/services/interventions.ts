import api from './api'

/** API 返回的规范状态（历史 pending 等会在后端序列化为下列值） */
export type InterventionStatus =
  | 'student_pending'
  | 'pending_review'
  | 'completed'
  | 'revoked'

export interface Intervention {
  _id: string
  studentId: string
  studentName: string
  warningId?: string
  type: string
  status: InterventionStatus | string
  description: string
  plan?: string
  startDate?: string
  endDate?: string
  duration?: number
  createdBy: string
  createdByName: string
  assignedTo?: string
  assignedToName?: string
  notes?: string
  submittedAt?: string
  reviewResult?: 'pass' | 'fail'
  reviewOpinion?: string
  reviewedAt?: string
  revokedAt?: string
  revokeReason?: string
  result?: string
  blockHash?: string
  createdAt: string
  updatedAt: string
}

export interface InterventionListResponse {
  interventions: Intervention[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateInterventionData {
  studentId: string
  warningId?: string
  type: string
  description: string
  plan?: string
  startDate?: string
  endDate?: string
  duration?: number
  assignedTo?: string
  notes?: string
  blockHash?: string
}

export interface UpdateInterventionData {
  type?: string
  description?: string
  plan?: string
  startDate?: string
  endDate?: string
  duration?: number
  assignedTo?: string
  notes?: string
  result?: string
  blockHash?: string
  submitForReview?: boolean
  review?: { result: 'pass' | 'fail'; opinion?: string }
  revoke?: { reason: string }
}

/** 与后端 canonical 一致，兼容旧数据 */
export function canonicalInterventionStatusClient(status: string): string {
  const map: Record<string, string> = {
    pending: 'student_pending',
    'in-progress': 'pending_review',
    cancelled: 'revoked',
  }
  return map[status] || status
}

export function interventionStatusLabel(status: string): string {
  const s = canonicalInterventionStatusClient(status)
  switch (s) {
    case 'student_pending':
      return '待学生处理'
    case 'pending_review':
      return '待审核'
    case 'completed':
      return '已完成'
    case 'revoked':
      return '已撤销'
    default:
      return status
  }
}

export const interventionService = {
  async getInterventions(params?: {
    studentId?: string
    status?: string
    type?: string
    page?: number
    limit?: number
  }): Promise<InterventionListResponse> {
    const response = await api.get<InterventionListResponse>('/interventions', { params })
    return response.data
  },

  async getIntervention(id: string): Promise<{ intervention: Intervention }> {
    const response = await api.get<{ intervention: Intervention }>(`/interventions/${id}`)
    return response.data
  },

  async createIntervention(data: CreateInterventionData): Promise<{ message: string; intervention: Intervention }> {
    const response = await api.post<{ message: string; intervention: Intervention }>('/interventions', data)
    return response.data
  },

  async updateIntervention(
    id: string,
    data: UpdateInterventionData
  ): Promise<{ message: string; intervention: Intervention }> {
    const response = await api.put<{ message: string; intervention: Intervention }>(`/interventions/${id}`, data)
    return response.data
  },

  async deleteIntervention(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/interventions/${id}`)
    return response.data
  },
}
