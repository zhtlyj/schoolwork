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
    const { userId, password } = body

    // 验证必填字段（userId 为学号或工号）
    if (!userId || !password) {
      return NextResponse.json(
        { message: '请输入学号/工号和密码' },
        { status: 400 }
      )
    }

    // 按学号或工号查找用户（包含密码字段）
    const user = await User.findOne({
      $or: [{ studentId: userId }, { staffId: userId }],
    }).select('+password')

    if (!user) {
      return NextResponse.json(
        { message: '学号/工号或密码错误' },
        { status: 401 }
      )
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: '学号/工号或密码错误' },
        { status: 401 }
      )
    }

    // 生成 token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    })

    // 返回用户信息（不包含密码）
    return NextResponse.json({
      message: '登录成功',
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
    })
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      {
        message: '登录失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

