import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Intervention from '@/models/Intervention'
import User from '@/models/User'
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

// 获取单个干预
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const { id } = params

    // 鉴权
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)

    const intervention = await Intervention.findById(id)
    if (!intervention) {
      return NextResponse.json({ message: '干预不存在' }, { status: 404 })
    }

    // 学生只能看自己的干预
    if (decoded.role === 'student' && intervention.studentId !== decoded.userId) {
      return NextResponse.json({ message: '无权限访问' }, { status: 403 })
    }

    return NextResponse.json({ intervention })
  } catch (error) {
    console.error('获取干预错误:', error)
    return NextResponse.json(
      {
        message: '获取干预失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 更新干预
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const { id } = params
    const body = await request.json()
    const {
      type,
      status,
      description,
      plan,
      startDate,
      endDate,
      duration,
      assignedTo,
      notes,
      result,
      blockHash,
    } = body

    // 鉴权
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)

    const intervention = await Intervention.findById(id)
    if (!intervention) {
      return NextResponse.json({ message: '干预不存在' }, { status: 404 })
    }

    // 学生只能更新自己的干预的某些字段（如查看状态），但不能修改核心内容
    if (decoded.role === 'student') {
      if (intervention.studentId !== decoded.userId) {
        return NextResponse.json({ message: '无权限修改' }, { status: 403 })
      }
      // 学生只能更新 notes（自己的反馈）
      const updateData: any = {}
      if (notes !== undefined) updateData.notes = notes
      const updated = await Intervention.findByIdAndUpdate(id, updateData, { new: true })
      return NextResponse.json({ message: '更新成功', intervention: updated })
    }

    // staff/admin 可以更新所有字段
    const updateData: any = {}
    if (type !== undefined) updateData.type = type
    if (status !== undefined) updateData.status = status
    if (description !== undefined) updateData.description = description
    if (plan !== undefined) updateData.plan = plan
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (duration !== undefined) updateData.duration = duration
    if (notes !== undefined) updateData.notes = notes
    if (result !== undefined) updateData.result = result
    if (blockHash !== undefined) updateData.blockHash = blockHash

    // 如果更新了 assignedTo，需要验证并更新 assignedToName
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const assignedToUser = await User.findById(assignedTo)
        if (!assignedToUser) {
          return NextResponse.json({ message: '分配对象不存在' }, { status: 404 })
        }
        updateData.assignedTo = assignedToUser._id.toString()
        updateData.assignedToName = assignedToUser.name
      } else {
        updateData.assignedTo = undefined
        updateData.assignedToName = undefined
      }
    }

    const updated = await Intervention.findByIdAndUpdate(id, updateData, { new: true })

    return NextResponse.json({ message: '更新成功', intervention: updated })
  } catch (error) {
    console.error('更新干预错误:', error)
    return NextResponse.json(
      {
        message: '更新干预失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 删除干预
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const { id } = params

    // 鉴权：仅 staff/admin 可删除
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可删除干预' }, { status: 403 })
    }

    const intervention = await Intervention.findById(id)
    if (!intervention) {
      return NextResponse.json({ message: '干预不存在' }, { status: 404 })
    }

    await Intervention.findByIdAndDelete(id)

    return NextResponse.json({ message: '删除干预成功' })
  } catch (error) {
    console.error('删除干预错误:', error)
    return NextResponse.json(
      {
        message: '删除干预失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

