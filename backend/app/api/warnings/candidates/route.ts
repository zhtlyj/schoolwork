import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Grade from '@/models/Grade'
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
    const type = searchParams.get('type') // 'grade' | 'credit_semester' | 'credit_total' | '' (全部)
    const gradeHigh = parseFloat(searchParams.get('gradeHigh') || '50')
    const gradeMedium = parseFloat(searchParams.get('gradeMedium') || '60')
    const gradeLow = parseFloat(searchParams.get('gradeLow') || '70')
    const semesterHigh = parseFloat(searchParams.get('semesterHigh') || '5')
    const semesterMedium = parseFloat(searchParams.get('semesterMedium') || '10')
    const semesterLow = parseFloat(searchParams.get('semesterLow') || '15')
    const totalHigh = parseFloat(searchParams.get('totalHigh') || '10')
    const totalMedium = parseFloat(searchParams.get('totalMedium') || '20')
    const totalLow = parseFloat(searchParams.get('totalLow') || '30')

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

    const allGrades = await Grade.find({}).sort({ createdAt: -1 })

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
      creditWarnings: Array<{
        scope: 'semester' | 'total'
        term?: string
        earnedCredits: number
        threshold: number
        level: 'high' | 'medium' | 'low'
      }>
    }>()

    // 处理成绩预警：score < gradeHigh 高危，gradeHigh<=score<gradeMedium 中危，gradeMedium<=score<gradeLow 低危
    if (!type || type === 'grade') {
      for (const grade of allGrades) {
        const score = grade.score
        if (score >= gradeLow) continue
        const level: 'high' | 'medium' | 'low' = score < gradeHigh ? 'high' : score < gradeMedium ? 'medium' : 'low'
        const studentId = grade.studentId.toString()
        if (!candidateMap.has(studentId)) {
          const student = students.find((s) => s._id.toString() === studentId)
          if (!student) continue
          candidateMap.set(studentId, {
            studentId,
            studentName: student.name,
            studentIdNumber: student.studentId || '',
            gradeWarnings: [],
            creditWarnings: [],
          })
        }
        const candidate = candidateMap.get(studentId)!
        candidate.gradeWarnings.push({
          course: grade.course,
          score: grade.score,
          examType: grade.examType,
          term: grade.term,
          level,
        })
      }
    }

    // 处理学分预警：按 (studentId, course, term) 取最高分，及格(>=60)则获得学分
    if (!type || type === 'credit_semester' || type === 'credit_total') {
      const creditByStudent = new Map<string, { termCredits: Map<string, number>; totalCredits: number }>()
      for (const student of students) {
        creditByStudent.set(student._id.toString(), {
          termCredits: new Map(),
          totalCredits: 0,
        })
      }
      // 按 (studentId, course, term) 分组，取最高分
      const bestScoreByCourse = new Map<string, { score: number; credits: number; studentId: string; term: string }>()
      for (const grade of allGrades) {
        const key = `${grade.studentId}::${grade.course}::${grade.term}`
        const credits = grade.credits ?? 2
        const existing = bestScoreByCourse.get(key)
        if (!existing || grade.score > existing.score) {
          bestScoreByCourse.set(key, {
            score: grade.score,
            credits,
            studentId: grade.studentId.toString(),
            term: grade.term,
          })
        }
      }
      for (const [, { score, credits, studentId, term }] of bestScoreByCourse) {
        if (score < 60) continue
        const studentCredit = creditByStudent.get(studentId)
        if (!studentCredit) continue
        const termCredits = (studentCredit.termCredits.get(term) || 0) + credits
        studentCredit.termCredits.set(term, termCredits)
        studentCredit.totalCredits += credits
      }
      for (const student of students) {
        const sid = student._id.toString()
        const data = creditByStudent.get(sid)
        if (!data) continue
        for (const [term, earned] of data.termCredits) {
          if (earned < semesterLow && (!type || type === 'credit_semester')) {
            const level: 'high' | 'medium' | 'low' = earned < semesterHigh ? 'high' : earned < semesterMedium ? 'medium' : 'low'
            const threshold = level === 'high' ? semesterHigh : level === 'medium' ? semesterMedium : semesterLow
            if (!candidateMap.has(sid)) {
              candidateMap.set(sid, {
                studentId: sid,
                studentName: student.name,
                studentIdNumber: student.studentId || '',
                gradeWarnings: [],
                creditWarnings: [],
              })
            }
            candidateMap.get(sid)!.creditWarnings.push({
              scope: 'semester',
              term,
              earnedCredits: earned,
              threshold,
              level,
            })
          }
        }
        if (data.totalCredits < totalLow && (!type || type === 'credit_total')) {
          const level: 'high' | 'medium' | 'low' = data.totalCredits < totalHigh ? 'high' : data.totalCredits < totalMedium ? 'medium' : 'low'
          const threshold = level === 'high' ? totalHigh : level === 'medium' ? totalMedium : totalLow
          if (!candidateMap.has(sid)) {
            candidateMap.set(sid, {
              studentId: sid,
              studentName: student.name,
              studentIdNumber: student.studentId || '',
              gradeWarnings: [],
              creditWarnings: [],
            })
          }
          candidateMap.get(sid)!.creditWarnings.push({
            scope: 'total',
            earnedCredits: data.totalCredits,
            threshold,
            level,
          })
        }
      }
    }

    // 转换为数组，只返回有预警项的学生
    const candidates = Array.from(candidateMap.values()).filter(
      (c) => c.gradeWarnings.length > 0 || c.creditWarnings.length > 0
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

