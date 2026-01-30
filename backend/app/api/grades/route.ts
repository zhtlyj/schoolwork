import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Grade from '@/models/Grade'
import User from '@/models/User'
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

// 获取成绩列表
export async function GET(request: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const term = searchParams.get('term')
    const course = searchParams.get('course')
    const examType = searchParams.get('examType')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)

    const query: any = {}

    if (decoded.role === 'student') {
      // 学生只能查看自己的成绩
      query.studentId = decoded.userId
    } else {
      if (studentId) query.studentId = studentId
    }

    if (term) query.term = term
    if (course) query.course = course
    if (examType) query.examType = examType

    const skip = (page - 1) * limit

    const grades = await Grade.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Grade.countDocuments(query)

    return NextResponse.json({
      grades,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取成绩列表错误:', error)
    return NextResponse.json(
      {
        message: '获取成绩列表失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 添加成绩记录（仅教职工/管理员）
export async function POST(request: Request) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json(
        { message: '无权限：仅教职工/管理员可添加成绩' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { studentId, course, score, examType, term } = body

    if (!studentId || !course || typeof score !== 'number' || !examType || !term) {
      return NextResponse.json(
        { message: '请填写学生、课程、成绩、考试类型、学期等必填字段' },
        { status: 400 }
      )
    }

    const student = await User.findOne({ _id: studentId, role: 'student' })
    if (!student) {
      return NextResponse.json({ message: '学生不存在' }, { status: 404 })
    }

    const grade = await Grade.create({
      studentId: student._id.toString(),
      studentName: student.name,
      course,
      score,
      examType,
      term,
    })

    return NextResponse.json(
      {
        message: '添加成绩成功',
        grade,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('添加成绩错误:', error)
    return NextResponse.json(
      {
        message: '添加成绩失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


