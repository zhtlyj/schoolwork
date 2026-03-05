import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Warning from '@/models/Warning'
import User from '@/models/User'
import Grade from '@/models/Grade'
import Attendance from '@/models/Attendance'
import OperationLog from '@/models/OperationLog'
import { verifyToken } from '@/lib/jwt'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// 获取预警列表
export async function GET(request: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const type = searchParams.get('type')
    const level = searchParams.get('level')
    const course = searchParams.get('course') // 课程/学期，成绩预警按课程、学分预警按学期
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // 鉴权：学生只能看自己的；教职工/管理员可看全部或按 studentId 筛选
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)

    // 构建查询条件
    const query: any = {}

    if (decoded.role === 'student') {
      // 学生端：强制只能查自己的预警（studentId 存的是用户 _id 字符串）
      query.studentId = decoded.userId
    } else {
      // 管理端：可按 studentId 筛选
      if (studentId) query.studentId = studentId
    }

    if (type) {
      query.type = type
    }

    if (level) {
      query.level = level
    }

    if (course) {
      query.course = course
    }

    // 计算跳过的记录数
    const skip = (page - 1) * limit

    // 查询预警列表
    const warningsRaw = await Warning.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // 成绩预警：补充分数、考勤次数（从 Grade、Attendance 查询）
    const gradeWarnings = warningsRaw.filter((w: any) => w.type === 'grade')
    const creditSemesterWarnings = warningsRaw.filter((w: any) => w.type === 'credit_semester')
    const creditTotalWarnings = warningsRaw.filter((w: any) => w.type === 'credit_total')
    const gradeMap = new Map<string, { score: number; term: string }>()
    const attendanceMap = new Map<string, number>()
    const semesterEarnedCreditsMap = new Map<string, number>()
    const totalEarnedCreditsMap = new Map<string, number>()
    if (gradeWarnings.length > 0) {
      const grades = await Grade.find({
        studentId: { $in: [...new Set(gradeWarnings.map((w: any) => w.studentId))] },
        course: { $in: [...new Set(gradeWarnings.map((w: any) => w.course))] },
      }).lean()
      for (const g of grades as any[]) {
        const key = `${g.studentId}::${g.course}`
        const existing = gradeMap.get(key)
        if (!existing || g.score < existing.score) gradeMap.set(key, { score: g.score, term: g.term })
      }
      const attendances = await Attendance.find({
        studentId: { $in: [...new Set(gradeWarnings.map((w: any) => w.studentId))] },
        course: { $in: [...new Set(gradeWarnings.map((w: any) => w.course))] },
      }).lean()
      for (const a of attendances as any[]) {
        attendanceMap.set(`${a.studentId}::${a.course}`, a.absentCount)
      }
    }
    if (creditSemesterWarnings.length > 0) {
      const allGrades = await Grade.find({
        studentId: { $in: [...new Set(creditSemesterWarnings.map((w: any) => w.studentId))] },
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
      for (const w of creditSemesterWarnings) {
        const mapKey = `${w.studentId}::${w.course}`
        semesterEarnedCreditsMap.set(mapKey, termCreditsByStudent.get(mapKey) ?? 0)
      }
    }
    if (creditTotalWarnings.length > 0) {
      const allGrades = await Grade.find({
        studentId: { $in: [...new Set(creditTotalWarnings.map((w: any) => w.studentId))] },
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
      for (const w of creditTotalWarnings) {
        totalEarnedCreditsMap.set(w.studentId, totalByStudent.get(w.studentId) ?? 0)
      }
    }
    const warnings = warningsRaw.map((w: any) => {
      const out = { ...w }
      if (w.type === 'grade') {
        const key = `${w.studentId}::${w.course}`
        const g = gradeMap.get(key)
        const a = attendanceMap.get(key)
        out.score = g?.score ?? null
        out.absentCount = a ?? null
        out.term = g?.term ?? null
      } else if (w.type === 'credit_semester') {
        out.term = w.course
        out.earnedCredits = semesterEarnedCreditsMap.get(`${w.studentId}::${w.course}`) ?? null
      } else if (w.type === 'credit_total') {
        out.term = w.course
        out.earnedCredits = totalEarnedCreditsMap.get(w.studentId) ?? null
      } else {
        out.term = w.course
      }
      return out
    })

    // 获取总数
    const total = await Warning.countDocuments(query)

    return NextResponse.json({
      warnings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取预警列表错误:', error)
    return NextResponse.json(
      {
        message: '获取预警列表失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 创建预警
export async function POST(request: Request) {
  try {
    await connectDB()

    const body = await request.json()
    const { studentId, type, level, course, message, blockHash } = body

    // 鉴权：仅 staff/admin 可下预警（createdBy 从 token 获取）
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可创建预警' }, { status: 403 })
    }

    // 验证必填字段
    if (!studentId || !type || !level || !course || !message) {
      return NextResponse.json(
        { message: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证学生是否存在
    const student = await User.findOne({ _id: studentId, role: 'student' })
    if (!student) {
      return NextResponse.json({ message: '学生不存在' }, { status: 404 })
    }

    // 获取创建者信息
    const creator = await User.findById(decoded.userId)
    if (!creator) {
      return NextResponse.json({ message: '创建者不存在' }, { status: 404 })
    }
    if (creator.role !== 'staff' && creator.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可创建预警' }, { status: 403 })
    }

    // 创建预警
    const warning = await Warning.create({
      studentId: student._id.toString(),
      studentName: student.name,
      type,
      level,
      course,
      message,
      createdBy: creator._id.toString(),
      createdByName: creator.name,
      blockHash,
    })

    const typeText = type === 'grade' ? '成绩' : type === 'credit_semester' ? '学期学分' : '总学分'
    await OperationLog.create({
      operatorId: creator._id.toString(),
      operatorName: creator.name,
      action: 'create',
      targetType: 'warning',
      targetId: warning._id.toString(),
      details: `${creator.name}对${student.name}下发${typeText}预警`,
    })

    return NextResponse.json(
      {
        message: '创建预警成功',
        warning,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建预警错误:', error)
    return NextResponse.json(
      {
        message: '创建预警失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

