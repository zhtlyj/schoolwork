import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import OperationLog from '@/models/OperationLog'
import { verifyToken } from '@/lib/jwt'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// 获取学生列表
export async function GET(request: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // 构建查询条件
    const query: any = { role: 'student' }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
      ]
    }

    // 计算跳过的记录数
    const skip = (page - 1) * limit

    // 查询学生列表
    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // 获取总数
    const total = await User.countDocuments(query)

    // 将 _id 转换为 id
    const studentsWithId = students.map((student) => ({
      id: student._id.toString(),
      username: student.username,
      email: student.email,
      studentId: student.studentId,
      name: student.name,
      role: student.role,
      createdAt: student.createdAt,
    }))

    return NextResponse.json({
      students: studentsWithId,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取学生列表错误:', error)
    return NextResponse.json(
      {
        message: '获取学生列表失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 添加学生
export async function POST(request: Request) {
  try {
    await connectDB()

    const body = await request.json()
    const { username, email, password, studentId, name } = body

    // 验证必填字段
    if (!username || !email || !password || !studentId || !name) {
      return NextResponse.json(
        { message: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 检查用户名、邮箱、学号是否已存在
    const existingUser = await User.findOne({
      $or: [{ username }, { email }, { studentId }],
    })

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json({ message: '用户名已存在' }, { status: 400 })
      }
      if (existingUser.email === email) {
        return NextResponse.json({ message: '邮箱已被注册' }, { status: 400 })
      }
      if (existingUser.studentId === studentId) {
        return NextResponse.json({ message: '学号已被注册' }, { status: 400 })
      }
    }

    // 创建新学生
    const student = await User.create({
      username,
      email,
      password,
      role: 'student',
      studentId,
      name,
    })

    if (operator) {
      await OperationLog.create({
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        action: 'create',
        targetType: 'student',
        targetId: student._id.toString(),
        details: `${operator.name}添加了学生${name}（${studentId}）`,
      })
    }

    // 返回学生信息（不包含密码）
    return NextResponse.json(
      {
        message: '添加学生成功',
        student: {
          id: student._id,
          username: student.username,
          email: student.email,
          role: student.role,
          studentId: student.studentId,
          name: student.name,
          createdAt: student.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('添加学生错误:', error)
    return NextResponse.json(
      {
        message: '添加学生失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

