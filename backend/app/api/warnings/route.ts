import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Warning from '@/models/Warning'
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

// 获取预警列表
export async function GET(request: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const type = searchParams.get('type')
    const level = searchParams.get('level')
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

    // 计算跳过的记录数
    const skip = (page - 1) * limit

    // 查询预警列表
    const warnings = await Warning.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

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

