import type { Warning, WarningLevel } from '../services/warnings'
import type { Grade } from '../services/grades'
import type { AttendanceRecord } from '../services/attendance'
import type { Intervention } from '../services/interventions'
import { canonicalInterventionStatusClient } from '../services/interventions'

export type LearningSuggestionItem = {
  key: string
  icon: string
  text: string
}

const LEVEL_ORDER: Record<WarningLevel, number> = { low: 1, medium: 2, high: 3 }

/** 当前预警集合中的最高等级；无预警为 null */
export function highestWarningLevel(warnings: Warning[]): WarningLevel | null {
  if (warnings.length === 0) return null
  let max: WarningLevel = 'low'
  for (const w of warnings) {
    if (LEVEL_ORDER[w.level] > LEVEL_ORDER[max]) max = w.level
  }
  return max
}

/** 是否挂科：期末/平时成绩低于 60 */
export function isFailingGrade(g: Grade): boolean {
  return typeof g.score === 'number' && g.score < 60
}

function trimDesc(s: string, max = 120): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/** 根据类型与描述生成面向学生的干预提示语 */
function interventionStudentHint(iv: Intervention): string {
  const type = iv.type || '学习干预'
  const desc = trimDesc(iv.description, 100)
  const combined = `${type} ${desc}`
  if (/心理|情绪|咨询|辅导/.test(combined)) {
    return `老师已关注你的心理健康相关事项（${type}），请积极配合并完成约定内容。说明：${desc}`
  }
  if (/作弊|违纪|诚信|考试纪律|考场/.test(combined)) {
    return `老师已就纪律与诚信教育进行干预（${type}）。请严格遵守校规校纪，诚信考试。说明：${desc}`
  }
  if (/出勤|缺勤|考勤/.test(combined)) {
    return `老师已针对出勤情况进行提醒（${type}）。请按时到课，减少缺勤。说明：${desc}`
  }
  return `老师已为你安排干预：${type}。${desc}`
}

function interventionIsShown(iv: Intervention): boolean {
  const s = canonicalInterventionStatusClient(iv.status)
  return s !== 'revoked'
}

/**
 * 组装学习建议列表（顺序：总览等级 → 课程/学分预警明细 → 挂科科目 → 出勤 → 老师干预）
 */
export function buildLearningSuggestions(input: {
  warnings: Warning[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  interventions: Intervention[]
}): LearningSuggestionItem[] {
  const { warnings, grades, attendance, interventions } = input
  const items: LearningSuggestionItem[] = []
  const top = highestWarningLevel(warnings)

  if (!top) {
    items.push({
      key: 'band-none',
      icon: '✅',
      text: '当前无学业预警。请保持学习节奏，定期查看成绩与学分进度，遇困难及时向老师或辅导员沟通。',
    })
  } else if (top === 'low') {
    items.push({
      key: 'band-low',
      icon: '📌',
      text: '存在低危预警：请关注相关课程与学分，适当增加复习与练习，避免问题升级。',
    })
  } else if (top === 'medium') {
    items.push({
      key: 'band-medium',
      icon: '⚡',
      text: '存在中危预警：建议制定学习计划，主动联系任课教师或辅导员，必要时申请学业辅导。',
    })
  } else {
    items.push({
      key: 'band-high',
      icon: '🚨',
      text: '存在高危预警：请优先处理学业风险，尽快向学院或辅导员求助，可申请一对一辅导，避免问题累积影响毕业。',
    })
  }

  // 成绩类预警：按课程点名加强学习
  const gradeWarnings = warnings.filter((w) => w.type === 'grade')
  for (const w of gradeWarnings) {
    const levelHint =
      w.level === 'high'
        ? '务必优先补强'
        : w.level === 'medium'
          ? '建议重点加强'
          : '建议适当加强'
    const scorePart =
      typeof w.score === 'number' ? `（当前记录分数约 ${w.score}）` : ''
    const absentPart =
      typeof w.absentCount === 'number' && w.absentCount > 0
        ? `；该课程缺勤 ${w.absentCount} 次，请保证出勤。`
        : ''
    items.push({
      key: `warn-grade-${w._id}`,
      icon: '📖',
      text: `${levelHint}「${w.course}」的学习${scorePart}${absentPart}`,
    })
  }

  // 学期/总学分预警
  for (const w of warnings.filter((x) => x.type === 'credit_semester' || x.type === 'credit_total')) {
    const scope = w.type === 'credit_semester' ? '学期学分' : '总学分'
    const earned =
      typeof w.earnedCredits === 'number' ? `当前获得约 ${w.earnedCredits} 学分。` : ''
    const termPart =
      w.type === 'credit_semester' && (w.term || w.course)
        ? `（学期：${w.term || w.course}）`
        : w.type === 'credit_total'
          ? '（累计学分）'
          : ''
    items.push({
      key: `warn-credit-${w._id}`,
      icon: '📊',
      text: `${scope}预警${termPart}（${w.level === 'high' ? '高危' : w.level === 'medium' ? '中危' : '低危'}）：${earned}请核对培养方案，合理选课并按时修读。`,
    })
  }

  // 挂科（成绩库中 <60），避免与成绩预警完全重复文案时仍列出挂科科目
  const failed = grades.filter(isFailingGrade)
  const warnedCourses = new Set(gradeWarnings.map((w) => w.course))
  for (const g of failed) {
    if (warnedCourses.has(g.course)) continue
    items.push({
      key: `fail-${g._id}`,
      icon: '❗',
      text: `「${g.course}」成绩未达及格线（挂科风险/已挂科），请加强该科目学习，关注补考或重修安排。`,
    })
  }

  // 出勤：缺勤较多的课程
  for (const r of attendance) {
    if (r.absentCount >= 2) {
      items.push({
        key: `att-${r._id}`,
        icon: '⏰',
        text: `「${r.course}」缺勤 ${r.absentCount} 次，请重视出勤，按时到课以免影响平时成绩。`,
      })
    }
  }

  // 成绩预警里带 absentCount 的补充（若上面成绩预警已写 absent 可略重复，这里只处理仅有 absent、课程在预警但想强调）
  // 老师干预（未撤销）
  const ivs = interventions.filter(interventionIsShown).slice(0, 8)
  for (const iv of ivs) {
    items.push({
      key: `iv-${iv._id}`,
      icon: '🤝',
      text: interventionStudentHint(iv),
    })
  }

  return items
}
