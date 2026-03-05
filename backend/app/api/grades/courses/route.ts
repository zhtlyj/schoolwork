import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Grade from '@/models/Grade'
import { verifyToken } from '@/lib/jwt'

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200 })
}

// 获取所有不重复的课程名称（用于成绩预警下发时的课程下拉选择）
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
      return NextResponse.json({ message: '无权限' }, { status: 403 })
    }

    const courses = await Grade.distinct('course')
    return NextResponse.json({ courses: (courses as string[]).sort() })
  } catch (error) {
    console.error('获取课程列表错误:', error)
    return NextResponse.json(
      { message: '获取课程列表失败', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
