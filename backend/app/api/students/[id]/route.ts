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
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// 获取单个学生信息
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const student = await User.findOne({
      _id: params.id,
      role: 'student',
    }).select('-password')

    if (!student) {
      return NextResponse.json({ message: '学生不存在' }, { status: 404 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error('获取学生信息错误:', error)
    return NextResponse.json(
      {
        message: '获取学生信息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 更新学生信息（仅 staff/admin）
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可修改学生' }, { status: 403 })
    }

    const body = await request.json()
    const { username, email, studentId, name, password } = body

    // 查找学生
    const student = await User.findOne({
      _id: params.id,
      role: 'student',
    })

    if (!student) {
      return NextResponse.json({ message: '学生不存在' }, { status: 404 })
    }

    // 检查用户名、邮箱、学号是否被其他用户使用
    if (username || email || studentId) {
      const existingUser = await User.findOne({
        _id: { $ne: params.id },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : []),
          ...(studentId ? [{ studentId }] : []),
        ],
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
    }

    // 更新字段
    if (username) student.username = username
    if (email) student.email = email
    if (studentId) student.studentId = studentId
    if (name) student.name = name
    if (password) student.password = password // 密码会在保存时自动加密

    await student.save()

    // 返回更新后的学生信息（不包含密码）
    const updatedStudent = await User.findById(params.id).select('-password')

    return NextResponse.json({
      message: '更新学生信息成功',
      student: updatedStudent,
    })
  } catch (error) {
    console.error('更新学生信息错误:', error)
    return NextResponse.json(
      {
        message: '更新学生信息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 删除学生（仅 staff/admin）
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可删除学生' }, { status: 403 })
    }

    const student = await User.findOne({
      _id: params.id,
      role: 'student',
    })

    if (!student) {
      return NextResponse.json({ message: '学生不存在' }, { status: 404 })
    }

    const operator = await User.findById(decoded.userId)
    await User.deleteOne({ _id: params.id })

    if (operator) {
      await OperationLog.create({
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        action: 'delete',
        targetType: 'student',
        targetId: params.id,
        details: `${operator.name}删除了学生${student.name}（${student.studentId}）`,
      })
    }

    return NextResponse.json({ message: '删除学生成功' })
  } catch (error) {
    console.error('删除学生错误:', error)
    return NextResponse.json(
      {
        message: '删除学生失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

