import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Intervention from '@/models/Intervention'
import User from '@/models/User'
import Warning from '@/models/Warning'
import OperationLog from '@/models/OperationLog'
import { verifyToken } from '@/lib/jwt'
import { serializeIntervention } from '@/lib/interventionStatus'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// 获取干预列表
export async function GET(request: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // 鉴权
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)

    // 构建查询条件
    const query: any = {}

    if (decoded.role === 'student') {
      // 学生端：只能看自己的干预
      query.studentId = decoded.userId
    } else {
      // 管理端：可按 studentId 筛选
      if (studentId) query.studentId = studentId
    }

    if (status) {
      const qStatus = status as string
      if (qStatus === 'student_pending') {
        query.status = { $in: ['student_pending', 'pending'] }
      } else if (qStatus === 'pending_review') {
        query.status = { $in: ['pending_review', 'in-progress'] }
      } else if (qStatus === 'revoked') {
        query.status = { $in: ['revoked', 'cancelled'] }
      } else {
        query.status = qStatus
      }
    }

    if (type) {
      query.type = type
    }

    // 计算跳过的记录数
    const skip = (page - 1) * limit

    // 查询干预列表
    const interventions = await Intervention.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // 获取总数
    const total = await Intervention.countDocuments(query)

    const serialized = interventions.map((i) =>
      serializeIntervention(i.toObject ? i.toObject() : i)
    )

    return NextResponse.json({
      interventions: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取干预列表错误:', error)
    return NextResponse.json(
      {
        message: '获取干预列表失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 创建干预
export async function POST(request: Request) {
  try {
    await connectDB()

    const body = await request.json()
    const {
      studentId,
      warningId,
      type,
      description,
      plan,
      startDate,
      endDate,
      duration,
      assignedTo,
      notes,
      blockHash,
    } = body

    // 鉴权：仅 staff/admin 可创建干预
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可创建干预' }, { status: 403 })
    }

    // 验证必填字段
    if (!studentId || !type || !description) {
      return NextResponse.json({ message: '请填写所有必填字段' }, { status: 400 })
    }

    // 验证学生是否存在
    const student = await User.findById(studentId)
    if (!student || student.role !== 'student') {
      return NextResponse.json({ message: '学生不存在' }, { status: 404 })
    }

    // 如果提供了 warningId，验证预警是否存在
    if (warningId) {
      const warning = await Warning.findById(warningId)
      if (!warning) {
        return NextResponse.json({ message: '关联的预警不存在' }, { status: 404 })
      }
    }

    // 获取创建者信息
    const creator = await User.findById(decoded.userId)
    if (!creator) {
      return NextResponse.json({ message: '创建者不存在' }, { status: 404 })
    }
    if (creator.role !== 'staff' && creator.role !== 'admin') {
      return NextResponse.json({ message: '无权限：仅教职工/管理员可创建干预' }, { status: 403 })
    }

    // 如果提供了 assignedTo，验证分配对象是否存在
    let assignedToUser = null
    if (assignedTo) {
      assignedToUser = await User.findById(assignedTo)
      if (!assignedToUser) {
        return NextResponse.json({ message: '分配对象不存在' }, { status: 404 })
      }
    }

    // 创建干预
    const intervention = await Intervention.create({
      studentId: student._id.toString(),
      studentName: student.name,
      warningId: warningId || undefined,
      type,
      status: 'student_pending',
      description,
      plan: plan || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      duration: duration || undefined,
      createdBy: creator._id.toString(),
      createdByName: creator.name,
      assignedTo: assignedTo ? assignedToUser!._id.toString() : undefined,
      assignedToName: assignedTo ? assignedToUser!.name : undefined,
      notes: notes || undefined,
      blockHash,
    })

    await OperationLog.create({
      operatorId: creator._id.toString(),
      operatorName: creator.name,
      action: 'create',
      targetType: 'intervention',
      targetId: intervention._id.toString(),
      details: `${creator.name}为${student.name}创建了${type}干预`,
    })

    const createdPlain = intervention.toObject ? intervention.toObject() : intervention
    return NextResponse.json(
      {
        message: '创建干预成功',
        intervention: serializeIntervention(createdPlain),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建干预错误:', error)
    console.error('错误详情:', error instanceof Error ? error.stack : error)
    return NextResponse.json(
      {
        message: '创建干预失败',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    )
  }
}

