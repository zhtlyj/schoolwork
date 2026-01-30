import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Warning from '@/models/Warning'
import Intervention from '@/models/Intervention'
import User from '@/models/User'
import Grade from '@/models/Grade'
import Attendance from '@/models/Attendance'
import { verifyToken } from '@/lib/jwt'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// 获取统计数据
export async function GET(request: Request) {
  try {
    await connectDB()

    // 鉴权：仅 staff/admin 可访问
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可访问' }, { status: 403 })
    }

    // 获取所有数据
    const [warnings, interventions, students, grades, attendance] = await Promise.all([
      Warning.find({}),
      Intervention.find({}),
      User.find({ role: 'student' }),
      Grade.find({}),
      Attendance.find({}),
    ])

    // 预警统计
    const warningStats = {
      total: warnings.length,
      byType: {
        grade: warnings.filter((w) => w.type === 'grade').length,
        attendance: warnings.filter((w) => w.type === 'attendance').length,
        assignment: warnings.filter((w) => w.type === 'assignment').length,
      },
      byLevel: {
        high: warnings.filter((w) => w.level === 'high').length,
        medium: warnings.filter((w) => w.level === 'medium').length,
        low: warnings.filter((w) => w.level === 'low').length,
      },
      recent30Days: warnings.filter((w) => {
        const date = new Date(w.createdAt)
        const now = new Date()
        const diffTime = now.getTime() - date.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        return diffDays <= 30
      }).length,
    }

    // 干预统计
    const interventionStats = {
      total: interventions.length,
      byStatus: {
        pending: interventions.filter((i) => i.status === 'pending').length,
        'in-progress': interventions.filter((i) => i.status === 'in-progress').length,
        completed: interventions.filter((i) => i.status === 'completed').length,
        cancelled: interventions.filter((i) => i.status === 'cancelled').length,
      },
      byType: {} as Record<string, number>,
      recent30Days: interventions.filter((i) => {
        const date = new Date(i.createdAt)
        const now = new Date()
        const diffTime = now.getTime() - date.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        return diffDays <= 30
      }).length,
    }

    // 统计干预类型
    interventions.forEach((i) => {
      interventionStats.byType[i.type] = (interventionStats.byType[i.type] || 0) + 1
    })

    // 学生统计
    const studentStats = {
      total: students.length,
      withWarnings: new Set(warnings.map((w) => w.studentId)).size,
      withInterventions: new Set(interventions.map((i) => i.studentId)).size,
      withBoth: new Set(
        warnings
          .map((w) => w.studentId)
          .filter((id) => interventions.some((i) => i.studentId === id))
      ).size,
    }

    // 成绩统计
    const gradeStats = {
      total: grades.length,
      average: grades.length > 0 ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length : 0,
      below60: grades.filter((g) => g.score < 60).length,
      below60Percent:
        grades.length > 0 ? (grades.filter((g) => g.score < 60).length / grades.length) * 100 : 0,
    }

    // 出勤统计
    const attendanceStats = {
      total: attendance.length,
      totalAbsentCount: attendance.reduce((sum, a) => sum + a.absentCount, 0),
      averageAbsentCount:
        attendance.length > 0
          ? attendance.reduce((sum, a) => sum + a.absentCount, 0) / attendance.length
          : 0,
      overThreshold: attendance.filter((a) => a.absentCount > 3).length,
    }

    // 时间趋势（最近7天）
    const now = new Date()
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now)
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    const warningTrend = last7Days.map((date) => {
      return warnings.filter((w) => {
        const wDate = new Date(w.createdAt).toISOString().split('T')[0]
        return wDate === date
      }).length
    })

    const interventionTrend = last7Days.map((date) => {
      return interventions.filter((i) => {
        const iDate = new Date(i.createdAt).toISOString().split('T')[0]
        return iDate === date
      }).length
    })

    return NextResponse.json({
      warning: warningStats,
      intervention: interventionStats,
      student: studentStats,
      grade: gradeStats,
      attendance: attendanceStats,
      trends: {
        dates: last7Days,
        warnings: warningTrend,
        interventions: interventionTrend,
      },
    })
  } catch (error) {
    console.error('获取统计数据错误:', error)
    return NextResponse.json(
      {
        message: '获取统计数据失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

