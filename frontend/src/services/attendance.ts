import api from './api'

export interface AttendanceRecord {
  _id: string
  studentId: string
  studentName: string
  course: string
  absentCount: number
  lastAbsentAt: string
  createdAt: string
  updatedAt: string
}

export interface AttendanceListResponse {
  records: AttendanceRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const attendanceService = {
  async getAttendance(params?: {
    studentId?: string
    course?: string
    page?: number
    limit?: number
  }): Promise<AttendanceListResponse> {
    const response = await api.get<AttendanceListResponse>('/attendance', { params })
    return response.data
  },
}


