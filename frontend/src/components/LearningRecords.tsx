import { useState, useEffect } from 'react'
import { attendanceService, AttendanceRecord } from '../services/attendance'
import { gradeService, Grade } from '../services/grades'
import {
  interventionService,
  Intervention,
  canonicalInterventionStatusClient,
  interventionStatusLabel,
} from '../services/interventions'
import {
  appendOrTraceInterventionStepOnChain,
  computeInterventionStudentSubmitStepHash,
  explorerTxUrl,
} from '../services/interventionChain'
import { useWallet } from '../contexts/WalletContext'
import { downloadCsv, formatExportDate } from '../lib/exportCsv'
import {
  buildAttendanceCsv,
  buildFullLearningRecordsCsv,
  buildGradesCsv,
  buildInterventionsCsv,
} from '../lib/learningRecordsExport'
import '../pages/Home.css'

/**
 * 学习记录组件
 * 整合展示学生的出勤记录、成绩记录和干预记录
 */
export default function LearningRecords() {
  const { ensureTargetChain, connect } = useWallet()
  const [activeTab, setActiveTab] = useState<'attendance' | 'grades' | 'interventions'>('attendance')

  // 出勤记录
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')

  // 成绩记录
  const [grades, setGrades] = useState<Grade[]>([])
  const [gradesLoading, setGradesLoading] = useState(false)
  const [gradesError, setGradesError] = useState('')

  // 干预记录
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [interventionsLoading, setInterventionsLoading] = useState(false)
  const [interventionsError, setInterventionsError] = useState('')
  const [interventionSubmittingId, setInterventionSubmittingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // 获取出勤记录
  const fetchAttendance = async () => {
    setAttendanceLoading(true)
    setAttendanceError('')
    try {
      const res = await attendanceService.getAttendance({
        page: 1,
        limit: 100,
      })
      setAttendanceRecords(res.records)
    } catch (err: any) {
      setAttendanceError(err.response?.data?.message || '获取出勤记录失败')
    } finally {
      setAttendanceLoading(false)
    }
  }

  // 获取成绩记录
  const fetchGrades = async () => {
    setGradesLoading(true)
    setGradesError('')
    try {
      const res = await gradeService.getGrades({
        page: 1,
        limit: 100,
      })
      setGrades(res.grades)
    } catch (err: any) {
      setGradesError(err.response?.data?.message || '获取成绩记录失败')
    } finally {
      setGradesLoading(false)
    }
  }

  // 获取干预记录
  const fetchInterventions = async () => {
    setInterventionsLoading(true)
    setInterventionsError('')
    try {
      const res = await interventionService.getInterventions({
        page: 1,
        limit: 100,
      })
      setInterventions(res.interventions)
    } catch (err: any) {
      setInterventionsError(err.response?.data?.message || '获取干预记录失败')
    } finally {
      setInterventionsLoading(false)
    }
  }

  // 根据激活的标签页加载对应数据
  useEffect(() => {
    if (activeTab === 'attendance' && attendanceRecords.length === 0 && !attendanceLoading) {
      fetchAttendance()
    } else if (activeTab === 'grades' && grades.length === 0 && !gradesLoading) {
      fetchGrades()
    } else if (activeTab === 'interventions' && interventions.length === 0 && !interventionsLoading) {
      fetchInterventions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // 计算统计数据
  const calculateStats = () => {
    // 出勤统计
    const totalAbsentCount = attendanceRecords.reduce((sum, record) => sum + record.absentCount, 0)
    const averageAbsentCount = attendanceRecords.length > 0 ? totalAbsentCount / attendanceRecords.length : 0

    // 成绩统计
    const averageScore = grades.length > 0
      ? Math.round((grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length) * 100) / 100
      : 0
    const passCount = grades.filter((g) => g.score >= 60).length

    // 干预统计
    const pendingStudent = interventions.filter(
      (i) => canonicalInterventionStatusClient(i.status) === 'student_pending'
    ).length
    const pendingReview = interventions.filter(
      (i) => canonicalInterventionStatusClient(i.status) === 'pending_review'
    ).length
    const completedInterventions = interventions.filter(
      (i) => canonicalInterventionStatusClient(i.status) === 'completed'
    ).length

    return {
      attendance: {
        totalCourses: attendanceRecords.length,
        totalAbsentCount,
        averageAbsentCount: Math.round(averageAbsentCount * 100) / 100,
      },
      grades: {
        total: grades.length,
        averageScore,
        passCount,
        failCount: grades.length - passCount,
      },
      interventions: {
        total: interventions.length,
        pendingStudent,
        pendingReview,
        completed: completedInterventions,
      },
    }
  }

  const stats = calculateStats()

  const getInterventionStatusClass = (status: string) => {
    const s = canonicalInterventionStatusClient(status)
    switch (s) {
      case 'student_pending':
        return 'status-pending'
      case 'pending_review':
        return 'status-in-progress'
      case 'completed':
        return 'status-completed'
      case 'revoked':
        return 'status-cancelled'
      default:
        return ''
    }
  }

  const submitInterventionReview = async (intervention: Intervention, notes: string) => {
    const text = notes.trim()
    if (!text) {
      setInterventionsError('请先填写完成情况说明')
      return
    }
    setInterventionsError('')
    setInterventionSubmittingId(intervention._id)
    try {
      const eth = window.ethereum
      if (!eth) {
        setInterventionsError('未检测到钱包，请安装 MetaMask 等扩展')
        return
      }
      const accs = (await eth.request({ method: 'eth_accounts' })) as string[]
      if (!accs?.length) {
        await connect()
      }
      const accs2 = (await eth.request({ method: 'eth_accounts' })) as string[]
      if (!accs2?.length) {
        setInterventionsError('请先连接钱包后再提交审核（需用 MetaMask 确认链上交易）')
        return
      }
      await ensureTargetChain()

      const stepHash = computeInterventionStudentSubmitStepHash(intervention._id, text)
      const txHash = await appendOrTraceInterventionStepOnChain(intervention._id, stepHash, {
        action: '学生提交审核（链上审计）',
      })

      await interventionService.updateIntervention(intervention._id, {
        notes: text,
        submitForReview: true,
        blockHash: txHash,
      })
      const res = await interventionService.getInterventions({ page: 1, limit: 100 })
      setInterventions(res.interventions)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : String(err)) ||
        '提交失败'
      setInterventionsError(msg)
    } finally {
      setInterventionSubmittingId(null)
    }
  }

  /** 导出当前标签（拉取最新数据后生成 CSV，Excel 可直接打开） */
  const handleExportCurrentTab = async () => {
    setExporting(true)
    try {
      if (activeTab === 'attendance') {
        const res = await attendanceService.getAttendance({ page: 1, limit: 500 })
        setAttendanceRecords(res.records)
        if (!res.records.length) {
          window.alert('暂无出勤数据可导出')
          return
        }
        downloadCsv(`学习记录_出勤_${formatExportDate()}.csv`, buildAttendanceCsv(res.records))
        return
      }
      if (activeTab === 'grades') {
        const res = await gradeService.getGrades({ page: 1, limit: 500 })
        setGrades(res.grades)
        if (!res.grades.length) {
          window.alert('暂无成绩数据可导出')
          return
        }
        downloadCsv(`学习记录_成绩_${formatExportDate()}.csv`, buildGradesCsv(res.grades))
        return
      }
      const res = await interventionService.getInterventions({ page: 1, limit: 500 })
      setInterventions(res.interventions)
      if (!res.interventions.length) {
        window.alert('暂无干预数据可导出')
        return
      }
      downloadCsv(`学习记录_干预_${formatExportDate()}.csv`, buildInterventionsCsv(res.interventions))
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  /** 导出全部：出勤 + 成绩 + 干预 合并为一个 CSV */
  const handleExportAll = async () => {
    setExporting(true)
    try {
      const [attRes, gradeRes, ivRes] = await Promise.all([
        attendanceService.getAttendance({ page: 1, limit: 500 }),
        gradeService.getGrades({ page: 1, limit: 500 }),
        interventionService.getInterventions({ page: 1, limit: 500 }),
      ])
      setAttendanceRecords(attRes.records)
      setGrades(gradeRes.grades)
      setInterventions(ivRes.interventions)
      const csv = buildFullLearningRecordsCsv(attRes.records, gradeRes.grades, ivRes.interventions)
      downloadCsv(`学习记录_全部_${formatExportDate()}.csv`, csv)
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  // 获取考试类型文本
  const getExamTypeText = (type: string) => {
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

  return (
    <div className="page-content">
      <h2 className="page-title">📚 学习记录</h2>

      <div className="learning-records-export-bar">
        <button
          type="button"
          className="btn-secondary btn-small"
          disabled={exporting}
          onClick={() => void handleExportCurrentTab()}
        >
          {exporting ? '导出中…' : '📥 导出当前标签为表格（CSV）'}
        </button>
        <button
          type="button"
          className="btn-primary btn-small"
          disabled={exporting}
          onClick={() => void handleExportAll()}
        >
          {exporting ? '导出中…' : '📥 导出全部学习记录（CSV）'}
        </button>
        <p className="export-hint">
          CSV 可用 Excel、WPS 打开；含 UTF-8 标记，中文不乱码。当前标签指出勤 / 成绩 / 干预中正在查看的那一类。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="records-stats">
        <div className="stat-card-small">
          <div className="stat-icon-small">📅</div>
          <div className="stat-content-small">
            <div className="stat-value-small">{stats.attendance.totalCourses}</div>
            <div className="stat-label-small">出勤课程数</div>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">⏰</div>
          <div className="stat-content-small">
            <div className="stat-value-small">{stats.attendance.totalAbsentCount}</div>
            <div className="stat-label-small">总缺勤次数</div>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">📊</div>
          <div className="stat-content-small">
            <div className="stat-value-small">{stats.grades.averageScore}</div>
            <div className="stat-label-small">平均成绩</div>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">🔧</div>
          <div className="stat-content-small">
            <div className="stat-value-small">{stats.interventions.pendingStudent}</div>
            <div className="stat-label-small">待处理干预</div>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">📨</div>
          <div className="stat-content-small">
            <div className="stat-value-small">{stats.interventions.pendingReview}</div>
            <div className="stat-label-small">审核中干预</div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="records-tabs">
        <button
          className={`records-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          📅 出勤记录
        </button>
        <button
          className={`records-tab-btn ${activeTab === 'grades' ? 'active' : ''}`}
          onClick={() => setActiveTab('grades')}
        >
          📝 成绩记录
        </button>
        <button
          className={`records-tab-btn ${activeTab === 'interventions' ? 'active' : ''}`}
          onClick={() => setActiveTab('interventions')}
        >
          🔧 干预记录
        </button>
      </div>

      {/* 出勤记录 */}
      {activeTab === 'attendance' && (
        <div className="records-tab-content">
          {attendanceLoading ? (
            <div className="loading-state">加载中...</div>
          ) : attendanceError ? (
            <div className="alert-error">{attendanceError}</div>
          ) : attendanceRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>暂无出勤记录</p>
            </div>
          ) : (
            <div className="records-table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>课程名称</th>
                    <th>缺勤次数</th>
                    <th>最近缺勤时间</th>
                    <th>记录时间</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record._id}>
                      <td className="course-name">{record.course}</td>
                      <td>
                        <span className={record.absentCount > 3 ? 'absent-high' : 'absent-normal'}>
                          {record.absentCount} 次
                        </span>
                      </td>
                      <td>{new Date(record.lastAbsentAt).toLocaleDateString('zh-CN')}</td>
                      <td className="record-time">
                        {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 成绩记录 */}
      {activeTab === 'grades' && (
        <div className="records-tab-content">
          {gradesLoading ? (
            <div className="loading-state">加载中...</div>
          ) : gradesError ? (
            <div className="alert-error">{gradesError}</div>
          ) : grades.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>暂无成绩记录</p>
            </div>
          ) : (
            <div className="records-table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>课程名称</th>
                    <th>学期</th>
                    <th>考试类型</th>
                    <th>成绩</th>
                    <th>记录时间</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade) => {
                    const scoreClass = grade.score >= 90 ? 'score-excellent' : grade.score >= 80 ? 'score-good' : grade.score >= 70 ? 'score-medium' : grade.score >= 60 ? 'score-pass' : 'score-fail'
                    return (
                      <tr key={grade._id}>
                        <td className="course-name">{grade.course}</td>
                        <td>{grade.term}</td>
                        <td>{getExamTypeText(grade.examType)}</td>
                        <td>
                          <span className={`score ${scoreClass}`}>{grade.score}</span>
                        </td>
                        <td className="record-time">
                          {new Date(grade.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 干预记录 */}
      {activeTab === 'interventions' && (
        <div className="records-tab-content">
          {interventionsLoading ? (
            <div className="loading-state">加载中...</div>
          ) : interventionsError ? (
            <div className="alert-error">{interventionsError}</div>
          ) : interventions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔧</div>
              <p>暂无干预记录</p>
            </div>
          ) : (
            <div className="interventions-list">
              {interventions.map((intervention) => {
                const st = canonicalInterventionStatusClient(intervention.status)
                return (
                  <div key={intervention._id} className="intervention-card">
                    <div className="intervention-header">
                      <div className="intervention-student">
                        <strong>{intervention.type}</strong>
                      </div>
                      <span className={`status-badge ${getInterventionStatusClass(intervention.status)}`}>
                        {interventionStatusLabel(intervention.status)}
                      </span>
                    </div>
                    <div className="intervention-content">
                      <p>{intervention.description}</p>
                      {st === 'pending_review' || st === 'completed' ? (
                        <>
                          {intervention.notes ? (
                            <div className="intervention-plan">
                              <strong>我的完成情况：</strong>
                              <span>{intervention.notes}</span>
                            </div>
                          ) : null}
                          {intervention.submittedAt ? (
                            <div className="intervention-assigned">
                              <strong>提交时间：</strong>
                              <span>{new Date(intervention.submittedAt).toLocaleString('zh-CN')}</span>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      {st === 'completed' && intervention.reviewResult ? (
                        <div className="intervention-plan">
                          <strong>审核结果：</strong>
                          <span>{intervention.reviewResult === 'pass' ? '通过' : '不通过'}</span>
                          {intervention.reviewOpinion ? (
                            <span style={{ marginLeft: 8 }}>（{intervention.reviewOpinion}）</span>
                          ) : null}
                        </div>
                      ) : null}
                      {st === 'revoked' && intervention.revokedAt ? (
                        <div className="intervention-assigned">
                          <strong>撤销时间：</strong>
                          <span>{new Date(intervention.revokedAt).toLocaleString('zh-CN')}</span>
                        </div>
                      ) : null}
                      {intervention.plan && (
                        <div className="intervention-plan">
                          <strong>干预计划：</strong>
                          <span>{intervention.plan}</span>
                        </div>
                      )}
                      {intervention.assignedToName && (
                        <div className="intervention-assigned">
                          <strong>负责人：</strong>
                          <span>{intervention.assignedToName}</span>
                        </div>
                      )}
                      {st === 'student_pending' ? (
                        <div style={{ marginTop: 12 }}>
                          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                            完成情况说明（提交后进入待审核）
                          </label>
                          <p className="form-hint" style={{ marginBottom: 8 }}>
                            提交时将弹出 MetaMask：先在链上写入审计记录，再保存到系统。请连接钱包并切换到与系统一致的测试网。
                          </p>
                          <textarea
                            className="warning-textarea"
                            style={{ width: '100%', minHeight: 72 }}
                            defaultValue={intervention.notes || ''}
                            id={`intervention-notes-${intervention._id}`}
                          />
                          <button
                            type="button"
                            className="btn-primary btn-small"
                            style={{ marginTop: 8 }}
                            disabled={interventionSubmittingId === intervention._id}
                            onClick={() => {
                              const el = document.getElementById(
                                `intervention-notes-${intervention._id}`
                              ) as HTMLTextAreaElement | null
                              submitInterventionReview(intervention, el?.value || '')
                            }}
                          >
                            {interventionSubmittingId === intervention._id ? '提交中…' : '提交审核'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="intervention-footer">
                      <span className="intervention-time">
                        {new Date(intervention.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                      {intervention.blockHash &&
                        (explorerTxUrl(intervention.blockHash) ? (
                          <a
                            href={explorerTxUrl(intervention.blockHash)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="blockchain-badge"
                            style={{ textDecoration: 'none' }}
                          >
                            ⛓️ 查看链上交易
                          </a>
                        ) : (
                          <span className="blockchain-badge">⛓️ 已上链</span>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

