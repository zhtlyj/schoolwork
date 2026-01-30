import mongoose, { Document, Schema } from 'mongoose'

export interface IAttendance extends Document {
  studentId: string // User._id
  studentName: string
  course: string
  absentCount: number
  lastAbsentAt: Date
  createdAt: Date
  updatedAt: Date
}

const AttendanceSchema = new Schema<IAttendance>(
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
    absentCount: {
      type: Number,
      required: [true, '缺勤次数不能为空'],
      min: 0,
    },
    lastAbsentAt: {
      type: Date,
      required: [true, '最近缺勤时间不能为空'],
    },
  },
  {
    timestamps: true,
  }
)

// 索引：按学生、课程、最近缺勤时间
AttendanceSchema.index({ studentId: 1, course: 1 })
AttendanceSchema.index({ studentId: 1, lastAbsentAt: -1 })

const Attendance =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>('Attendance', AttendanceSchema)

export default Attendance


