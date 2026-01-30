import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export interface AuthRequest extends NextRequest {
  user?: {
    userId: string
    username: string
    role: 'student' | 'staff' | 'admin'
  }
}

export function authMiddleware(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { message: '未提供认证 token' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)

    // 将用户信息添加到请求对象（通过 header 传递）
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', decoded.userId)
    requestHeaders.set('x-username', decoded.username)
    requestHeaders.set('x-role', decoded.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { message: '无效的 token' },
      { status: 401 }
    )
  }
}

export function getAuthUser(request: NextRequest) {
  return {
    userId: request.headers.get('x-user-id') || '',
    username: request.headers.get('x-username') || '',
    role: (request.headers.get('x-role') as 'student' | 'staff' | 'admin') || 'student',
  }
}

