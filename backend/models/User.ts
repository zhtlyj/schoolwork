import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  username: string
  email: string
  password: string
  role: 'student' | 'staff' | 'admin'
  studentId?: string
  staffId?: string
  name: string
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, '用户名不能为空'],
      unique: true,
      trim: true,
      minlength: [3, '用户名至少3个字符'],
      maxlength: [20, '用户名最多20个字符'],
    },
    email: {
      type: String,
      required: [true, '邮箱不能为空'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, '请输入有效的邮箱地址'],
    },
    password: {
      type: String,
      required: [true, '密码不能为空'],
      minlength: [6, '密码至少6个字符'],
      select: false, // 默认查询时不返回密码
    },
    role: {
      type: String,
      enum: ['student', 'staff', 'admin'],
      required: [true, '角色不能为空'],
    },
    studentId: {
      type: String,
      required: function (this: IUser) {
        return this.role === 'student'
      },
      unique: true,
      sparse: true,
    },
    staffId: {
      type: String,
      required: function (this: IUser) {
        return this.role === 'staff' || this.role === 'admin'
      },
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: [true, '姓名不能为空'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// 保存前加密密码
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next()
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// 比较密码方法
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// 如果模型已存在则使用，否则创建新模型
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User

