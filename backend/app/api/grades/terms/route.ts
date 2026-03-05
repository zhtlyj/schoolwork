import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200 })
}

// 生成 2022-2028 学年学期列表（格式：YYYY-YYYY-1/2）
function generateTerms(): string[] {
  const terms: string[] = []
  for (let y = 2022; y <= 2028; y++) {
    terms.push(`${y}-${y + 1}-1`, `${y}-${y + 1}-2`)
  }
  return terms
}

// 获取学期列表（2022-2028，用于学分预警下发时的学期下拉选择）
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ message: '未提供认证 token' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (decoded.role !== 'staff' && decoded.role !== 'admin') {
      return NextResponse.json({ message: '无权限' }, { status: 403 })
    }

    const terms = generateTerms()
    return NextResponse.json({ terms })
  } catch (error) {
    console.error('获取学期列表错误:', error)
    return NextResponse.json(
      { message: '获取学期列表失败', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
