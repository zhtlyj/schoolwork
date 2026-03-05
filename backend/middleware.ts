import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': request.headers.get('origin') || 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      },
    })
  }

  // 对于其他请求，添加 CORS headers
  const response = NextResponse.next()
  const origin = request.headers.get('origin')

  // 允许的源（开发环境）
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',  // Vite 备用端口
    'http://localhost:3000',
  ]

  // 开发环境：允许任意 localhost 端口
  const isLocalhost = origin && /^https?:\/\/localhost(:\d+)?$/.test(origin)
  if (origin && (allowedOrigins.includes(origin) || isLocalhost)) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')
  }

  return response
}

export const config = {
  matcher: '/api/:path*',
}

