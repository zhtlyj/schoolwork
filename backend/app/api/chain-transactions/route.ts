import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import ChainTransactionRecord from '@/models/ChainTransactionRecord'
import User from '@/models/User'
import { verifyToken } from '@/lib/jwt'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

function serialize(doc: Record<string, unknown>) {
  const d = doc as {
    _id: { toString: () => string }
    createdAt: Date
    txHash: string
    blockNumber: number
    blockHash: string
    gasUsed: string
    gasPriceWei: string
    feeWei: string
    action: string
    chainId: string
    fromAddress: string
    toAddress: string | null
  }
  return {
    id: d._id.toString(),
    recordedAt: new Date(d.createdAt).toISOString(),
    txHash: d.txHash,
    blockNumber: d.blockNumber,
    blockHash: d.blockHash,
    gasUsed: d.gasUsed,
    gasPriceWei: d.gasPriceWei,
    feeWei: d.feeWei,
    action: d.action,
    chainId: d.chainId,
    from: d.fromAddress,
    to: d.toAddress,
  }
}

export async function GET(request: Request) {
  try {
    await connectDB()
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '200', 10) || 200, 1), 500)

    const list = await ChainTransactionRecord.find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      records: list.map((r) => serialize(r as Record<string, unknown>)),
    })
  } catch (error) {
    console.error('获取链上交易记录错误:', error)
    return NextResponse.json(
      {
        message: '获取链上交易记录失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let txHashForDup = ''
  try {
    await connectDB()
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)

    const body = await request.json()
    const {
      txHash,
      blockNumber,
      blockHash,
      gasUsed,
      gasPriceWei,
      feeWei,
      action,
      chainId,
      from: fromAddress,
      to: toAddress,
    } = body

    if (
      typeof txHash !== 'string' ||
      !txHash.trim() ||
      typeof blockNumber !== 'number' ||
      typeof blockHash !== 'string' ||
      typeof gasUsed !== 'string' ||
      typeof gasPriceWei !== 'string' ||
      typeof feeWei !== 'string' ||
      typeof action !== 'string' ||
      typeof chainId !== 'string' ||
      typeof fromAddress !== 'string'
    ) {
      return NextResponse.json({ message: '请求体字段不完整或格式错误' }, { status: 400 })
    }

    txHashForDup = txHash.trim()

    const existed = await ChainTransactionRecord.findOne({ txHash: txHashForDup }).lean()
    if (existed) {
      return NextResponse.json({
        message: '该交易已记录',
        record: serialize(existed as Record<string, unknown>),
      })
    }

    const user = await User.findById(decoded.userId)
    const userName = user?.name || decoded.username

    const doc = await ChainTransactionRecord.create({
      userId: decoded.userId,
      userName,
      txHash: txHashForDup,
      blockNumber,
      blockHash,
      gasUsed,
      gasPriceWei,
      feeWei,
      action: action.trim(),
      chainId: chainId.trim(),
      fromAddress,
      toAddress: typeof toAddress === 'string' ? toAddress : null,
    })

    const plain = doc.toObject()
    return NextResponse.json(
      { message: '已保存', record: serialize(plain as Record<string, unknown>) },
      { status: 201 }
    )
  } catch (error: unknown) {
    const err = error as { code?: number }
    if (err.code === 11000 && txHashForDup) {
      const existed = await ChainTransactionRecord.findOne({ txHash: txHashForDup }).lean()
      if (existed) {
        return NextResponse.json({
          message: '该交易已记录',
          record: serialize(existed as Record<string, unknown>),
        })
      }
    }
    console.error('保存链上交易记录错误:', error)
    return NextResponse.json(
      {
        message: '保存链上交易记录失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDB()
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)

    await ChainTransactionRecord.deleteMany({ userId: decoded.userId })
    return NextResponse.json({ message: '已清空您的链上交易记录' })
  } catch (error) {
    console.error('清空链上交易记录错误:', error)
    return NextResponse.json(
      {
        message: '清空失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
