import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Attendance from '@/models/Attendance'
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

function getAuth(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null
  return verifyToken(token)
}

// 获取单条出勤记录
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const decoded = getAuth(request)
    if (!decoded) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }

    const record = await Attendance.findById(params.id)
    if (!record) {
      return NextResponse.json({ message: '出勤记录不存在' }, { status: 404 })
    }

    if (decoded.role === 'student' && record.studentId !== decoded.userId) {
      return NextResponse.json({ message: '无权限查看该出勤记录' }, { status: 403 })
    }

    return NextResponse.json({ record })
  } catch (error) {
    console.error('获取出勤记录错误:', error)
    return NextResponse.json(
      {
        message: '获取出勤记录失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 更新出勤记录（仅教职工/管理员）
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const decoded = getAuth(request)
    if (!decoded) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { course, absentCount, lastAbsentAt } = body as {
      course?: string
      absentCount?: number
      lastAbsentAt?: string
    }

    const record = await Attendance.findById(params.id)
    if (!record) {
      return NextResponse.json({ message: '出勤记录不存在' }, { status: 404 })
    }

    if (course) record.course = course
    if (typeof absentCount === 'number') record.absentCount = absentCount
    if (lastAbsentAt) record.lastAbsentAt = new Date(lastAbsentAt)

    await record.save()

    return NextResponse.json({
      message: '更新出勤记录成功',
      record,
    })
  } catch (error) {
    console.error('更新出勤记录错误:', error)
    return NextResponse.json(
      {
        message: '更新出勤记录失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 删除出勤记录（仅教职工/管理员）
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const decoded = getAuth(request)
    if (!decoded) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json(
        { message: '无权限：仅教职工/管理员可删除出勤记录' },
        { status: 403 }
      )
    }

    const record = await Attendance.findById(params.id)
    if (!record) {
      return NextResponse.json({ message: '出勤记录不存在' }, { status: 404 })
    }

    await Attendance.deleteOne({ _id: params.id })

    return NextResponse.json({ message: '删除出勤记录成功' })
  } catch (error) {
    console.error('删除出勤记录错误:', error)
    return NextResponse.json(
      {
        message: '删除出勤记录失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


