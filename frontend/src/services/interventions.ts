import api from './api'

export type InterventionStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled'

export interface Intervention {
  _id: string
  studentId: string
  studentName: string
  warningId?: string
  type: string
  status: InterventionStatus
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
  status?: InterventionStatus
  description?: string
  plan?: string
  startDate?: string
  endDate?: string
  duration?: number
  assignedTo?: string
  notes?: string
  result?: string
  blockHash?: string
}

export const interventionService = {
  async getInterventions(params?: {
    studentId?: string
    status?: InterventionStatus
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

