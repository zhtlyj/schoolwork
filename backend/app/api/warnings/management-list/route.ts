import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Grade from '@/models/Grade'
import Attendance from '@/models/Attendance'
import Warning from '@/models/Warning'
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

type FlatRow = {
  studentId: string
  studentName: string
  type: 'grade' | 'credit_semester' | 'credit_total'
  level: 'high' | 'medium' | 'low'
  course: string
  message: string
  score?: number | null
  absentCount?: number | null
  term?: string | null
  earnedCredits?: number | null
  /** 已下发的预警 ID，有则显示取消预警 */
  issuedWarningId?: string | null
}

// 获取预警管理列表：候选（系统判定）+ 已下发状态
export async function GET(request: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const level = searchParams.get('level') || ''
    const course = searchParams.get('course') || ''
    const studentId = searchParams.get('studentId') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const gradeHigh = parseFloat(searchParams.get('gradeHigh') || '50')
    const gradeMedium = parseFloat(searchParams.get('gradeMedium') || '60')
    const gradeLow = parseFloat(searchParams.get('gradeLow') || '70')
    const semesterHigh = parseFloat(searchParams.get('semesterHigh') || '5')
    const semesterMedium = parseFloat(searchParams.get('semesterMedium') || '10')
    const semesterLow = parseFloat(searchParams.get('semesterLow') || '15')
    const totalHigh = parseFloat(searchParams.get('totalHigh') || '10')
    const totalMedium = parseFloat(searchParams.get('totalMedium') || '20')
    const totalLow = parseFloat(searchParams.get('totalLow') || '30')

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可访问' }, { status: 403 })
    }

    const students = await User.find({ role: 'student' }).select('_id name studentId')
    const allGrades = await Grade.find({}).sort({ createdAt: -1 })

    const candidateMap = new Map<string, {
      studentId: string
      studentName: string
      studentIdNumber: string
      gradeWarnings: Array<{ course: string; score: number; examType: string; term: string; level: 'high' | 'medium' | 'low' }>
      creditWarnings: Array<{ scope: 'semester' | 'total'; term?: string; earnedCredits: number; threshold: number; level: 'high' | 'medium' | 'low' }>
    }>()

    if (!type || type === 'grade') {
      for (const grade of allGrades) {
        const score = grade.score
        if (score >= gradeLow) continue
        const level: 'high' | 'medium' | 'low' = score < gradeHigh ? 'high' : score < gradeMedium ? 'medium' : 'low'
        const sid = grade.studentId.toString()
        if (!candidateMap.has(sid)) {
          const student = students.find((s) => s._id.toString() === sid)
          if (!student) continue
          candidateMap.set(sid, {
            studentId: sid,
            studentName: student.name,
            studentIdNumber: student.studentId || '',
            gradeWarnings: [],
            creditWarnings: [],
          })
        }
        candidateMap.get(sid)!.gradeWarnings.push({
          course: grade.course,
          score: grade.score,
          examType: grade.examType,
          term: grade.term,
          level,
        })
      }
    }

    if (!type || type === 'credit_semester' || type === 'credit_total') {
      const creditByStudent = new Map<string, { termCredits: Map<string, number>; totalCredits: number }>()
      for (const student of students) {
        creditByStudent.set(student._id.toString(), { termCredits: new Map(), totalCredits: 0 })
      }
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
      for (const [, { score, credits, studentId: sid, term }] of bestScoreByCourse) {
        if (score < 60) continue
        const sc = creditByStudent.get(sid)
        if (!sc) continue
        const termCredits = (sc.termCredits.get(term) || 0) + credits
        sc.termCredits.set(term, termCredits)
        sc.totalCredits += credits
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

    const candidates = Array.from(candidateMap.values()).filter(
      (c) => c.gradeWarnings.length > 0 || c.creditWarnings.length > 0
    )

    // 扁平化为行
    const flatRows: FlatRow[] = []
    for (const c of candidates) {
      if (studentId && c.studentId !== studentId) continue

      if (!type || type === 'grade') {
        for (const gw of c.gradeWarnings) {
          if (level && gw.level !== level) continue
          if (course && gw.course !== course) continue
          const examTypeText = gw.examType === 'final' ? '期末' : gw.examType === 'midterm' ? '期中' : '平时'
          flatRows.push({
            studentId: c.studentId,
            studentName: c.studentName,
            type: 'grade',
            level: gw.level,
            course: gw.course,
            message: `课程【${gw.course}】${gw.term}${examTypeText}考试成绩为 ${gw.score} 分，低于预警阈值。`,
            score: gw.score,
            term: gw.term,
          })
        }
      }
      if (!type || type === 'credit_semester') {
        const semesterCredits = c.creditWarnings.filter((w) => w.scope === 'semester')
        for (const cw of semesterCredits) {
          if (level && cw.level !== level) continue
          if (course && cw.term !== course) continue
          flatRows.push({
            studentId: c.studentId,
            studentName: c.studentName,
            type: 'credit_semester',
            level: cw.level,
            course: cw.term || '',
            message: `学期学分（${cw.term}）获得 ${cw.earnedCredits} 学分，低于预警阈值 ${cw.threshold} 学分。`,
            earnedCredits: cw.earnedCredits,
            term: cw.term ?? undefined,
          })
        }
      }
      if (!type || type === 'credit_total') {
        const totalCredits = c.creditWarnings.filter((w) => w.scope === 'total')
        for (const cw of totalCredits) {
          if (level && cw.level !== level) continue
          flatRows.push({
            studentId: c.studentId,
            studentName: c.studentName,
            type: 'credit_total',
            level: cw.level,
            course: '总学分',
            message: `总学分获得 ${cw.earnedCredits} 学分，低于预警阈值 ${cw.threshold} 学分。`,
            earnedCredits: cw.earnedCredits,
          })
        }
      }
    }

    // 获取已下发的预警
    const studentIds = [...new Set(flatRows.map((r) => r.studentId))]
    const issuedWarnings = await Warning.find({
      studentId: { $in: studentIds },
    }).lean()

    const issuedMap = new Map<string, { _id: string; [k: string]: any }>()
    for (const w of issuedWarnings as any[]) {
      const key =
        w.type === 'grade'
          ? `${w.studentId}::grade::${w.course}`
          : w.type === 'credit_semester'
          ? `${w.studentId}::credit_semester::${w.course}`
          : `${w.studentId}::credit_total::总学分`
      issuedMap.set(key, w)
    }

    // 补充分数、考勤、学分
    const gradeRows = flatRows.filter((r) => r.type === 'grade')
    const gradeMap = new Map<string, { score: number; term: string }>()
    const attendanceMap = new Map<string, number>()
    if (gradeRows.length > 0) {
      const grades = await Grade.find({
        studentId: { $in: [...new Set(gradeRows.map((r) => r.studentId))] },
        course: { $in: [...new Set(gradeRows.map((r) => r.course))] },
      }).lean()
      for (const g of grades as any[]) {
        const key = `${g.studentId}::${g.course}`
        const existing = gradeMap.get(key)
        if (!existing || g.score < existing.score) gradeMap.set(key, { score: g.score, term: g.term })
      }
      const attendances = await Attendance.find({
        studentId: { $in: [...new Set(gradeRows.map((r) => r.studentId))] },
        course: { $in: [...new Set(gradeRows.map((r) => r.course))] },
      }).lean()
      for (const a of attendances as any[]) {
        attendanceMap.set(`${a.studentId}::${a.course}`, a.absentCount)
      }
    }

    const creditSemesterRows = flatRows.filter((r) => r.type === 'credit_semester')
    const semesterEarnedMap = new Map<string, number>()
    if (creditSemesterRows.length > 0) {
      const allGrades = await Grade.find({
        studentId: { $in: [...new Set(creditSemesterRows.map((r) => r.studentId))] },
      }).lean()
      const bestByKey = new Map<string, { score: number; credits: number }>()
      for (const g of allGrades as any[]) {
        const key = `${g.studentId}::${g.course}::${g.term}`
        const credits = g.credits ?? 2
        const existing = bestByKey.get(key)
        if (!existing || g.score > existing.score) bestByKey.set(key, { score: g.score, credits })
      }
      const termCreditsByStudent = new Map<string, number>()
      for (const [key, { score, credits }] of bestByKey) {
        if (score < 60) continue
        const [sid, , term] = key.split('::')
        const mapKey = `${sid}::${term}`
        termCreditsByStudent.set(mapKey, (termCreditsByStudent.get(mapKey) || 0) + credits)
      }
      for (const r of creditSemesterRows) {
        semesterEarnedMap.set(`${r.studentId}::${r.course}`, termCreditsByStudent.get(`${r.studentId}::${r.course}`) ?? 0)
      }
    }

    const creditTotalRows = flatRows.filter((r) => r.type === 'credit_total')
    const totalEarnedMap = new Map<string, number>()
    if (creditTotalRows.length > 0) {
      const allGrades = await Grade.find({
        studentId: { $in: [...new Set(creditTotalRows.map((r) => r.studentId))] },
      }).lean()
      const bestByKey = new Map<string, { score: number; credits: number }>()
      for (const g of allGrades as any[]) {
        const key = `${g.studentId}::${g.course}::${g.term}`
        const credits = g.credits ?? 2
        const existing = bestByKey.get(key)
        if (!existing || g.score > existing.score) bestByKey.set(key, { score: g.score, credits })
      }
      const totalByStudent = new Map<string, number>()
      for (const [key, { score, credits }] of bestByKey) {
        if (score < 60) continue
        const [sid] = key.split('::')
        totalByStudent.set(sid, (totalByStudent.get(sid) || 0) + credits)
      }
      for (const r of creditTotalRows) {
        totalEarnedMap.set(r.studentId, totalByStudent.get(r.studentId) ?? 0)
      }
    }

    const items: FlatRow[] = flatRows.map((r) => {
      const key =
        r.type === 'grade'
          ? `${r.studentId}::grade::${r.course}`
          : r.type === 'credit_semester'
          ? `${r.studentId}::credit_semester::${r.course}`
          : `${r.studentId}::credit_total::总学分`
      const issued = issuedMap.get(key)
      const out: FlatRow = { ...r, issuedWarningId: issued?._id ?? null }
      if (r.type === 'grade') {
        const g = gradeMap.get(`${r.studentId}::${r.course}`)
        const a = attendanceMap.get(`${r.studentId}::${r.course}`)
        out.score = g?.score ?? r.score
        out.absentCount = a ?? null
        out.term = g?.term ?? r.term
      } else if (r.type === 'credit_semester') {
        out.earnedCredits = semesterEarnedMap.get(`${r.studentId}::${r.course}`) ?? r.earnedCredits
      } else if (r.type === 'credit_total') {
        out.earnedCredits = totalEarnedMap.get(r.studentId) ?? r.earnedCredits
      }
      return out
    })

    const total = items.length
    const skip = (page - 1) * limit
    const paginated = items.slice(skip, skip + limit)

    return NextResponse.json({
      items: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取预警管理列表错误:', error)
    return NextResponse.json(
      {
        message: '获取预警管理列表失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
