import api from './api'

export interface Statistics {
  warning: {
    total: number
    byType: {
      grade: number
      attendance: number
      assignment: number
    }
    byLevel: {
      high: number
      medium: number
      low: number
    }
    recent30Days: number
  }
  intervention: {
    total: number
    byStatus: {
      pending: number
      'in-progress': number
      completed: number
      cancelled: number
    }
    byType: Record<string, number>
    recent30Days: number
  }
  student: {
    total: number
    withWarnings: number
    withInterventions: number
    withBoth: number
  }
  grade: {
    total: number
    average: number
    below60: number
    below60Percent: number
  }
  attendance: {
    total: number
    totalAbsentCount: number
    averageAbsentCount: number
    overThreshold: number
  }
  trends: {
    dates: string[]
    warnings: number[]
    interventions: number[]
  }
}

export const statisticsService = {
  async getStatistics(): Promise<Statistics> {
    const response = await api.get<Statistics>('/statistics')
    return response.data
  },
}

