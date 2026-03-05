import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Grade from '@/models/Grade'
import Attendance from '@/models/Attendance'
import Warning from '@/models/Warning'

// 开发环境 Seed 接口：生成 30 名学生及教职工、成绩、出勤、预警示例数据
// 调用方式：POST http://localhost:3000/api/dev/seed-demo
// 登录：学生用学号 20240001~20240030，教职工用工号 T001，密码均为 123456

// 男生 15 个 + 女生 15 个
const STUDENT_NAMES = [
  '陈宇轩', '李浩宇', '王嘉豪', '张子轩', '刘泽宇', '杨博文', '黄俊豪', '吴子涵', '周浩然', '徐文杰',
  '孙铭泽', '马天宇', '朱俊宇', '胡梓晨', '林辰宇',
  '李雨桐', '王若曦', '张欣怡', '刘思彤', '陈雨萱', '杨梓涵', '黄诗琪', '吴佳怡', '周语桐', '徐梦瑶',
  '孙雅萱', '马语彤', '朱欣悦', '胡雨欣', '林一诺',
]

export async function POST() {
  try {
    await connectDB()

    // 示例教职工
    let staff = await User.findOne({
      $or: [{ staffId: 'T001' }, { username: 'demo_teacher' }],
      role: { $in: ['staff', 'admin'] },
    })
    if (!staff) {
      staff = await User.create({
        username: 'demo_teacher',
        email: 'demo_teacher@example.com',
        password: '123456',
        role: 'staff',
        staffId: 'T001',
        name: '王老师',
      })
    }

    // 创建 30 名学生
    const students: any[] = []
    const studentIds: string[] = []

    for (let i = 0; i < 30; i++) {
      const studentId = `202400${String(i + 1).padStart(2, '0')}`
      let student = await User.findOne({
        $or: [{ studentId }, { username: `demo_student_${i + 1}` }],
        role: 'student',
      })
      if (!student) {
        student = await User.create({
          username: `demo_student_${i + 1}`,
          email: `demo_student_${i + 1}@example.com`,
          password: '123456',
          role: 'student',
          studentId,
          name: STUDENT_NAMES[i],
        })
      } else {
        if (!student.studentId) {
          student.studentId = studentId
        }
        if (student.name !== STUDENT_NAMES[i]) {
          student.name = STUDENT_NAMES[i]
        }
        if (student.isModified()) await student.save()
      }
      students.push(student)
      studentIds.push(student._id.toString())
    }

    const term1 = '2024-2025-1'
    const term2 = '2024-2025-2'
    const semesterCreditThreshold = 10
    const totalCreditThreshold = 20
    const gradeThreshold = 60
    const courses = [
      { name: '计算机基础', credits: 3 },
      { name: 'Web 前端设计', credits: 4 },
      { name: '软件测试', credits: 3 },
      { name: '计算机网络', credits: 4 },
      { name: 'Linux 操作系统', credits: 4 },
      { name: '区块链 NFT 开发', credits: 4 },
      { name: '微服务架构开发', credits: 4 },
      { name: '人工智能驱动的区块链项目实践', credits: 4 },
    ]

    await Grade.deleteMany({ studentId: { $in: studentIds } })
    await Attendance.deleteMany({ studentId: { $in: studentIds } })
    await Warning.deleteMany({ studentId: { $in: studentIds } })

    // 生成成绩：控制结构以满足三种预警的数据条件
    // 成绩预警：需有 score<60 且 attendance；学期学分预警：term1  earned<10；总学分预警：total earned<20
    const grades: any[] = []
    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      const sid = student._id.toString()
      const numCourses = 4 + Math.floor(Math.random() * 3)
      const usedCourses = new Set<number>()
      for (let j = 0; j < numCourses; j++) {
        let idx = Math.floor(Math.random() * courses.length)
        while (usedCourses.has(idx)) idx = (idx + 1) % courses.length
        usedCourses.add(idx)
        const course = courses[idx]
        const term = j % 2 === 0 ? term1 : term2
        let score: number
        if (i < 10 && j === 0) {
          score = 40 + Math.floor(Math.random() * 25) // 低分→成绩预警
        } else if (i < 15) {
          // 学生 10-14：term1 多门不及格，学期学分<10
          score = term === term1 ? 40 + Math.floor(Math.random() * 25) : 70 + Math.floor(Math.random() * 25)
        } else if (i < 25) {
          // 学生 15-24：多数不及格，总学分<20
          score = Math.random() < 0.65 ? 35 + Math.floor(Math.random() * 22) : 72 + Math.floor(Math.random() * 23)
        } else {
          score = 60 + Math.floor(Math.random() * 38)
        }
        grades.push({
          studentId: sid,
          studentName: student.name,
          course: course.name,
          score,
          credits: course.credits,
          examType: ['midterm', 'final', 'regular'][j % 3],
          term,
        })
      }
    }
    await Grade.insertMany(grades)

    // 出勤：每门有成绩的课程都有考勤
    const attendances: any[] = []
    const gradeKeys = new Set<string>()
    for (const g of grades) {
      const key = `${g.studentId}::${g.course}`
      if (gradeKeys.has(key)) continue
      gradeKeys.add(key)
      attendances.push({
        studentId: g.studentId,
        studentName: g.studentName,
        course: g.course,
        absentCount: Math.floor(Math.random() * 6),
        lastAbsentAt: new Date('2024-01-' + String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')),
      })
    }
    await Attendance.insertMany(attendances)

    // 计算每学生每学期学分、总学分（与后端逻辑一致：及格>=60 才计学分）
    const bestByKey = new Map<string, { score: number; credits: number }>()
    for (const g of grades) {
      const key = `${g.studentId}::${g.course}::${g.term}`
      const credits = g.credits ?? 2
      const existing = bestByKey.get(key)
      if (!existing || g.score > existing.score) bestByKey.set(key, { score: g.score, credits })
    }
    const termCreditsByStudent = new Map<string, number>()
    const totalCreditsByStudent = new Map<string, number>()
    for (const [key, { score, credits }] of Array.from(bestByKey)) {
      if (score < 60) continue
      const [sid, , term] = key.split('::')
      termCreditsByStudent.set(`${sid}::${term}`, (termCreditsByStudent.get(`${sid}::${term}`) || 0) + credits)
      totalCreditsByStudent.set(sid, (totalCreditsByStudent.get(sid) || 0) + credits)
    }

    const minScoreByKey = new Map<string, { score: number; studentName: string }>()
    for (const g of grades) {
      const key = `${g.studentId}::${g.course}`
      const existing = minScoreByKey.get(key)
      if (!existing || g.score < existing.score) minScoreByKey.set(key, { score: g.score, studentName: g.studentName })
    }
    const absentByKey = new Map<string, number>()
    for (const a of attendances) {
      absentByKey.set(`${a.studentId}::${a.course}`, a.absentCount)
    }

    const warnings: any[] = []

    // 成绩预警：低分+考勤
    const lowScoreCandidates: { studentId: string; studentName: string; course: string; score: number; absentCount: number }[] = []
    for (const [key, { score, studentName }] of Array.from(minScoreByKey)) {
      if (score >= gradeThreshold) continue
      const absentCount = absentByKey.get(key)
      if (absentCount == null) continue
      const [sid, course] = key.split('::')
      lowScoreCandidates.push({ studentId: sid, studentName, course, score, absentCount })
    }
    const usedGradeKeys = new Set<string>()
    for (const c of lowScoreCandidates) {
      if (warnings.filter((w) => w.type === 'grade').length >= 10) break
      const key = `${c.studentId}::${c.course}`
      if (usedGradeKeys.has(key)) continue
      usedGradeKeys.add(key)
      warnings.push({
        studentId: c.studentId,
        studentName: c.studentName,
        type: 'grade',
        level: 'high',
        course: c.course,
        message: `课程【${c.course}】成绩 ${c.score} 分低于预警阈值 ${gradeThreshold} 分，缺勤 ${c.absentCount} 次，请及时关注学生学习情况。`,
        createdBy: staff._id.toString(),
        createdByName: staff.name,
      })
    }

    // 学期学分预警：仅该学期学分 < 10 的学生
    const semesterCreditsCandidates: { studentId: string; studentName: string; term: string; earned: number }[] = []
    for (const student of students) {
      const sid = student._id.toString()
      const earned = termCreditsByStudent.get(`${sid}::${term1}`) ?? 0
      if (earned < semesterCreditThreshold && earned >= 0) {
        semesterCreditsCandidates.push({ studentId: sid, studentName: student.name, term: term1, earned })
      }
    }
    const usedSemester = new Set<string>()
    for (const c of semesterCreditsCandidates) {
      if (warnings.filter((w) => w.type === 'credit_semester').length >= 10) break
      if (usedSemester.has(c.studentId)) continue
      usedSemester.add(c.studentId)
      warnings.push({
        studentId: c.studentId,
        studentName: c.studentName,
        type: 'credit_semester',
        level: 'medium',
        course: c.term,
        message: `学期学分（${c.term}）获得 ${c.earned} 学分，低于预警阈值 ${semesterCreditThreshold} 学分，请关注学生学业进度。`,
        createdBy: staff._id.toString(),
        createdByName: staff.name,
      })
    }

    // 总学分预警：仅总学分 < 20 的学生
    const totalCreditsCandidates: { studentId: string; studentName: string; earned: number }[] = []
    for (const student of students) {
      const sid = student._id.toString()
      const earned = totalCreditsByStudent.get(sid) ?? 0
      if (earned < totalCreditThreshold && earned >= 0) {
        totalCreditsCandidates.push({ studentId: sid, studentName: student.name, earned })
      }
    }
    const usedTotal = new Set<string>()
    for (const c of totalCreditsCandidates) {
      if (warnings.filter((w) => w.type === 'credit_total').length >= 10) break
      if (usedTotal.has(c.studentId)) continue
      usedTotal.add(c.studentId)
      warnings.push({
        studentId: c.studentId,
        studentName: c.studentName,
        type: 'credit_total',
        level: 'high',
        course: '总学分',
        message: `累计获得 ${c.earned} 学分，低于毕业所需 ${totalCreditThreshold} 学分，请关注学生学业进度。`,
        createdBy: staff._id.toString(),
        createdByName: staff.name,
      })
    }

    await Warning.insertMany(warnings)

    return NextResponse.json({
      message: `已生成 30 名学生及教职工、成绩、出勤、预警数据。登录：学号 20240001~20240030 或工号 T001，密码 123456`,
      students: students.map((s) => ({ id: s._id, studentId: s.studentId, name: s.name })),
      staff: { id: staff._id, staffId: staff.staffId, name: staff.name },
      stats: { grades: grades.length, attendances: attendances.length, warnings: warnings.length },
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


