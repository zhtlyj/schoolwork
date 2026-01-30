import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Warning from '@/models/Warning'
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

function getAuthFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null
  return verifyToken(token)
}

// 获取单个预警信息
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const warning = await Warning.findById(params.id)

    if (!warning) {
      return NextResponse.json({ message: '预警不存在' }, { status: 404 })
    }

    const decoded = getAuthFromRequest(request)
    if (!decoded) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    // 学生只能查看自己的预警；教职工/管理员可查看全部
    if (decoded.role === 'student' && warning.studentId !== decoded.userId) {
      return NextResponse.json({ message: '无权限访问该预警' }, { status: 403 })
    }

    return NextResponse.json({ warning })
  } catch (error) {
    console.error('获取预警信息错误:', error)
    return NextResponse.json(
      {
        message: '获取预警信息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 更新预警信息
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const body = await request.json()
    const { type, level, course, message, blockHash, isRead } = body

    const warning = await Warning.findById(params.id)

    if (!warning) {
      return NextResponse.json({ message: '预警不存在' }, { status: 404 })
    }

    const decoded = getAuthFromRequest(request)
    if (!decoded) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }

    // 学生：只允许把自己的预警标记已读/未读；不允许改其他字段
    if (decoded.role === 'student') {
      if (warning.studentId !== decoded.userId) {
        return NextResponse.json({ message: '无权限操作该预警' }, { status: 403 })
      }
      if (isRead === undefined) {
        return NextResponse.json({ message: '学生仅允许更新已读状态' }, { status: 400 })
      }
      warning.isRead = isRead
      await warning.save()
      return NextResponse.json({ message: '更新预警已读状态成功', warning })
    }

    // 教职工/管理员：允许更新预警内容
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限' }, { status: 403 })
    }

    // 更新字段
    if (type) warning.type = type
    if (level) warning.level = level
    if (course) warning.course = course
    if (message) warning.message = message
    if (blockHash !== undefined) warning.blockHash = blockHash
    if (isRead !== undefined) warning.isRead = isRead

    await warning.save()

    return NextResponse.json({
      message: '更新预警信息成功',
      warning,
    })
  } catch (error) {
    console.error('更新预警信息错误:', error)
    return NextResponse.json(
      {
        message: '更新预警信息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 删除预警
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const warning = await Warning.findById(params.id)

    if (!warning) {
      return NextResponse.json({ message: '预警不存在' }, { status: 404 })
    }

    const decoded = getAuthFromRequest(request)
    if (!decoded) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    // 仅 staff/admin 可删除
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可删除预警' }, { status: 403 })
    }

    await Warning.deleteOne({ _id: params.id })

    return NextResponse.json({ message: '删除预警成功' })
  } catch (error) {
    console.error('删除预警错误:', error)
    return NextResponse.json(
      {
        message: '删除预警失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

