import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { generateToken } from '@/lib/jwt'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request: Request) {
  try {
    await connectDB()

    const body = await request.json()
    const { username, email, password, role, studentId, staffId, name } = body

    // 验证必填字段
    if (!username || !email || !password || !role || !name) {
      return NextResponse.json(
        { message: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证角色
    if (role !== 'student' && role !== 'staff' && role !== 'admin') {
      return NextResponse.json(
        { message: '角色必须是 student、staff 或 admin' },
        { status: 400 }
      )
    }

    // 验证学生和教职工 ID
    if (role === 'student' && !studentId) {
      return NextResponse.json(
        { message: '学生必须提供学号' },
        { status: 400 }
      )
    }

    if ((role === 'staff' || role === 'admin') && !staffId) {
      return NextResponse.json(
        { message: '教职工和管理员必须提供工号' },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({
      $or: [{ username }, { email }, { studentId }, { staffId }],
    })

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json(
          { message: '用户名已存在' },
          { status: 400 }
        )
      }
      if (existingUser.email === email) {
        return NextResponse.json(
          { message: '邮箱已被注册' },
          { status: 400 }
        )
      }
      if (existingUser.studentId === studentId && role === 'student') {
        return NextResponse.json(
          { message: '学号已被注册' },
          { status: 400 }
        )
      }
      if (existingUser.staffId === staffId && (role === 'staff' || role === 'admin')) {
        return NextResponse.json(
          { message: '工号已被注册' },
          { status: 400 }
        )
      }
    }

    // 创建新用户
    const user = await User.create({
      username,
      email,
      password,
      role,
      studentId: role === 'student' ? studentId : undefined,
      staffId: role === 'staff' || role === 'admin' ? staffId : undefined,
      name,
    })

    // 生成 token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    })

    // 返回用户信息（不包含密码）
    return NextResponse.json(
      {
        message: '注册成功',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          staffId: user.staffId,
          name: user.name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      {
        message: '注册失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

