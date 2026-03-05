import api from './api'

export interface OperationLog {
  _id: string
  operatorId: string
  operatorName: string
  action: string
  targetType: string
  targetId?: string
  details: string
  createdAt: string
}

export interface OperationLogsResponse {
  logs: OperationLog[]
}

export const operationLogService = {
  async getLogs(params?: { limit?: number }): Promise<OperationLogsResponse> {
    const response = await api.get<OperationLogsResponse>('/operation-logs', { params })
    return response.data
  },
}
