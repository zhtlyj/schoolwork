import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Intervention from '@/models/Intervention'
import User from '@/models/User'
import OperationLog from '@/models/OperationLog'
import { verifyToken } from '@/lib/jwt'
import { canonicalInterventionStatus, serializeIntervention } from '@/lib/interventionStatus'

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

    const plain = intervention.toObject ? intervention.toObject() : intervention
    return NextResponse.json({ intervention: serializeIntervention(plain) })
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
      submitForReview,
      review,
      revoke,
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

    const rawStatus = intervention.status as string
    const effectiveStatus = canonicalInterventionStatus(rawStatus)

    // 学生：填写完成情况、提交待审核
    if (decoded.role === 'student') {
      if (intervention.studentId !== decoded.userId) {
        return NextResponse.json({ message: '无权限修改' }, { status: 403 })
      }

      if (submitForReview === true) {
        if (effectiveStatus !== 'student_pending') {
          return NextResponse.json({ message: '当前状态不可提交审核' }, { status: 400 })
        }
        const completion = typeof notes === 'string' ? notes.trim() : (intervention.notes || '').trim()
        if (!completion) {
          return NextResponse.json({ message: '请填写完成情况说明后再提交' }, { status: 400 })
        }
        intervention.notes = completion
        intervention.status = 'pending_review'
        intervention.submittedAt = new Date()
        if (typeof blockHash === 'string' && blockHash.trim()) {
          intervention.blockHash = blockHash.trim()
        }
        await intervention.save()
        const plain = intervention.toObject()
        return NextResponse.json({ message: '已提交审核', intervention: serializeIntervention(plain) })
      }

      if (notes !== undefined) {
        if (effectiveStatus !== 'student_pending') {
          return NextResponse.json({ message: '当前状态不可修改完成情况说明' }, { status: 400 })
        }
        intervention.notes = notes
        await intervention.save()
        const plain = intervention.toObject()
        return NextResponse.json({ message: '更新成功', intervention: serializeIntervention(plain) })
      }

      return NextResponse.json({ message: '无有效更新字段' }, { status: 400 })
    }

    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限' }, { status: 403 })
    }

    // 教职工：撤销干预（待学生处理 / 待审核）
    if (revoke && typeof revoke.reason === 'string') {
      const reason = revoke.reason.trim()
      if (!reason) {
        return NextResponse.json({ message: '请填写撤销原因' }, { status: 400 })
      }
      if (effectiveStatus !== 'student_pending' && effectiveStatus !== 'pending_review') {
        return NextResponse.json({ message: '当前状态不可撤销' }, { status: 400 })
      }
      intervention.status = 'revoked'
      intervention.revokedAt = new Date()
      intervention.revokeReason = reason
      await intervention.save()

      const operator = await User.findById(decoded.userId)
      if (operator) {
        await OperationLog.create({
          operatorId: operator._id.toString(),
          operatorName: operator.name,
          action: 'update',
          targetType: 'intervention',
          targetId: id,
          details: `${operator.name}撤销了对${intervention.studentName}的干预，原因：${reason}`,
        })
      }

      const plain = intervention.toObject()
      return NextResponse.json({ message: '已撤销干预', intervention: serializeIntervention(plain) })
    }

    // 教职工：审核
    if (review && (review.result === 'pass' || review.result === 'fail')) {
      if (effectiveStatus !== 'pending_review') {
        return NextResponse.json({ message: '当前状态不可审核' }, { status: 400 })
      }
      const opinion = typeof review.opinion === 'string' ? review.opinion.trim() : ''
      intervention.reviewResult = review.result
      intervention.reviewOpinion = opinion || undefined
      intervention.reviewedAt = new Date()
      if (review.result === 'pass') {
        intervention.status = 'completed'
      } else {
        intervention.status = 'student_pending'
        intervention.submittedAt = undefined
        intervention.reviewResult = undefined
        intervention.reviewOpinion = undefined
        intervention.reviewedAt = undefined
      }
      await intervention.save()

      const operator = await User.findById(decoded.userId)
      if (operator) {
        await OperationLog.create({
          operatorId: operator._id.toString(),
          operatorName: operator.name,
          action: 'update',
          targetType: 'intervention',
          targetId: id,
          details: `${operator.name}审核了${intervention.studentName}的干预，结果：${
            review.result === 'pass' ? '通过' : '不通过'
          }`,
        })
      }

      const plain = intervention.toObject()
      return NextResponse.json({ message: '审核已提交', intervention: serializeIntervention(plain) })
    }

    // staff/admin：常规字段更新（不允许通过此通道直接改 status）
    const updateData: any = {}
    if (type !== undefined) updateData.type = type
    if (description !== undefined) updateData.description = description
    if (plan !== undefined) updateData.plan = plan
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (duration !== undefined) updateData.duration = duration
    if (notes !== undefined) updateData.notes = notes
    if (result !== undefined) updateData.result = result
    if (blockHash !== undefined) updateData.blockHash = blockHash

    if (status !== undefined) {
      return NextResponse.json({ message: '请使用审核或撤销流程变更状态' }, { status: 400 })
    }

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

    if (Object.keys(updateData).length === 0) {
      const plain = intervention.toObject()
      return NextResponse.json({ message: '更新成功', intervention: serializeIntervention(plain) })
    }

    const updated = await Intervention.findByIdAndUpdate(id, updateData, { new: true })
    const updatedPlain = updated!.toObject()
    return NextResponse.json({ message: '更新成功', intervention: serializeIntervention(updatedPlain) })
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

    const operator = await User.findById(decoded.userId)
    await Intervention.findByIdAndDelete(id)

    if (operator) {
      await OperationLog.create({
        operatorId: operator._id.toString(),
        operatorName: operator.name,
        action: 'delete',
        targetType: 'intervention',
        targetId: id,
        details: `${operator.name}删除了${intervention.studentName}的干预记录`,
      })
    }

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

