import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'

export async function GET() {
  try {
    await connectDB()
    return NextResponse.json({ 
      message: '数据库连接成功！',
      status: 'connected'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        message: '数据库连接失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

