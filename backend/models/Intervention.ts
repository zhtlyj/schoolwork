import mongoose, { Document, Schema } from 'mongoose'

export interface IIntervention extends Document {
  studentId: string // 学生ID
  studentName: string // 学生姓名
  warningId?: string // 关联的预警ID（可选）
  type: string // 干预类型：学习辅导、出勤提醒、家长沟通、心理辅导等
  /** student_pending 待学生处理 | pending_review 待审核 | completed 已完成 | revoked 已撤销；另含历史 pending/in-progress/cancelled */
  status: string
  description: string // 干预描述
  plan?: string // 干预计划详情
  startDate?: Date // 开始日期
  endDate?: Date // 结束日期
  duration?: number // 干预周期（天）
  createdBy: string // 创建者ID（教职工或管理员）
  createdByName: string // 创建者姓名
  assignedTo?: string // 分配给谁（可选，如具体教师）
  assignedToName?: string // 分配对象姓名
  notes?: string // 学生完成情况说明（提交审核时必填）
  submittedAt?: Date // 学生提交审核时间
  reviewResult?: 'pass' | 'fail'
  reviewOpinion?: string // 审核意见
  reviewedAt?: Date
  revokedAt?: Date // 撤销时间
  revokeReason?: string // 撤销原因
  result?: string // 干预结果（兼容旧字段）
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
      enum: [
        'student_pending',
        'pending_review',
        'completed',
        'revoked',
        'pending',
        'in-progress',
        'cancelled',
      ],
      default: 'student_pending',
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
    submittedAt: {
      type: Date,
    },
    reviewResult: {
      type: String,
      enum: ['pass', 'fail'],
    },
    reviewOpinion: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    revokeReason: {
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

