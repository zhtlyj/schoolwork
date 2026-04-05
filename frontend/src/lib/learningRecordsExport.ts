import type { AttendanceRecord } from '../services/attendance'
import type { Grade } from '../services/grades'
import type { Intervention } from '../services/interventions'
import { interventionStatusLabel } from '../services/interventions'
import { rowsToCsv } from './exportCsv'

function examTypeZh(type: string): string {
  switch (type) {
    case 'midterm':
      return '期中'
    case 'final':
      return '期末'
    case 'regular':
      return '平时'
    default:
      return type
  }
}

export function buildAttendanceCsv(records: AttendanceRecord[]): string {
  const headers = ['课程名称', '缺勤次数', '最近缺勤时间', '记录时间']
  const rows = records.map((r) => [
    r.course,
    r.absentCount,
    new Date(r.lastAbsentAt).toLocaleString('zh-CN'),
    new Date(r.createdAt).toLocaleString('zh-CN'),
  ])
  return rowsToCsv(headers, rows)
}

export function buildGradesCsv(grades: Grade[]): string {
  const headers = ['课程名称', '学期', '考试类型', '成绩', '学分', '记录时间']
  const rows = grades.map((g) => [
    g.course,
    g.term,
    examTypeZh(g.examType),
    g.score,
    g.credits ?? '',
    new Date(g.createdAt).toLocaleString('zh-CN'),
  ])
  return rowsToCsv(headers, rows)
}

export function buildInterventionsCsv(interventions: Intervention[]): string {
  const headers = [
    '类型',
    '状态',
    '描述',
    '干预计划',
    '完成情况说明',
    '提交时间',
    '审核结果',
    '审核意见',
    '创建时间',
    '链上交易哈希',
  ]
  const rows = interventions.map((i) => {
    const reviewText =
      i.reviewResult === 'pass' ? '通过' : i.reviewResult === 'fail' ? '不通过' : ''
    return [
      i.type,
      interventionStatusLabel(i.status),
      i.description,
      i.plan ?? '',
      i.notes ?? '',
      i.submittedAt ? new Date(i.submittedAt).toLocaleString('zh-CN') : '',
      reviewText,
      i.reviewOpinion ?? '',
      new Date(i.createdAt).toLocaleString('zh-CN'),
      i.blockHash ?? '',
    ]
  })
  return rowsToCsv(headers, rows)
}

/** 合并三块，便于 Excel 分块查看 */
export function buildFullLearningRecordsCsv(
  attendance: AttendanceRecord[],
  grades: Grade[],
  interventions: Intervention[]
): string {
  const parts: string[] = [
    '【出勤记录】',
    buildAttendanceCsv(attendance),
    '',
    '【成绩记录】',
    buildGradesCsv(grades),
    '',
    '【干预记录】',
    buildInterventionsCsv(interventions),
  ]
  return parts.join('\r\n')
}
