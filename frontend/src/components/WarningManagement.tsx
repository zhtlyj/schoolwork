import { useState, useEffect, useMemo } from 'react'
import { warningService, Warning, CreateWarningData, WarningCandidate, ManagementListItem } from '../services/warnings'
import { studentService, Student } from '../services/students'
import { gradeService } from '../services/grades'
import '../pages/Home.css'

export interface WarningSettings {
  gradeHigh: number
  gradeMedium: number
  gradeLow: number
  semesterHigh: number
  semesterMedium: number
  semesterLow: number
  totalHigh: number
  totalMedium: number
  totalLow: number
}

interface WarningManagementProps {
  warningSettings: WarningSettings
  typeFilter?: '' | 'grade' | 'credit_semester' | 'credit_total'
  onTypeFilterChange?: (v: '' | 'grade' | 'credit_semester' | 'credit_total') => void
}

// 预警管理组件（教职工/管理员：对学生下发预警 + 列表筛选 + 删除 + 一键生成）
export default function WarningManagement({
  warningSettings,
  typeFilter = '',
  onTypeFilterChange,
}: WarningManagementProps) {
  const {
    gradeHigh,
    gradeMedium,
    gradeLow,
    semesterHigh,
    semesterMedium,
    semesterLow,
    totalHigh,
    totalMedium,
    totalLow,
  } = warningSettings
  const [managementItems, setManagementItems] = useState<ManagementListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [mode, setMode] = useState<'manual' | 'auto'>('manual')

  const [filters, setFilters] = useState<{
    studentId: string
    type: '' | 'grade' | 'credit_semester' | 'credit_total'
    level: '' | 'low' | 'medium' | 'high'
    course: string
  }>({ studentId: '', type: '', level: '', course: '' })
  const [studentSearchInput, setStudentSearchInput] = useState('')
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWarningId, setEditingWarningId] = useState<string | null>(null)
  const [createData, setCreateData] = useState<CreateWarningData>({
    studentId: '',
    type: 'grade',
    level: 'medium',
    course: '',
    message: '',
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 成功提示自动消失
  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(timer)
  }, [success])

  // 下发预警弹窗：成绩预警时的课程下拉、学分预警时的学期下拉（从成绩表获取）
  const [createCourseOptions, setCreateCourseOptions] = useState<string[]>([])
  const [createTermOptions, setCreateTermOptions] = useState<string[]>([])

  const fetchStudents = async () => {
    try {
      const res = await studentService.getStudents({ page: 1, limit: 200 })
      setStudents(res.students)
    } catch {
      // 学生列表失败不阻塞预警管理
    }
  }

  const fetchManagementList = async () => {
    if (mode !== 'manual') return
    setLoading(true)
    setError('')
    try {
      const res = await warningService.getManagementList({
        page,
        limit: pageSize,
        studentId: filters.studentId || undefined,
        type: (filters.type || undefined) as any,
        level: (filters.level || undefined) as any,
        course: filters.course || undefined,
        gradeHigh,
        gradeMedium,
        gradeLow,
        semesterHigh,
        semesterMedium,
        semesterLow,
        totalHigh,
        totalMedium,
        totalLow,
      })
      setManagementItems(res.items)
      setTotalPages(res.pagination.totalPages)
      setTotalCount(res.pagination.total)
    } catch (err: any) {
      setError(err.response?.data?.message || '获取预警列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    if (mode === 'manual') {
      setFilters({ studentId: '', type: typeFilter || '', level: '', course: '' })
      setPage(1)
      setPageSize(10)
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'manual') {
      setFilters((p) => ({ ...p, type: typeFilter || '', course: '' }))
      setPage(1)
    }
  }, [mode, typeFilter])

  useEffect(() => {
    fetchManagementList()
  }, [mode, page, pageSize, filters.studentId, filters.type, filters.level, filters.course, warningSettings])

  const resetFilters = () => {
    setFilters({ studentId: '', type: '', level: '', course: '' })
    setStudentSearchInput('')
    setStudentDropdownOpen(false)
    setPage(1)
    onTypeFilterChange?.('')
  }

  // 获取课程/学期选项（用于子筛选项）
  const [courseOptions, setCourseOptions] = useState<string[]>([])
  useEffect(() => {
    if ((!filters.type && !typeFilter) || (filters.type !== 'grade' && filters.type !== 'credit_semester')) return
    const fetchCourses = async () => {
      try {
        const type = filters.type || typeFilter
        if (type === 'grade') {
          const res = await gradeService.getCourses()
          setCourseOptions(res.courses || [])
        } else if (type === 'credit_semester') {
          const res = await gradeService.getTerms()
          setCourseOptions(res.terms || [])
        } else {
          setCourseOptions([])
        }
      } catch {
        setCourseOptions([])
      }
    }
    fetchCourses()
  }, [mode, filters.type, typeFilter])

  const openCreate = (prefill?: Warning | ManagementListItem) => {
    setError('')
    setSuccess('')
    const editId = (prefill as Warning)?._id ?? (prefill as ManagementListItem)?.issuedWarningId ?? null
    setEditingWarningId(editId)
    setCreateData(prefill ? {
      studentId: prefill.studentId,
      type: prefill.type,
      level: prefill.level,
      course: prefill.course,
      message: prefill.message,
    } : {
      studentId: '',
      type: 'grade',
      level: 'medium',
      course: '',
      message: '',
    })
    setShowCreateModal(true)
    Promise.all([
      gradeService.getCourses().then((r) => r.courses).catch(() => []),
      gradeService.getTerms().then((r) => r.terms).catch(() => []),
    ]).then(([courses, terms]) => {
      setCreateCourseOptions(courses)
      setCreateTermOptions(terms)
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      if (editingWarningId) {
        await warningService.updateWarning(editingWarningId, {
          type: createData.type,
          level: createData.level,
          course: createData.course,
          message: createData.message,
        })
        setShowCreateModal(false)
        setEditingWarningId(null)
        setSuccess('已经下发预警')
      } else {
        await warningService.createWarning(createData)
        setShowCreateModal(false)
        setSuccess('已成功下发预警')
      }
      setPage(1)
      fetchManagementList()
    } catch (err: any) {
      setError(err.response?.data?.message || '下发预警失败')
    }
  }

  const handleCancelWarning = async (w: { _id: string; studentName: string }) => {
    setError('')
    setSuccess('')
    const ok = window.confirm(`确定取消对【${w.studentName}】的预警吗？此操作不可恢复。`)
    if (!ok) return
    try {
      await warningService.deleteWarning(w._id)
      setSuccess('已取消预警')
      fetchManagementList()
    } catch (err: any) {
      setError(err.response?.data?.message || '取消预警失败')
    }
  }

  // 一键生成模式：预警候选学生列表
  const [candidates, setCandidates] = useState<WarningCandidate[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  // 在"一键生成"模式下，获取达到预警条件的学生列表（根据筛选项）
  useEffect(() => {
    const fetchCandidates = async () => {
      if (mode !== 'auto') {
        setCandidates([])
        return
      }
      setCandidatesLoading(true)
      setError('')
      try {
        const res = await warningService.getWarningCandidates({
          type: (filters.type || undefined) as any,
          gradeHigh,
          gradeMedium,
          gradeLow,
          semesterHigh,
          semesterMedium,
          semesterLow,
          totalHigh,
          totalMedium,
          totalLow,
        })
        setCandidates(res.candidates)
      } catch (err: any) {
        setError(err.response?.data?.message || '获取预警候选学生列表失败')
      } finally {
        setCandidatesLoading(false)
      }
    }

    fetchCandidates()
  }, [mode, filters.type, warningSettings])

  // 一键生成：根据筛选项过滤后的候选列表（用于判断是否为空、用于渲染）
  const filteredCandidatesForAuto = useMemo(() => {
    return candidates.filter((c) => {
      if (filters.studentId && c.studentId !== filters.studentId) return false
      const showGrade = !filters.type || filters.type === 'grade'
      const showSemester = !filters.type || filters.type === 'credit_semester'
      const showTotal = !filters.type || filters.type === 'credit_total'
      let gw = c.gradeWarnings
      let sc = c.creditWarnings?.filter((x) => x.scope === 'semester') ?? []
      let tc = c.creditWarnings?.filter((x) => x.scope === 'total') ?? []
      if (filters.level) {
        gw = gw.filter((g) => g.level === filters.level)
        sc = sc.filter((x) => x.level === filters.level)
        tc = tc.filter((x) => x.level === filters.level)
      }
      if (filters.course && filters.type === 'grade') gw = gw.filter((g) => g.course === filters.course)
      if (filters.course && filters.type === 'credit_semester') sc = sc.filter((x) => x.term === filters.course)
      return (showGrade && gw.length > 0) || (showSemester && sc.length > 0) || (showTotal && tc.length > 0)
    })
  }, [candidates, filters.studentId, filters.type, filters.level, filters.course])

  // 从候选学生列表中下发预警
  const handleGenerateFromCandidateGrade = async (
    studentId: string,
    course: string,
    score: number,
    examType: string,
    term: string,
    level: 'high' | 'medium' | 'low'
  ) => {
    const examTypeText = examType === 'final' ? '期末' : examType === 'midterm' ? '期中' : '平时'
    const threshold = score < gradeHigh ? gradeHigh : score < gradeMedium ? gradeMedium : gradeLow
    const message = `课程【${course}】${term}${examTypeText}考试成绩为 ${score} 分，低于预警阈值 ${threshold} 分，请及时关注学生学习情况。`

    setError('')
    setSuccess('')
    try {
      await warningService.createWarning({
        studentId,
        type: 'grade',
        level,
        course,
        message,
      })
      setSuccess('已成功下发成绩预警')
      fetchManagementList()
      const res = await warningService.getWarningCandidates({
        type: (filters.type || undefined) as any,
        gradeHigh,
        gradeMedium,
        gradeLow,
        semesterHigh,
        semesterMedium,
        semesterLow,
        totalHigh,
        totalMedium,
        totalLow,
      })
      setCandidates(res.candidates)
    } catch (err: any) {
      setError(err.response?.data?.message || '下发预警失败')
    }
  }

  const handleGenerateFromCandidateCredit = async (
    studentId: string,
    scope: 'semester' | 'total',
    earnedCredits: number,
    threshold: number,
    term: string | undefined,
    level: 'high' | 'medium' | 'low'
  ) => {
    const scopeText = scope === 'semester' ? '学期' : '累计'
    const courseText = scope === 'semester' && term ? `（${term}）` : ''
    const message = `${scopeText}学分${courseText}获得 ${earnedCredits} 学分，低于预警阈值 ${threshold} 学分，请关注学生学业进度。`

    setError('')
    setSuccess('')
    try {
      await warningService.createWarning({
        studentId,
        type: scope === 'total' ? 'credit_total' : 'credit_semester',
        level,
        course: scope === 'semester' && term ? term : '总学分',
        message,
      })
      setSuccess('已成功下发学分预警')
      fetchManagementList()
      const res = await warningService.getWarningCandidates({
        type: (filters.type || undefined) as any,
        gradeHigh,
        gradeMedium,
        gradeLow,
        semesterHigh,
        semesterMedium,
        semesterLow,
        totalHigh,
        totalMedium,
        totalLow,
      })
      setCandidates(res.candidates)
    } catch (err: any) {
      setError(err.response?.data?.message || '下发预警失败')
    }
  }

  return (
    <div className="page-content">
      {/* 筛选项：手动下发和一键生成共用 */}
      <div className="warning-filters warning-management-filters">
        <>
          {/* 公用筛选项：成绩、学期学分、总学分 */}
            <div className="filter-row filter-row-common">
              <span className="filter-label">类型</span>
              <div className="filter-options">
                <button
                  type="button"
                  className={`warning-mode-btn ${!filters.type ? 'active' : ''}`}
                  onClick={() => {
                    setPage(1)
                    setFilters((p) => ({ ...p, type: '', course: '' }))
                    onTypeFilterChange?.('')
                  }}
                >
                  全部
                </button>
                <button
                  type="button"
                  className={`warning-mode-btn ${filters.type === 'grade' ? 'active' : ''}`}
                  onClick={() => {
                    setPage(1)
                    setFilters((p) => ({ ...p, type: 'grade', course: '' }))
                    onTypeFilterChange?.('grade')
                  }}
                >
                  成绩预警
                </button>
                <button
                  type="button"
                  className={`warning-mode-btn ${filters.type === 'credit_semester' ? 'active' : ''}`}
                  onClick={() => {
                    setPage(1)
                    setFilters((p) => ({ ...p, type: 'credit_semester', course: '' }))
                    onTypeFilterChange?.('credit_semester')
                  }}
                >
                  学期学分预警
                </button>
                <button
                  type="button"
                  className={`warning-mode-btn ${filters.type === 'credit_total' ? 'active' : ''}`}
                  onClick={() => {
                    setPage(1)
                    setFilters((p) => ({ ...p, type: 'credit_total', course: '' }))
                    onTypeFilterChange?.('credit_total')
                  }}
                >
                  总学分预警
                </button>
              </div>
            </div>

            {/* 各类型子筛选项 */}
            <div className="filter-row filter-row-sub">
              <div className="filter-item student-search-filter">
                <label>学生</label>
                <div className="student-search-wrapper">
                  <input
                    type="text"
                    className="student-search-input"
                    placeholder="输入姓名或学号搜索"
                    value={studentDropdownOpen ? studentSearchInput : (filters.studentId ? `${students.find((s) => s.id === filters.studentId)?.name || ''}（${students.find((s) => s.id === filters.studentId)?.studentId || ''}）` : '')}
                    onChange={(e) => {
                      setStudentSearchInput(e.target.value)
                      setStudentDropdownOpen(true)
                      if (!e.target.value) {
                        setPage(1)
                        setFilters((p) => ({ ...p, studentId: '' }))
                      }
                    }}
                    onFocus={() => {
                      setStudentDropdownOpen(true)
                      if (filters.studentId) setStudentSearchInput('')
                    }}
                    onBlur={() => setTimeout(() => setStudentDropdownOpen(false), 150)}
                  />
                  {studentDropdownOpen && (
                    <div className="student-search-dropdown">
                      <div
                        className="student-search-option"
                        onClick={() => {
                          setPage(1)
                          setFilters((p) => ({ ...p, studentId: '' }))
                          setStudentSearchInput('')
                          setStudentDropdownOpen(false)
                        }}
                      >
                        全部学生
                      </div>
                      {students
                        .filter((s) => !studentSearchInput || `${s.name}${s.studentId}`.toLowerCase().includes(studentSearchInput.toLowerCase()))
                        .slice(0, 8)
                        .map((s) => (
                          <div
                            key={s.id}
                            className="student-search-option"
                            onClick={() => {
                              setPage(1)
                              setFilters((p) => ({ ...p, studentId: s.id }))
                              setStudentSearchInput('')
                              setStudentDropdownOpen(false)
                            }}
                          >
                            {s.name}（{s.studentId}）
                          </div>
                        ))}
                      {studentSearchInput && students.filter((s) => `${s.name}${s.studentId}`.toLowerCase().includes(studentSearchInput.toLowerCase())).length === 0 && (
                        <div className="student-search-option student-search-empty">无匹配学生</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {(filters.type === 'grade' || filters.type === 'credit_semester') && courseOptions.length > 0 && (
                <div className="filter-item">
                  <label>{filters.type === 'grade' ? '课程' : '学期'}</label>
                  <select
                    value={filters.course}
                    onChange={(e) => {
                      setPage(1)
                      setFilters((p) => ({ ...p, course: e.target.value }))
                    }}
                  >
                    <option value="">全部</option>
                    {courseOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="filter-item">
                <label>级别</label>
                <select
                  value={filters.level}
                  onChange={(e) => {
                    setPage(1)
                    setFilters((p) => ({ ...p, level: e.target.value as any }))
                  }}
                >
                  <option value="">全部级别</option>
                  <option value="high">高危</option>
                  <option value="medium">中危</option>
                  <option value="low">低危</option>
                </select>
              </div>
              {mode === 'manual' && (
                <div className="filter-item">
                  <label>每页显示</label>
                  <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)) }}>
                    <option value="10">10 条</option>
                    <option value="20">20 条</option>
                    <option value="50">50 条</option>
                    <option value="100">100 条</option>
                  </select>
                </div>
              )}
              {(filters.studentId || filters.type || filters.level || filters.course) && (
                <div className="filter-item" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn-secondary" onClick={resetFilters} style={{ padding: '10px 16px' }}>
                    🔄 重置筛选
                  </button>
                </div>
              )}
            </div>
          </>
      </div>

      <div className="students-header">
        <h2 className="page-title">⚠️ 预警管理</h2>
        <div className="warning-modes">
          <button
            className={`warning-mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            ✍ 手动下发
          </button>
          <button
            className={`warning-mode-btn ${mode === 'auto' ? 'active' : ''}`}
            onClick={() => setMode('auto')}
          >
            ⚡ 一键生成
          </button>
          {mode === 'manual' && (
            <button className="btn-primary" onClick={openCreate}>
              ➕ 下发预警
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {success && (
        <div className="modal-overlay success-toast-overlay" onClick={() => setSuccess('')}>
          <div className="success-toast-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-toast-icon">✓</div>
            <div className="success-toast-message">{success}</div>
          </div>
        </div>
      )}

      {/* 一键生成区域（仅在 auto 模式下显示） */}
      {mode === 'auto' && (
        <div className="auto-warning-section">
          <div className="info-card" style={{ marginBottom: '20px' }}>
            <p>
              系统已根据规则自动筛选出达到预警条件的学生。成绩：高危&lt;{gradeHigh}分、中危&lt;{gradeMedium}分、低危&lt;{gradeLow}分；学期学分：高危&lt;{semesterHigh}、中危&lt;{semesterMedium}、低危&lt;{semesterLow}；总学分：高危&lt;{totalHigh}、中危&lt;{totalMedium}、低危&lt;{totalLow}。
            </p>
          </div>

          {candidatesLoading ? (
            <div className="loading-state">加载中...</div>
          ) : candidates.filter((c) => !filters.studentId || c.studentId === filters.studentId).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <p>{(filters.studentId || filters.type || filters.level || filters.course) ? '当前筛选条件下暂无数据' : '暂无达到预警条件的学生'}</p>
              {(filters.studentId || filters.type || filters.level || filters.course) && (
                <button className="btn-secondary" onClick={resetFilters} style={{ marginTop: 12 }}>
                  🔄 重置筛选
                </button>
              )}
            </div>
          ) : (
            <div className="candidates-list">
              {candidates
                .filter((c) => !filters.studentId || c.studentId === filters.studentId)
                .map((candidate) => {
                // 根据类型筛选显示
                const showGradeWarnings = !filters.type || filters.type === 'grade'
                const showSemesterCreditWarnings = !filters.type || filters.type === 'credit_semester'
                const showTotalCreditWarnings = !filters.type || filters.type === 'credit_total'
                let gradeWarnings = candidate.gradeWarnings
                let semesterCredits = candidate.creditWarnings?.filter((c) => c.scope === 'semester') ?? []
                let totalCredits = candidate.creditWarnings?.filter((c) => c.scope === 'total') ?? []
                if (filters.level) {
                  gradeWarnings = gradeWarnings.filter((g) => g.level === filters.level)
                  semesterCredits = semesterCredits.filter((c) => c.level === filters.level)
                  totalCredits = totalCredits.filter((c) => c.level === filters.level)
                }
                if (filters.course && filters.type === 'grade') {
                  gradeWarnings = gradeWarnings.filter((g) => g.course === filters.course)
                }
                if (filters.course && filters.type === 'credit_semester') {
                  semesterCredits = semesterCredits.filter((c) => c.term === filters.course)
                }
                const hasGradeWarnings = gradeWarnings.length > 0 && showGradeWarnings
                const hasSemesterCreditWarnings = semesterCredits.length > 0 && showSemesterCreditWarnings
                const hasTotalCreditWarnings = totalCredits.length > 0 && showTotalCreditWarnings

                if (!hasGradeWarnings && !hasSemesterCreditWarnings && !hasTotalCreditWarnings) {
                  return null
                }

                return (
                  <div key={candidate.studentId} className="candidate-card">
                    <div className="candidate-header">
                      <div className="candidate-student">
                        <span className="candidate-name">{candidate.studentName}</span>
                        <span className="candidate-id">（{candidate.studentIdNumber}）</span>
                      </div>
                    </div>

                    <div className="candidate-warnings">
                      {hasGradeWarnings && (
                        <div className="warning-group">
                          <h4 className="warning-group-title">📝 成绩预警（{gradeWarnings.length}项）</h4>
                          <div className="warning-items">
                            {gradeWarnings.map((gw, idx) => {
                              const examTypeText =
                                gw.examType === 'final' ? '期末' : gw.examType === 'midterm' ? '期中' : '平时'
                              return (
                                <div key={idx} className="warning-item">
                                  <div className="warning-item-info">
                                    <span className="warning-course">{gw.course}</span>
                                    <span className="warning-meta">
                                      {gw.term} {examTypeText} | {gw.score} 分
                                    </span>
                                  </div>
                                  <button
                                    className="btn-primary btn-small"
                                    onClick={() =>
                                      handleGenerateFromCandidateGrade(
                                        candidate.studentId,
                                        gw.course,
                                        gw.score,
                                        gw.examType,
                                        gw.term,
                                        gw.level
                                      )
                                    }
                                  >
                                    下发预警
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {hasSemesterCreditWarnings && (
                        <div className="warning-group">
                          <h4 className="warning-group-title">
                            📚 学期学分预警（{semesterCredits.length}项）
                          </h4>
                          <div className="warning-items">
                            {semesterCredits.map((cw, idx) => (
                              <div key={idx} className="warning-item">
                                <div className="warning-item-info">
                                  <span className="warning-course">
                                    学期学分（{cw.term}）
                                  </span>
                                  <span className="warning-meta">
                                    获得 {cw.earnedCredits} 学分，低于阈值 {cw.threshold} 学分
                                  </span>
                                </div>
                                <button
                                  className="btn-primary btn-small"
                                  onClick={() =>
                                    handleGenerateFromCandidateCredit(
                                      candidate.studentId,
                                      cw.scope,
                                      cw.earnedCredits,
                                      cw.threshold,
                                      cw.term,
                                      cw.level
                                    )
                                  }
                                >
                                  下发预警
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {hasTotalCreditWarnings && (
                        <div className="warning-group">
                          <h4 className="warning-group-title">
                            📚 总学分预警（{totalCredits.length}项）
                          </h4>
                          <div className="warning-items">
                            {totalCredits.map((cw, idx) => (
                              <div key={idx} className="warning-item">
                                <div className="warning-item-info">
                                  <span className="warning-course">总学分</span>
                                  <span className="warning-meta">
                                    获得 {cw.earnedCredits} 学分，低于阈值 {cw.threshold} 学分
                                  </span>
                                </div>
                                <button
                                  className="btn-primary btn-small"
                                  onClick={() =>
                                    handleGenerateFromCandidateCredit(
                                      candidate.studentId,
                                      cw.scope,
                                      cw.earnedCredits,
                                      cw.threshold,
                                      cw.term,
                                      cw.level
                                    )
                                  }
                                >
                                  下发预警
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 预警列表区域（仅在手动模式下显示） */}
      {mode === 'manual' && (
        <>
          {loading ? (
            <div className="loading-state">加载中...</div>
          ) : managementItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <p>暂无达到预警条件的学生</p>
              {(filters.studentId || filters.type || filters.level) && (
                <p style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                  当前筛选条件下暂无数据，请尝试调整筛选条件或{' '}
                  <button
                    onClick={resetFilters}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#667eea',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    重置筛选
                  </button>
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="students-table-container warning-management-table-wrap">
                <table className="students-table warning-management-table">
                  <thead>
                    <tr>
                      <th>学生</th>
                      <th>类型</th>
                      <th>级别</th>
                      {filters.type === 'grade' ? (
                        <>
                          <th>课程</th>
                          <th>考勤次数</th>
                          <th>分数</th>
                          <th>内容</th>
                          <th>学期时间</th>
                        </>
                      ) : filters.type === 'credit_semester' ? (
                        <>
                          <th>该学期学分</th>
                          <th>该学期需要学分</th>
                          <th>学期</th>
                        </>
                      ) : filters.type === 'credit_total' ? (
                        <>
                          <th>总学分</th>
                          <th>需要的毕业学分</th>
                        </>
                      ) : (
                        <>
                          <th>课程/学期</th>
                          {managementItems.some((w2) => w2.type === 'grade') && (
                            <>
                              <th>考勤次数</th>
                              <th>分数</th>
                            </>
                          )}
                          <th>内容</th>
                          <th>学期时间</th>
                        </>
                      )}
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managementItems.map((w) => (
                      <tr key={w.issuedWarningId || `${w.studentId}-${w.type}-${w.course}`}>
                        <td>{w.studentName}</td>
                        <td>
                          <span
                            className="warning-type-badge"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              background:
                                w.type === 'grade'
                                  ? '#e3f2fd'
                                  : w.type === 'credit_semester'
                                  ? '#e8f5e9'
                                  : '#e3f2fd',
                              color:
                                w.type === 'grade'
                                  ? '#1976d2'
                                  : w.type === 'credit_semester'
                                  ? '#2e7d32'
                                  : '#1565c0',
                            }}
                          >
                            {w.type === 'grade' ? '成绩预警' : w.type === 'credit_semester' ? '学期学分' : w.type === 'credit_total' ? '总学分' : ''}
                          </span>
                        </td>
                        <td>
                          <span
                            className="warning-level-badge"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background:
                                w.level === 'high'
                                  ? '#ffebee'
                                  : w.level === 'medium'
                                  ? '#fff3e0'
                                  : '#e8f5e9',
                              color:
                                w.level === 'high'
                                  ? '#c62828'
                                  : w.level === 'medium'
                                  ? '#e65100'
                                  : '#2e7d32',
                            }}
                          >
                            {w.level === 'high' ? '高危' : w.level === 'medium' ? '中危' : '低危'}
                          </span>
                        </td>
                        {filters.type === 'grade' ? (
                          <>
                            <td>{w.course}</td>
                            <td>{w.absentCount != null ? `${w.absentCount} 次` : '—'}</td>
                            <td>{w.score != null ? `${w.score} 分` : '—'}</td>
                            <td className="warning-message-cell" title={w.message}>{w.message}</td>
                            <td>{w.term ?? '—'}</td>
                          </>
                        ) : filters.type === 'credit_semester' ? (
                          <>
                            <td>{w.earnedCredits != null ? `${w.earnedCredits} 学分` : '—'}</td>
                            <td>{w.level === 'high' ? semesterHigh : w.level === 'medium' ? semesterMedium : semesterLow} 学分</td>
                            <td>{w.course}</td>
                          </>
                        ) : filters.type === 'credit_total' ? (
                          <>
                            <td>{w.earnedCredits != null ? `${w.earnedCredits} 学分` : '—'}</td>
                            <td>{w.level === 'high' ? totalHigh : w.level === 'medium' ? totalMedium : totalLow} 学分</td>
                          </>
                        ) : (
                          <>
                            <td>{w.course}</td>
                            {managementItems.some((w2) => w2.type === 'grade') && (
                              <>
                                <td>{w.type === 'grade' ? (w.absentCount != null ? `${w.absentCount} 次` : '—') : '—'}</td>
                                <td>{w.type === 'grade' ? (w.score != null ? `${w.score} 分` : '—') : '—'}</td>
                              </>
                            )}
                            <td className="warning-message-cell" title={w.message}>{w.message}</td>
                            <td>{w.term ?? '—'}</td>
                          </>
                        )}
                        <td>
                          <div className="action-buttons">
                            <button
                              className={w.issuedWarningId ? 'btn-green btn-small' : 'btn-primary btn-small'}
                              onClick={() => openCreate(w)}
                            >
                              {w.issuedWarningId ? '再次预警' : '发布预警'}
                            </button>
                            {w.issuedWarningId && (
                              <button className="btn-delete" onClick={() => handleCancelWarning({ _id: w.issuedWarningId!, studentName: w.studentName })}>
                                取消预警
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
                    上一页
                  </button>
                  <span className="page-info">
                    第 {page} 页 / 共 {totalPages} 页（共 {totalCount} 条）
                  </span>
                  <button
                    className="page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>发布预警</h3>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); setEditingWarningId(null) }}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>学生 *</label>
                <select
                  value={createData.studentId}
                  onChange={(e) => setCreateData((p) => ({ ...p, studentId: e.target.value }))}
                  required
                  disabled={!!editingWarningId}
                >
                  <option value="">请选择学生</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}（{s.studentId}）
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>类型 *</label>
                <select
                  value={createData.type}
                  onChange={(e) => {
                    const newType = e.target.value as 'grade' | 'credit_semester' | 'credit_total'
                    setCreateData((p) => ({ ...p, type: newType, course: '' }))
                  }}
                  required
                >
                  <option value="grade">成绩预警</option>
                  <option value="credit_semester">学期学分预警</option>
                  <option value="credit_total">总学分预警</option>
                </select>
              </div>

              <div className="form-group">
                <label>级别 *</label>
                <select
                  value={createData.level}
                  onChange={(e) => setCreateData((p) => ({ ...p, level: e.target.value as any }))}
                  required
                >
                  <option value="high">高危</option>
                  <option value="medium">中危</option>
                  <option value="low">低危</option>
                </select>
              </div>

              <div className="form-group">
                <label>{createData.type === 'grade' ? '课程 *' : '学期 *'}</label>
                {createData.type === 'grade' ? (
                  <select
                    value={createData.course}
                    onChange={(e) => setCreateData((p) => ({ ...p, course: e.target.value }))}
                    required
                  >
                    <option value="">请选择课程</option>
                    {createCourseOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={createData.course}
                    onChange={(e) => setCreateData((p) => ({ ...p, course: e.target.value }))}
                    required
                  >
                    <option value="">请选择学期</option>
                    {createData.type === 'credit_total' && (
                      <option value="总学分">总学分</option>
                    )}
                    {createTermOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>预警内容 *</label>
                <textarea
                  className="warning-textarea"
                  value={createData.message}
                  onChange={(e) => setCreateData((p) => ({ ...p, message: e.target.value }))}
                  required
                  rows={4}
                />
              </div>

              {error && <div className="alert-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  发布
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

