import mongoose, { Document, Schema } from 'mongoose'

export interface IWarning extends Document {
  studentId: string
  studentName: string
  type: 'grade' | 'credit_semester' | 'credit_total'
  level: 'low' | 'medium' | 'high'
  course: string
  message: string
  createdBy: string // 创建者ID（教职工或管理员）
  createdByName: string // 创建者姓名
  blockHash?: string // 区块链哈希
  isRead: boolean // 是否已读
  createdAt: Date
  updatedAt: Date
}

const WarningSchema = new Schema<IWarning>(
  {
    studentId: {
      type: String,
      required: [true, '学生ID不能为空'],
      ref: 'User',
    },
    studentName: {
      type: String,
      required: [true, '学生姓名不能为空'],
    },
    type: {
      type: String,
      enum: ['grade', 'credit_semester', 'credit_total'],
      required: [true, '预警类型不能为空'],
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: [true, '预警级别不能为空'],
    },
    course: {
      type: String,
      required: [true, '课程名称不能为空'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, '预警消息不能为空'],
      trim: true,
    },
    createdBy: {
      type: String,
      required: [true, '创建者ID不能为空'],
      ref: 'User',
    },
    createdByName: {
      type: String,
      required: [true, '创建者姓名不能为空'],
    },
    blockHash: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// 创建索引
WarningSchema.index({ studentId: 1, createdAt: -1 })
WarningSchema.index({ type: 1, level: 1 })
WarningSchema.index({ isRead: 1 })

// 清除缓存以确保使用最新 schema（避免 enum 变更后仍用旧定义）
if (mongoose.models.Warning) {
  delete mongoose.models.Warning
}
const Warning = mongoose.model<IWarning>('Warning', WarningSchema)

export default Warning

