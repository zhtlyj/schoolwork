# Backend - Next.js 项目

这是一个使用 Next.js 14 + TypeScript 构建的标准后端项目，采用 App Router 架构。

## 技术栈

- **Next.js** 14.0.4 - React 全栈框架
- **React** 18.2.0 - UI 框架
- **TypeScript** 5 - 类型系统
- **MongoDB** - 数据库
- **Mongoose** 8.0.3 - MongoDB ODM
- **ESLint** - 代码规范检查

## 项目结构

```
backend/
├── app/                    # App Router 目录（Next.js 13+）
│   ├── api/               # API 路由目录
│   │   ├── hello/
│   │   │   └── route.ts   # 示例 API 路由
│   │   └── test-db/
│   │       └── route.ts   # 数据库测试路由
│   ├── layout.tsx         # 根布局组件
│   ├── page.tsx           # 首页组件
│   └── globals.css        # 全局样式
├── lib/                   # 工具函数目录
│   ├── mongodb.ts         # MongoDB 连接配置
│   └── mongodb.d.ts       # MongoDB 类型定义
├── public/                # 静态资源目录
├── next.config.js         # Next.js 配置
├── tsconfig.json          # TypeScript 配置
├── .eslintrc.json         # ESLint 配置
├── .gitignore             # Git 忽略文件
├── next-env.d.ts          # Next.js 类型定义
└── package.json           # 项目配置和依赖
```

## 开始使用

### 安装依赖

```bash
npm install
```

### 配置环境变量

在项目根目录创建 `.env.local` 文件，添加以下配置：

```env
# MongoDB 连接字符串
MONGODB_URI=mongodb://localhost:27017/schoolwork

# JWT 密钥（生产环境请使用强随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# JWT 过期时间（可选，默认 7d）
JWT_EXPIRE=7d
```

**MongoDB 连接字符串示例：**
- 本地 MongoDB: `mongodb://localhost:27017/schoolwork`
- MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/schoolwork`

### 开发模式

启动开发服务器（默认端口：3000）

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm run start
```

### 代码检查

```bash
npm run lint
```

## 数据库配置

### MongoDB 连接

项目使用 Mongoose 连接 MongoDB 数据库。连接配置位于 `lib/mongodb.ts`。

**连接特性：**
- 自动缓存连接，避免重复连接
- 支持开发环境热重载
- 自动处理连接错误

**在 API 路由中使用数据库：**

```typescript
import connectDB from '@/lib/mongodb'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await connectDB()
    // 在这里使用数据库操作
    return NextResponse.json({ message: 'Success' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    )
  }
}
```

### 测试数据库连接

访问测试 API 路由检查数据库连接：

```
GET http://localhost:3000/api/test-db
```

## API 路由

Next.js 使用 App Router 的文件系统路由。API 路由位于 `app/api/` 目录下。

### 示例 API

访问示例 API 路由：

```
GET http://localhost:3000/api/hello
```

响应：
```json
{
  "message": "Hello from Next.js API!"
}
```

### 创建新的 API 路由

在 `app/api/` 目录下创建新的文件夹和 `route.ts` 文件：

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ users: [] })
}

export async function POST(request: Request) {
  const body = await request.json()
  return NextResponse.json({ success: true, data: body })
}
```

## 主要特性

- **服务端渲染 (SSR)** - 支持服务端渲染
- **静态生成 (SSG)** - 支持静态站点生成
- **API 路由** - 内置 API 路由支持
- **文件系统路由** - 基于文件系统的路由
- **TypeScript** - 完整的 TypeScript 支持
- **热模块替换 (HMR)** - 快速开发体验

## 开发说明

- 页面组件放在 `app/` 目录下
- API 路由放在 `app/api/` 目录下
- 静态资源放在 `public/` 目录
- 遵循 TypeScript 严格模式
- 遵循 Next.js 和 ESLint 代码规范

## 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

