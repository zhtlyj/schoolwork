import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Grade from '@/models/Grade'
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

// 获取单条成绩
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

    const grade = await Grade.findById(params.id)
    if (!grade) {
      return NextResponse.json({ message: '成绩记录不存在' }, { status: 404 })
    }

    if (decoded.role === 'student' && grade.studentId !== decoded.userId) {
      return NextResponse.json({ message: '无权限查看该成绩' }, { status: 403 })
    }

    return NextResponse.json({ grade })
  } catch (error) {
    console.error('获取成绩信息错误:', error)
    return NextResponse.json(
      {
        message: '获取成绩信息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 更新成绩（仅教职工/管理员）
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
    const { course, score, credits, examType, term } = body as {
      course?: string
      score?: number
      credits?: number
      examType?: string
      term?: string
    }

    const grade = await Grade.findById(params.id)
    if (!grade) {
      return NextResponse.json({ message: '成绩记录不存在' }, { status: 404 })
    }

    if (course) grade.course = course
    if (typeof score === 'number') grade.score = score
    if (typeof credits === 'number') grade.credits = credits
    if (examType) grade.examType = examType as any
    if (term) grade.term = term

    await grade.save()

    return NextResponse.json({
      message: '更新成绩成功',
      grade,
    })
  } catch (error) {
    console.error('更新成绩错误:', error)
    return NextResponse.json(
      {
        message: '更新成绩失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 删除成绩（仅教职工/管理员）
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
        { message: '无权限：仅教职工/管理员可删除成绩' },
        { status: 403 }
      )
    }

    const grade = await Grade.findById(params.id)
    if (!grade) {
      return NextResponse.json({ message: '成绩记录不存在' }, { status: 404 })
    }

    await Grade.deleteOne({ _id: params.id })

    return NextResponse.json({ message: '删除成绩成功' })
  } catch (error) {
    console.error('删除成绩错误:', error)
    return NextResponse.json(
      {
        message: '删除成绩失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


