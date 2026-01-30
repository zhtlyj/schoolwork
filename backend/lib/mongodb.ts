import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error(
    '❌ 数据库连接失败：未找到 MONGODB_URI 环境变量\n' +
    '请在 backend 目录下创建 .env.local 文件，并添加以下配置：\n' +
    'MONGODB_URI=mongodb://localhost:27017/schoolwork\n' +
    '可以参考 .env.local.example 文件'
  )
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // 5秒超时
      socketTimeoutMS: 45000, // 45秒socket超时
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('✅ MongoDB 连接成功')
      return mongoose
    }).catch((error) => {
      console.error('❌ MongoDB 连接失败:', error.message)
      throw error
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    // 提供更友好的错误信息
    if (e instanceof Error) {
      if (e.message.includes('ECONNREFUSED')) {
        throw new Error(
          '❌ 数据库连接失败：无法连接到 MongoDB 服务器\n' +
          '请检查：\n' +
          '1. MongoDB 服务是否已启动\n' +
          '2. 连接字符串是否正确（检查 .env.local 中的 MONGODB_URI）\n' +
          '3. 端口号是否正确（默认 27017）'
        )
      } else if (e.message.includes('authentication failed')) {
        throw new Error(
          '❌ 数据库连接失败：身份验证失败\n' +
          '请检查 MongoDB 用户名和密码是否正确'
        )
      } else if (e.message.includes('timeout')) {
        throw new Error(
          '❌ 数据库连接失败：连接超时\n' +
          '请检查网络连接和 MongoDB 服务器状态'
        )
      }
    }
    throw e
  }

  return cached.conn
}

export default connectDB

