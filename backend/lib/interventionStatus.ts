/** 干预状态：创建后待学生处理 → 学生提交后待审核 → 审核通过已完成；待学生处理/待审核可撤销为已撤销 */
export const INTERVENTION_STATUSES = [
  'student_pending',
  'pending_review',
  'completed',
  'revoked',
  'pending',
  'in-progress',
  'cancelled',
] as const

export type InterventionStatusValue = (typeof INTERVENTION_STATUSES)[number]

/** 历史数据状态映射为当前 canonical 状态（仅用于展示与统计） */
export function canonicalInterventionStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'student_pending',
    'in-progress': 'pending_review',
    cancelled: 'revoked',
  }
  return map[status] || status
}

export function serializeIntervention<T extends { status?: string }>(doc: T): T {
  const status = doc.status ? canonicalInterventionStatus(doc.status) : doc.status
  return { ...doc, status } as T
}
