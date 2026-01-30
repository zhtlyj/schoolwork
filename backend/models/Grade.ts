import mongoose, { Document, Schema } from 'mongoose'

export type ExamType = 'midterm' | 'final' | 'regular'

export interface IGrade extends Document {
  studentId: string // User._id
  studentName: string
  course: string
  score: number
  examType: ExamType
  term: string // 学期，如 2024-2025-1
  createdAt: Date
  updatedAt: Date
}

const GradeSchema = new Schema<IGrade>(
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
    course: {
      type: String,
      required: [true, '课程名称不能为空'],
      trim: true,
    },
    score: {
      type: Number,
      required: [true, '成绩不能为空'],
      min: 0,
      max: 100,
    },
    examType: {
      type: String,
      enum: ['midterm', 'final', 'regular'],
      required: [true, '考试类型不能为空'],
    },
    term: {
      type: String,
      required: [true, '学期不能为空'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// 索引：按学生、课程、学期、创建时间
GradeSchema.index({ studentId: 1, term: 1, course: 1 })
GradeSchema.index({ studentId: 1, createdAt: -1 })

const Grade =
  mongoose.models.Grade || mongoose.model<IGrade>('Grade', GradeSchema)

export default Grade


