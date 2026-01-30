import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Grade from '@/models/Grade'
import Attendance from '@/models/Attendance'

// 简单的开发环境 Seed 接口：生成一些学生、成绩、出勤示例数据
// 调用方式：POST http://localhost:3000/api/dev/seed-demo

export async function POST() {
  try {
    await connectDB()

    // 检查是否已有示例学生
    let student = await User.findOne({ username: 'demo_student_1' })
    if (!student) {
      student = await User.create({
        username: 'demo_student_1',
        email: 'demo_student_1@example.com',
        password: '123456',
        role: 'student',
        studentId: '20240001',
        name: '张三',
      })
    }

    let student2 = await User.findOne({ username: 'demo_student_2' })
    if (!student2) {
      student2 = await User.create({
        username: 'demo_student_2',
        email: 'demo_student_2@example.com',
        password: '123456',
        role: 'student',
        studentId: '20240002',
        name: '李四',
      })
    }

    // 创建更真实的成绩记录（多个学期、多门课程，包含会触发预警的记录）
    const term1 = '2024-2025-1'
    const term2 = '2024-2025-2'

    await Grade.deleteMany({
      studentId: { $in: [student._id.toString(), student2._id.toString()] },
      term: { $in: [term1, term2] },
    })

    await Grade.insertMany([
      // 张三 - 本学年上学期
      {
        studentId: student._id.toString(),
        studentName: student.name,
        course: '高等数学',
        score: 55, // < 60，高危预警
        examType: 'final',
        term: term1,
      },
      {
        studentId: student._id.toString(),
        studentName: student.name,
        course: '数据结构',
        score: 72,
        examType: 'midterm',
        term: term1,
      },
      {
        studentId: student._id.toString(),
        studentName: student.name,
        course: '大学英语',
        score: 83,
        examType: 'final',
        term: term1,
      },
      // 张三 - 本学年下学期
      {
        studentId: student._id.toString(),
        studentName: student.name,
        course: '操作系统',
        score: 48, // 明显不及格，高危预警
        examType: 'midterm',
        term: term2,
      },
      {
        studentId: student._id.toString(),
        studentName: student.name,
        course: '计算机网络',
        score: 62,
        examType: 'regular',
        term: term2,
      },
      // 李四
      {
        studentId: student2._id.toString(),
        studentName: student2.name,
        course: '高等数学',
        score: 59, // 紧贴阈值，仍会触发高危
        examType: 'final',
        term: term1,
      },
      {
        studentId: student2._id.toString(),
        studentName: student2.name,
        course: '线性代数',
        score: 78,
        examType: 'midterm',
        term: term1,
      },
      {
        studentId: student2._id.toString(),
        studentName: student2.name,
        course: '操作系统',
        score: 88,
        examType: 'final',
        term: term2,
      },
    ])

    // 创建更真实的出勤记录（多门课、多次缺勤，包含会触发预警的记录）
    await Attendance.deleteMany({
      studentId: { $in: [student._id.toString(), student2._id.toString()] },
    })

    await Attendance.insertMany([
      // 张三：操作系统缺勤 4 次 -> >3，中危预警
      {
        studentId: student._id.toString(),
        studentName: student.name,
        course: '操作系统',
        absentCount: 4,
        lastAbsentAt: new Date('2024-01-10'),
      },
      // 张三：计算机网络缺勤 2 次 -> 不触发预警
      {
        studentId: student._id.toString(),
        studentName: student.name,
        course: '计算机网络',
        absentCount: 2,
        lastAbsentAt: new Date('2024-01-05'),
      },
      // 张三：高等数学缺勤 1 次 -> 正常
      {
        studentId: student._id.toString(),
        studentName: student.name,
        course: '高等数学',
        absentCount: 1,
        lastAbsentAt: new Date('2024-01-03'),
      },
      // 李四：高等数学缺勤 5 次 -> >3，中危预警
      {
        studentId: student2._id.toString(),
        studentName: student2.name,
        course: '高等数学',
        absentCount: 5,
        lastAbsentAt: new Date('2024-01-08'),
      },
      // 李四：大学物理缺勤 0 次 -> 正常
      {
        studentId: student2._id.toString(),
        studentName: student2.name,
        course: '大学物理',
        absentCount: 0,
        lastAbsentAt: new Date('2024-01-02'),
      },
    ])

    return NextResponse.json({
      message: '示例学生、成绩和出勤数据已生成',
      students: [
        {
          id: student._id,
          username: student.username,
          studentId: student.studentId,
          name: student.name,
        },
        {
          id: student2._id,
          username: student2.username,
          studentId: student2.studentId,
          name: student2.name,
        },
      ],
    })
  } catch (error) {
    console.error('Seed 示例数据错误:', error)
    return NextResponse.json(
      {
        message: '生成示例数据失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


