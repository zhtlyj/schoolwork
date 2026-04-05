import { useEffect, useMemo, useState } from 'react'
import type { Warning } from '../services/warnings'
import { gradeService } from '../services/grades'
import { attendanceService } from '../services/attendance'
import { interventionService } from '../services/interventions'
import { buildLearningSuggestions } from '../lib/studentLearningSuggestions'

export interface StudentLearningSuggestionsProps {
  /** 首页已拉取的预警列表（学生本人） */
  warnings: Warning[]
  warningsLoading?: boolean
}

export default function StudentLearningSuggestions({
  warnings,
  warningsLoading = false,
}: StudentLearningSuggestionsProps) {
  const [gradesLoading, setGradesLoading] = useState(true)
  const [attLoading, setAttLoading] = useState(true)
  const [ivLoading, setIvLoading] = useState(true)
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof gradeService.getGrades>>['grades']>([])
  const [attendance, setAttendance] = useState<
    Awaited<ReturnType<typeof attendanceService.getAttendance>>['records']
  >([])
  const [interventions, setInterventions] = useState<
    Awaited<ReturnType<typeof interventionService.getInterventions>>['interventions']
  >([])

  useEffect(() => {
    let cancelled = false
    setGradesLoading(true)
    void gradeService
      .getGrades({ page: 1, limit: 200 })
      .then((res) => {
        if (!cancelled) setGrades(res.grades)
      })
      .catch(() => {
        if (!cancelled) setGrades([])
      })
      .finally(() => {
        if (!cancelled) setGradesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setAttLoading(true)
    void attendanceService
      .getAttendance({ page: 1, limit: 200 })
      .then((res) => {
        if (!cancelled) setAttendance(res.records)
      })
      .catch(() => {
        if (!cancelled) setAttendance([])
      })
      .finally(() => {
        if (!cancelled) setAttLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setIvLoading(true)
    void interventionService
      .getInterventions({ page: 1, limit: 50 })
      .then((res) => {
        if (!cancelled) setInterventions(res.interventions)
      })
      .catch(() => {
        if (!cancelled) setInterventions([])
      })
      .finally(() => {
        if (!cancelled) setIvLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const suggestions = useMemo(
    () =>
      buildLearningSuggestions({
        warnings,
        grades,
        attendance,
        interventions,
      }),
    [warnings, grades, attendance, interventions]
  )

  const loading = warningsLoading || gradesLoading || attLoading || ivLoading

  return (
    <div className="section-card">
      <h2>学习建议</h2>
      <p className="form-hint" style={{ marginBottom: 12 }}>
        根据你的预警等级、成绩、出勤与老师干预记录自动生成，请结合「预警信息」「干预记录」查看详情。
      </p>
      {loading ? (
        <p className="form-hint">正在生成个性化建议…</p>
      ) : (
        <div className="suggestion-list">
          {suggestions.map((s) => (
            <div key={s.key} className="suggestion-item">
              <span className="suggestion-icon">{s.icon}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
