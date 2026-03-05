import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import OperationLog from '@/models/OperationLog'
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

// 获取操作日志（仅 staff/admin）
export async function GET(request: Request) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可查看操作日志' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const logs = await OperationLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('获取操作日志错误:', error)
    return NextResponse.json(
      {
        message: '获取操作日志失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
