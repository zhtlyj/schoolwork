import mongoose, { Document, Schema } from 'mongoose'

export interface IIntervention extends Document {
  studentId: string // 学生ID
  studentName: string // 学生姓名
  warningId?: string // 关联的预警ID（可选）
  type: string // 干预类型：学习辅导、出勤提醒、家长沟通、心理辅导等
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled' // 状态
  description: string // 干预描述
  plan?: string // 干预计划详情
  startDate?: Date // 开始日期
  endDate?: Date // 结束日期
  duration?: number // 干预周期（天）
  createdBy: string // 创建者ID（教职工或管理员）
  createdByName: string // 创建者姓名
  assignedTo?: string // 分配给谁（可选，如具体教师）
  assignedToName?: string // 分配对象姓名
  notes?: string // 备注
  result?: string // 干预结果
  blockHash?: string // 区块链哈希
  createdAt: Date
  updatedAt: Date
}

const InterventionSchema = new Schema<IIntervention>(
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
    warningId: {
      type: String,
      ref: 'Warning',
    },
    type: {
      type: String,
      required: [true, '干预类型不能为空'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
      required: [true, '状态不能为空'],
    },
    description: {
      type: String,
      required: [true, '干预描述不能为空'],
      trim: true,
    },
    plan: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    duration: {
      type: Number,
      min: 0,
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
    assignedTo: {
      type: String,
      ref: 'User',
    },
    assignedToName: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
    },
    result: {
      type: String,
      trim: true,
    },
    blockHash: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// 创建索引
InterventionSchema.index({ studentId: 1, createdAt: -1 })
InterventionSchema.index({ status: 1, createdAt: -1 })
InterventionSchema.index({ warningId: 1 })
InterventionSchema.index({ createdBy: 1 })

const Intervention =
  mongoose.models.Intervention ||
  mongoose.model<IIntervention>('Intervention', InterventionSchema)

export default Intervention

