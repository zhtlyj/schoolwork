import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
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

// 获取达到预警条件的学生列表（按学生维度汇总）
export async function GET(request: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'grade' | 'attendance' | '' (全部)
    const gradeThreshold = parseFloat(searchParams.get('gradeThreshold') || '60')
    const attendanceThreshold = parseFloat(searchParams.get('attendanceThreshold') || '3')

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

    // 获取所有学生
    const students = await User.find({ role: 'student' }).select('_id name studentId')

    // 获取所有成绩和出勤数据
    const [allGrades, allAttendance] = await Promise.all([
      Grade.find({}).sort({ createdAt: -1 }),
      Attendance.find({}).sort({ createdAt: -1 }),
    ])

    // 按学生维度汇总预警项
    const candidateMap = new Map<string, {
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
      attendanceWarnings: Array<{
        course: string
        absentCount: number
        lastAbsentAt: string
        level: 'high' | 'medium' | 'low'
      }>
    }>()

    // 处理成绩预警
    if (!type || type === 'grade') {
      for (const grade of allGrades) {
        if (grade.score < gradeThreshold) {
          const studentId = grade.studentId.toString()
          if (!candidateMap.has(studentId)) {
            const student = students.find((s) => s._id.toString() === studentId)
            if (!student) continue
            candidateMap.set(studentId, {
              studentId,
              studentName: student.name,
              studentIdNumber: student.studentId || '',
              gradeWarnings: [],
              attendanceWarnings: [],
            })
          }
          const candidate = candidateMap.get(studentId)!
          candidate.gradeWarnings.push({
            course: grade.course,
            score: grade.score,
            examType: grade.examType,
            term: grade.term,
            level: 'high', // 成绩低于阈值 = 高危
          })
        }
      }
    }

    // 处理出勤预警
    if (!type || type === 'attendance') {
      for (const attendance of allAttendance) {
        if (attendance.absentCount > attendanceThreshold) {
          const studentId = attendance.studentId.toString()
          if (!candidateMap.has(studentId)) {
            const student = students.find((s) => s._id.toString() === studentId)
            if (!student) continue
            candidateMap.set(studentId, {
              studentId,
              studentName: student.name,
              studentIdNumber: student.studentId || '',
              gradeWarnings: [],
              attendanceWarnings: [],
            })
          }
          const candidate = candidateMap.get(studentId)!
          candidate.attendanceWarnings.push({
            course: attendance.course,
            absentCount: attendance.absentCount,
            lastAbsentAt: attendance.lastAbsentAt.toISOString(),
            level: 'medium', // 缺勤超过阈值 = 中危
          })
        }
      }
    }

    // 转换为数组，只返回有预警项的学生
    const candidates = Array.from(candidateMap.values()).filter(
      (c) => c.gradeWarnings.length > 0 || c.attendanceWarnings.length > 0
    )

    return NextResponse.json({
      candidates,
      total: candidates.length,
    })
  } catch (error) {
    console.error('获取预警候选学生列表错误:', error)
    return NextResponse.json(
      {
        message: '获取预警候选学生列表失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

