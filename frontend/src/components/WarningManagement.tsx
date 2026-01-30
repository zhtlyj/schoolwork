import { useState, useEffect } from 'react'
import { warningService, Warning, CreateWarningData, WarningCandidate } from '../services/warnings'
import { studentService, Student } from '../services/students'
import '../pages/Home.css'

interface WarningManagementProps {
  gradeThreshold: number
  attendanceThreshold: number
}

// 预警管理组件（教职工/管理员：对学生下发预警 + 列表筛选 + 删除 + 一键生成）
export default function WarningManagement({ gradeThreshold, attendanceThreshold }: WarningManagementProps) {
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [mode, setMode] = useState<'manual' | 'auto'>('manual')

  const [filters, setFilters] = useState<{
    studentId: string
    type: '' | 'grade' | 'attendance' | 'assignment'
    level: '' | 'low' | 'medium' | 'high'
  }>({ studentId: '', type: '', level: '' })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createData, setCreateData] = useState<CreateWarningData>({
    studentId: '',
    type: 'grade',
    level: 'medium',
    course: '',
    message: '',
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchStudents = async () => {
    try {
      const res = await studentService.getStudents({ page: 1, limit: 200 })
      setStudents(res.students)
    } catch {
      // 学生列表失败不阻塞预警管理
    }
  }

  const fetchWarnings = async () => {
    // 只在手动模式下获取预警列表
    if (mode !== 'manual') {
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await warningService.getWarnings({
        page,
        limit: pageSize,
        studentId: filters.studentId || undefined,
        type: (filters.type || undefined) as any,
        level: (filters.level || undefined) as any,
      })
      setWarnings(res.warnings)
      setTotalPages(res.pagination.totalPages)
    } catch (err: any) {
      setError(err.response?.data?.message || '获取预警列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  // 切换模式时重置筛选和分页
  useEffect(() => {
    if (mode === 'manual') {
      setFilters({ studentId: '', type: '', level: '' })
      setPage(1)
      setPageSize(10)
    }
  }, [mode])

  useEffect(() => {
    fetchWarnings()
  }, [mode, page, pageSize, filters.studentId, filters.type, filters.level])

  // 重置筛选
  const resetFilters = () => {
    setFilters({ studentId: '', type: '', level: '' })
    setPage(1)
  }

  const openCreate = () => {
    setError('')
    setSuccess('')
    setCreateData({
      studentId: '',
      type: 'grade',
      level: 'medium',
      course: '',
      message: '',
    })
    setShowCreateModal(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await warningService.createWarning(createData)
      setShowCreateModal(false)
      setSuccess('已成功下发预警')
      setPage(1)
      fetchWarnings()
    } catch (err: any) {
      setError(err.response?.data?.message || '下发预警失败')
    }
  }

  const handleDelete = async (w: Warning) => {
    setError('')
    setSuccess('')
    const ok = window.confirm(`确定删除对【${w.studentName}】的预警吗？此操作不可恢复。`)
    if (!ok) return
    try {
      await warningService.deleteWarning(w._id)
      setSuccess('删除预警成功')
      fetchWarnings()
    } catch (err: any) {
      setError(err.response?.data?.message || '删除预警失败')
    }
  }

  // 一键生成模式：预警候选学生列表
  const [candidates, setCandidates] = useState<WarningCandidate[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [autoTypeFilter, setAutoTypeFilter] = useState<'grade' | 'attendance' | ''>('')

  // 在"一键生成"模式下，获取所有达到预警条件的学生列表
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
          type: autoTypeFilter || undefined,
          gradeThreshold,
          attendanceThreshold,
        })
        setCandidates(res.candidates)
      } catch (err: any) {
        setError(err.response?.data?.message || '获取预警候选学生列表失败')
      } finally {
        setCandidatesLoading(false)
      }
    }

    fetchCandidates()
  }, [mode, autoTypeFilter, gradeThreshold, attendanceThreshold])

  // 从候选学生列表中下发预警
  const handleGenerateFromCandidateGrade = async (
    studentId: string,
    course: string,
    score: number,
    examType: string,
    term: string
  ) => {
    const examTypeText = examType === 'final' ? '期末' : examType === 'midterm' ? '期中' : '平时'
    const message = `课程【${course}】${term}${examTypeText}考试成绩为 ${score} 分，低于预警阈值 ${gradeThreshold} 分，请及时关注学生学习情况。`

    setError('')
    setSuccess('')
    try {
      await warningService.createWarning({
        studentId,
        type: 'grade',
        level: 'high',
        course,
        message,
      })
      setSuccess('已成功下发成绩预警')
      fetchWarnings()
      // 刷新候选列表
      const res = await warningService.getWarningCandidates({
        type: autoTypeFilter || undefined,
        gradeThreshold,
        attendanceThreshold,
      })
      setCandidates(res.candidates)
    } catch (err: any) {
      setError(err.response?.data?.message || '下发预警失败')
    }
  }

  const handleGenerateFromCandidateAttendance = async (
    studentId: string,
    course: string,
    absentCount: number
  ) => {
    const message = `课程【${course}】缺勤次数为 ${absentCount} 次，超过出勤预警阈值 ${attendanceThreshold} 次，请及时进行出勤干预。`

    setError('')
    setSuccess('')
    try {
      await warningService.createWarning({
        studentId,
        type: 'attendance',
        level: 'medium',
        course,
        message,
      })
      setSuccess('已成功下发出勤预警')
      fetchWarnings()
      // 刷新候选列表
      const res = await warningService.getWarningCandidates({
        type: autoTypeFilter || undefined,
        gradeThreshold,
        attendanceThreshold,
      })
      setCandidates(res.candidates)
    } catch (err: any) {
      setError(err.response?.data?.message || '下发预警失败')
    }
  }

  return (
    <div className="page-content">
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

      {success && <div className="alert-success">{success}</div>}
      {error && <div className="alert-error">{error}</div>}

      {/* 列表筛选 */}
      <div className="warning-filters">
        {mode === 'manual' ? (
          <>
            <div className="filter-item">
              <label>学生</label>
              <select
                value={filters.studentId}
                onChange={(e) => {
                  setPage(1)
                  setFilters((p) => ({ ...p, studentId: e.target.value }))
                }}
              >
                <option value="">全部学生</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}（{s.studentId}）
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>类型</label>
              <select
                value={filters.type}
                onChange={(e) => {
                  setPage(1)
                  setFilters((p) => ({ ...p, type: e.target.value as any }))
                }}
              >
                <option value="">全部类型</option>
                <option value="grade">成绩</option>
                <option value="attendance">出勤</option>
                <option value="assignment">作业</option>
              </select>
            </div>

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

            <div className="filter-item">
              <label>每页显示</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1)
                  setPageSize(Number(e.target.value))
                }}
              >
                <option value="10">10 条</option>
                <option value="20">20 条</option>
                <option value="50">50 条</option>
                <option value="100">100 条</option>
              </select>
            </div>

            {(filters.studentId || filters.type || filters.level) && (
              <div className="filter-item" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn-secondary" onClick={resetFilters} style={{ padding: '10px 16px' }}>
                  🔄 重置筛选
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="filter-item">
            <label>预警类型</label>
            <select
              value={autoTypeFilter}
              onChange={(e) => {
                setAutoTypeFilter(e.target.value as 'grade' | 'attendance' | '')
              }}
            >
              <option value="">全部类型</option>
              <option value="grade">成绩预警</option>
              <option value="attendance">出勤预警</option>
            </select>
          </div>
        )}
      </div>

      {/* 一键生成区域（仅在 auto 模式下显示） */}
      {mode === 'auto' && (
        <div className="auto-warning-section">
          <div className="info-card" style={{ marginBottom: '20px' }}>
            <p>
              系统已根据规则自动筛选出所有达到预警条件的学生。当前规则：成绩 &lt; {gradeThreshold} 分 → 高危预警；缺勤次数 &gt; {attendanceThreshold} 次 → 中危预警。
            </p>
          </div>

          {candidatesLoading ? (
            <div className="loading-state">加载中...</div>
          ) : candidates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <p>暂无达到预警条件的学生</p>
            </div>
          ) : (
            <div className="candidates-list">
              {candidates.map((candidate) => {
                // 根据类型筛选显示
                const showGradeWarnings = !autoTypeFilter || autoTypeFilter === 'grade'
                const showAttendanceWarnings = !autoTypeFilter || autoTypeFilter === 'attendance'
                const hasGradeWarnings = candidate.gradeWarnings.length > 0 && showGradeWarnings
                const hasAttendanceWarnings = candidate.attendanceWarnings.length > 0 && showAttendanceWarnings

                if (!hasGradeWarnings && !hasAttendanceWarnings) {
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
                          <h4 className="warning-group-title">📝 成绩预警（{candidate.gradeWarnings.length}项）</h4>
                          <div className="warning-items">
                            {candidate.gradeWarnings.map((gw, idx) => {
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
                                        gw.term
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

                      {hasAttendanceWarnings && (
                        <div className="warning-group">
                          <h4 className="warning-group-title">
                            📅 出勤预警（{candidate.attendanceWarnings.length}项）
                          </h4>
                          <div className="warning-items">
                            {candidate.attendanceWarnings.map((aw, idx) => (
                              <div key={idx} className="warning-item">
                                <div className="warning-item-info">
                                  <span className="warning-course">{aw.course}</span>
                                  <span className="warning-meta">
                                    缺勤 {aw.absentCount} 次 | 最近缺勤：{new Date(aw.lastAbsentAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <button
                                  className="btn-primary btn-small"
                                  onClick={() =>
                                    handleGenerateFromCandidateAttendance(
                                      candidate.studentId,
                                      aw.course,
                                      aw.absentCount
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
          ) : warnings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <p>暂无预警数据</p>
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
              <div className="students-table-container">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>学生</th>
                      <th>类型</th>
                      <th>级别</th>
                      <th>课程</th>
                      <th>内容</th>
                      <th>创建者</th>
                      <th>时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warnings.map((w) => (
                      <tr key={w._id}>
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
                                  : w.type === 'attendance'
                                  ? '#fff3e0'
                                  : '#f3e5f5',
                              color:
                                w.type === 'grade'
                                  ? '#1976d2'
                                  : w.type === 'attendance'
                                  ? '#e65100'
                                  : '#7b1fa2',
                            }}
                          >
                            {w.type === 'grade' ? '成绩' : w.type === 'attendance' ? '出勤' : '作业'}
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
                        <td>{w.course}</td>
                        <td className="warning-message-cell" title={w.message}>
                          {w.message}
                        </td>
                        <td>{w.createdByName}</td>
                        <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-delete" onClick={() => handleDelete(w)}>
                              删除
                            </button>
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
                    第 {page} 页 / 共 {totalPages} 页（共 {warnings.length} 条）
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
              <h3>下发预警</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
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
                  onChange={(e) => setCreateData((p) => ({ ...p, type: e.target.value as any }))}
                  required
                >
                  <option value="grade">成绩</option>
                  <option value="attendance">出勤</option>
                  <option value="assignment">作业</option>
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
                <label>课程 *</label>
                <input
                  type="text"
                  value={createData.course}
                  onChange={(e) => setCreateData((p) => ({ ...p, course: e.target.value }))}
                  required
                />
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
                  下发
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

