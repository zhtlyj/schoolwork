import mongoose, { Document, Schema } from 'mongoose'

export interface IOperationLog extends Document {
  operatorId: string
  operatorName: string
  action: string // create | update | delete
  targetType: string // warning | intervention | student | grade | attendance
  targetId?: string
  details: string // 操作描述，如「对张三下发成绩预警」
  createdAt: Date
}

const OperationLogSchema = new Schema<IOperationLog>(
  {
    operatorId: {
      type: String,
      required: true,
    },
    operatorName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
    },
    targetType: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
    },
    details: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
)

OperationLogSchema.index({ createdAt: -1 })
OperationLogSchema.index({ targetType: 1, targetId: 1 })

const OperationLog =
  mongoose.models.OperationLog || mongoose.model<IOperationLog>('OperationLog', OperationLogSchema)

export default OperationLog
