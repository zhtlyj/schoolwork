import api from './api'

export interface Statistics {
  warning: {
    total: number
    byType: {
      grade: number
      credit_semester: number
      credit_total: number
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
      student_pending: number
      pending_review: number
      completed: number
      revoked: number
    }
    byType: Record<string, number>
    recent30Days: number
  }
  student: {
    total: number
    withWarnings: number
    withInterventions: number
    withBoth: number
    withoutWarnings: number
  }
  grade: {
    total: number
    average: number
    below60: number
    below60Percent: number
    above60: number
    passRate: number
    courseCount: number
    termCount: number
    /** 按课程聚合：条数、平均分、不及格数、及格率 */
    byCourse: Array<{
      course: string
      recordCount: number
      average: number
      below60: number
      passRate: number
    }>
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

