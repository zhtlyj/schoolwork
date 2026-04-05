import { useState, useEffect } from 'react'
import {
  interventionService,
  Intervention,
  CreateInterventionData,
  canonicalInterventionStatusClient,
  interventionStatusLabel,
} from '../services/interventions'
import {
  anchorInterventionOnChain,
  appendOrTraceInterventionStepOnChain,
  computeInterventionReviewStepHash,
  computeInterventionRevokeStepHash,
  explorerTxUrl,
} from '../services/interventionChain'
import { statisticsService } from '../services/statistics'
import { studentService, Student } from '../services/students'
import '../pages/Home.css'

/** 与系统预设类型名称一致时，创建干预自动填入默认描述（可改）；自定义类型无预设则为空 */
const INTERVENTION_DEFAULT_DESCRIPTIONS: Record<string, string> = {
  学习辅导:
    '请加强课程学习，认真复习，积极备考，争取通过补考或重修，顺利完成课程学习。',
  心理疏导:
    '请注意调节情绪、缓解学习压力，保持积极心态。遇到困难可及时与老师沟通交流。',
  心理辅导:
    '请注意调节情绪、缓解学习压力，保持积极心态。遇到困难可及时与老师沟通交流。',
  纪律教育:
    '请严格遵守学校各项规章制度，规范日常行为，杜绝违纪情况，端正学风作风，严格遵守学校管理规定。',
  考勤督促:
    '请严格遵守课堂考勤纪律，不旷课、不迟到、不早退，保证正常的学习参与度。',
  出勤提醒:
    '请严格遵守课堂考勤纪律，不旷课、不迟到、不早退，保证正常的学习参与度。',
}

const REVOKE_REASON_PRESETS = ['已经通过补考', '已经重修合格', '预警录入错误'] as const

function getDefaultDescriptionForInterventionType(type: string): string {
  return INTERVENTION_DEFAULT_DESCRIPTIONS[type] ?? ''
}

interface InterventionManagementProps {
  interventionTypes: string[]
}

type FilterStatus = '' | 'student_pending' | 'pending_review' | 'completed' | 'revoked'

function statusBadgeClass(status: string): string {
  const s = canonicalInterventionStatusClient(status)
  switch (s) {
    case 'completed':
      return 'status-completed'
    case 'pending_review':
      return 'status-in-progress'
    case 'student_pending':
      return 'status-pending'
    case 'revoked':
      return 'status-cancelled'
    default:
      return 'status-pending'
  }
}

/** 查看详情：分块展示，便于阅读 */
function InterventionDetailBody({ intervention, eff }: { intervention: Intervention; eff: string }) {
  return (
    <>
      <section className="intervention-detail-section">
        <h4 className="intervention-detail-section-title">基本信息</h4>
        <dl className="intervention-detail-dl">
          <div className="intervention-detail-row">
            <dt>学生</dt>
            <dd>{intervention.studentName}</dd>
          </div>
          <div className="intervention-detail-row">
            <dt>干预类型</dt>
            <dd>{intervention.type}</dd>
          </div>
          <div className="intervention-detail-row intervention-detail-row-block">
            <dt>干预描述</dt>
            <dd className="intervention-detail-text">{intervention.description}</dd>
          </div>
          <div className="intervention-detail-row">
            <dt>创建时间</dt>
            <dd>{new Date(intervention.createdAt).toLocaleString('zh-CN')}</dd>
          </div>
        </dl>
      </section>

      {(eff === 'pending_review' || eff === 'completed') && (
        <section className="intervention-detail-section">
          <h4 className="intervention-detail-section-title">学生反馈</h4>
          <dl className="intervention-detail-dl">
            <div className="intervention-detail-row intervention-detail-row-block">
              <dt>完成情况说明</dt>
              <dd className="intervention-detail-text">{intervention.notes?.trim() || '—'}</dd>
            </div>
            <div className="intervention-detail-row">
              <dt>提交时间</dt>
              <dd>
                {intervention.submittedAt
                  ? new Date(intervention.submittedAt).toLocaleString('zh-CN')
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {eff === 'completed' && (
        <section className="intervention-detail-section">
          <h4 className="intervention-detail-section-title">审核信息</h4>
          <dl className="intervention-detail-dl">
            <div className="intervention-detail-row">
              <dt>审核结果</dt>
              <dd>
                {intervention.reviewResult === 'pass' ? (
                  <span className="intervention-review-tag intervention-review-pass">通过</span>
                ) : intervention.reviewResult === 'fail' ? (
                  <span className="intervention-review-tag intervention-review-fail">不通过</span>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="intervention-detail-row intervention-detail-row-block">
              <dt>审核意见</dt>
              <dd className="intervention-detail-text">{intervention.reviewOpinion?.trim() || '—'}</dd>
            </div>
            <div className="intervention-detail-row">
              <dt>审核时间</dt>
              <dd>
                {intervention.reviewedAt
                  ? new Date(intervention.reviewedAt).toLocaleString('zh-CN')
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {eff === 'revoked' && (
        <section className="intervention-detail-section intervention-detail-section-muted">
          <h4 className="intervention-detail-section-title">撤销信息</h4>
          <dl className="intervention-detail-dl">
            <div className="intervention-detail-row">
              <dt>撤销时间</dt>
              <dd>
                {intervention.revokedAt
                  ? new Date(intervention.revokedAt).toLocaleString('zh-CN')
                  : '—'}
              </dd>
            </div>
            {intervention.revokeReason ? (
              <div className="intervention-detail-row intervention-detail-row-block">
                <dt>撤销原因</dt>
                <dd className="intervention-detail-text">{intervention.revokeReason}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      )}
    </>
  )
}

export default function InterventionManagement({ interventionTypes }: InterventionManagementProps) {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [interventionCounts, setInterventionCounts] = useState({
    student_pending: 0,
    pending_review: 0,
    completed: 0,
    revoked: 0,
  })

  const [filters, setFilters] = useState<{
    studentId: string
    status: FilterStatus
    type: string
  }>({ studentId: '', status: '', type: '' })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createData, setCreateData] = useState<CreateInterventionData>({
    studentId: '',
    type: '',
    description: '',
  })

  const [listError, setListError] = useState('')
  const [createError, setCreateError] = useState('')
  const [success, setSuccess] = useState('')

  const [detailContext, setDetailContext] = useState<{
    intervention: Intervention
    mode: 'view' | 'review'
  } | null>(null)

  const [revokeTarget, setRevokeTarget] = useState<Intervention | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [revokeError, setRevokeError] = useState('')
  const [revokeChainBusy, setRevokeChainBusy] = useState(false)

  /** 与预警类似：创建、审核、撤销时是否走 MetaMask */
  const [syncChainOnWrite, setSyncChainOnWrite] = useState(true)
  const [chainBusy, setChainBusy] = useState(false)
  const [anchoringInterventionId, setAnchoringInterventionId] = useState<string | null>(null)

  const [reviewResult, setReviewResult] = useState<'pass' | 'fail'>('pass')
  const [reviewOpinion, setReviewOpinion] = useState('')
  const [detailActionLoading, setDetailActionLoading] = useState(false)

  /** 学生筛选项：可搜索的下拉 */
  const [studentFilterDropdownOpen, setStudentFilterDropdownOpen] = useState(false)
  const [studentFilterSearchInput, setStudentFilterSearchInput] = useState('')

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 1000)
    return () => clearTimeout(t)
  }, [success])

  const fetchInterventionStats = async () => {
    try {
      const data = await statisticsService.getStatistics()
      setInterventionCounts({ ...data.intervention.byStatus })
    } catch {
      // 统计失败不阻塞页面
    }
  }

  const fetchStudents = async () => {
    try {
      const res = await studentService.getStudents({ page: 1, limit: 200 })
      setStudents(res.students)
    } catch {
      //
    }
  }

  const fetchInterventions = async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await interventionService.getInterventions({
        page,
        limit: pageSize,
        studentId: filters.studentId || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
      })
      setInterventions(res.interventions)
      setTotalPages(res.pagination.totalPages)
    } catch (err: any) {
      setListError(err.response?.data?.message || '获取干预列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchInterventionStats()
  }, [])

  useEffect(() => {
    fetchInterventions()
  }, [page, pageSize, filters.studentId, filters.status, filters.type])

  const refreshAll = async () => {
    await fetchInterventions()
    await fetchInterventionStats()
  }

  /** 列表「上链存证」：补 anchor（尚未 blockHash 的记录） */
  const handleAnchorExistingIntervention = async (id: string) => {
    setListError('')
    setSuccess('')
    setAnchoringInterventionId(id)
    try {
      const { intervention } = await interventionService.getIntervention(id)
      const txHash = await anchorInterventionOnChain(intervention)
      await interventionService.updateIntervention(id, { blockHash: txHash })
      setSuccess('链上存证成功')
      await refreshAll()
    } catch (ce: unknown) {
      setListError(ce instanceof Error ? ce.message : '链上存证失败')
    } finally {
      setAnchoringInterventionId(null)
    }
  }

  const chainStatusCell = (i: Intervention) => (
    <td className="warning-chain-cell">
      {i.blockHash ? (
        explorerTxUrl(i.blockHash) ? (
          <a
            href={explorerTxUrl(i.blockHash)!}
            target="_blank"
            rel="noopener noreferrer"
            className="warning-tx-link"
          >
            已存证
          </a>
        ) : (
          <span title={i.blockHash} className="warning-tx-hash">
            {i.blockHash.slice(0, 10)}…
          </span>
        )
      ) : (
        <button
          type="button"
          className="btn-secondary btn-small"
          disabled={anchoringInterventionId !== null || chainBusy}
          onClick={() => handleAnchorExistingIntervention(i._id)}
        >
          {anchoringInterventionId === i._id ? '上链中…' : '上链存证'}
        </button>
      )}
    </td>
  )

  const resetFilters = () => {
    setFilters({ studentId: '', status: '', type: '' })
    setStudentFilterSearchInput('')
    setStudentFilterDropdownOpen(false)
    setPage(1)
  }

  const openCreate = () => {
    setListError('')
    setCreateError('')
    setSuccess('')
    const firstType = interventionTypes[0] || ''
    setCreateData({
      studentId: '',
      type: firstType,
      description: getDefaultDescriptionForInterventionType(firstType),
    })
    setShowCreateModal(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setSuccess('')

    if (!createData.studentId || !createData.type || !createData.description) {
      setCreateError('请填写学生、干预类型和干预描述')
      return
    }

    const selectedStudent = students.find((s) => s.id === createData.studentId)
    if (!selectedStudent) {
      setCreateError('请选择有效的学生')
      return
    }

    const submitData = {
      ...createData,
      studentId: selectedStudent.id,
    }

    try {
      const { intervention } = await interventionService.createIntervention(submitData)
      if (syncChainOnWrite) {
        setChainBusy(true)
        try {
          const txHash = await anchorInterventionOnChain(intervention)
          await interventionService.updateIntervention(intervention._id, { blockHash: txHash })
          setShowCreateModal(false)
          setSuccess('创建干预成功并已链上存证')
        } catch (ce: unknown) {
          setCreateError(ce instanceof Error ? ce.message : 'MetaMask 上链失败，干预已保存')
          setShowCreateModal(false)
        } finally {
          setChainBusy(false)
        }
      } else {
        setShowCreateModal(false)
        setSuccess('创建干预成功')
      }
      setPage(1)
      await refreshAll()
      const t0 = interventionTypes[0] || ''
      setCreateData({
        studentId: '',
        type: t0,
        description: getDefaultDescriptionForInterventionType(t0),
      })
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.response?.data?.error || '创建干预失败')
    }
  }

  const openDetailView = (i: Intervention) => {
    setListError('')
    setDetailContext({ intervention: i, mode: 'view' })
    setReviewResult('pass')
    setReviewOpinion('')
  }

  const openReview = (i: Intervention) => {
    setListError('')
    setDetailContext({ intervention: i, mode: 'review' })
    setReviewResult('pass')
    setReviewOpinion('')
  }

  const closeDetail = () => {
    setDetailContext(null)
    setDetailActionLoading(false)
  }

  const openRevokeFromDetail = (i: Intervention) => {
    setRevokeTarget(i)
    setRevokeReason(REVOKE_REASON_PRESETS[0])
    setRevokeError('')
  }

  const closeRevoke = () => {
    setRevokeTarget(null)
    setRevokeReason('')
    setRevokeError('')
  }

  const handleConfirmRevoke = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revokeTarget) return
    const reason = revokeReason.trim()
    if (!reason) {
      setRevokeError('请填写撤销原因')
      return
    }
    setRevokeError('')
    const id = revokeTarget._id
    try {
      await interventionService.updateIntervention(id, { revoke: { reason } })
      if (syncChainOnWrite) {
        setRevokeChainBusy(true)
        try {
          const stepHash = computeInterventionRevokeStepHash(id, reason)
          const txHash = await appendOrTraceInterventionStepOnChain(id, stepHash, {
            action: '干预撤销链上记录',
          })
          await interventionService.updateIntervention(id, { blockHash: txHash })
        } catch (ce: unknown) {
          closeRevoke()
          closeDetail()
          setListError(ce instanceof Error ? ce.message : '已撤销干预，但链上记录失败')
          await refreshAll()
          return
        } finally {
          setRevokeChainBusy(false)
        }
      }
      closeRevoke()
      closeDetail()
      setSuccess(syncChainOnWrite ? '已撤销干预并已链上记录' : '已撤销干预')
      await refreshAll()
    } catch (err: any) {
      setRevokeError(err.response?.data?.message || '撤销失败')
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailContext || detailContext.mode !== 'review') return
    setDetailActionLoading(true)
    setListError('')
    const id = detailContext.intervention._id
    const opinionTrim = reviewOpinion.trim()
    try {
      await interventionService.updateIntervention(id, {
        review: { result: reviewResult, opinion: opinionTrim || undefined },
      })
      if (syncChainOnWrite) {
        try {
          const stepHash = computeInterventionReviewStepHash(id, reviewResult, opinionTrim)
          const txHash = await appendOrTraceInterventionStepOnChain(id, stepHash, {
            action: '干预审核链上记录',
          })
          await interventionService.updateIntervention(id, { blockHash: txHash })
        } catch (ce: unknown) {
          setListError(ce instanceof Error ? ce.message : '审核已保存，但链上记录失败')
          closeDetail()
          await refreshAll()
          return
        }
      }
      setSuccess(syncChainOnWrite ? '审核已提交并已链上记录' : '审核已提交')
      closeDetail()
      await refreshAll()
    } catch (err: any) {
      setListError(err.response?.data?.message || '审核提交失败')
    } finally {
      setDetailActionLoading(false)
    }
  }

  const primaryAction = (i: Intervention) => {
    const s = canonicalInterventionStatusClient(i.status)
    if (s === 'student_pending') {
      return (
        <button type="button" className="btn-secondary btn-small" onClick={() => openDetailView(i)}>
          查看
        </button>
      )
    }
    if (s === 'pending_review') {
      return (
        <button type="button" className="btn-primary btn-small" onClick={() => openReview(i)}>
          审核
        </button>
      )
    }
    if (s === 'completed' || s === 'revoked') {
      return (
        <button type="button" className="btn-secondary btn-small" onClick={() => openDetailView(i)}>
          查看
        </button>
      )
    }
    return null
  }

  const eff = detailContext ? canonicalInterventionStatusClient(detailContext.intervention.status) : ''

  return (
    <div className="page-content">
      <div className="students-header warning-management-page-header">
        <div
          className="warning-management-header-top"
          style={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}
        >
          <h2 className="page-title">🔧 干预管理</h2>
          <button type="button" className="btn-primary" onClick={openCreate}>
            ➕ 创建干预
          </button>
        </div>
        <label className="warning-chain-toggle">
          <input
            type="checkbox"
            checked={syncChainOnWrite}
            onChange={(e) => setSyncChainOnWrite(e.target.checked)}
          />
          <span>
            创建/审核/撤销时使用 MetaMask 上链（创建 anchorIntervention；审核与撤销在未首次存证时仅发链上事件留痕，已存证则追加审计步骤）
          </span>
        </label>
      </div>

      <div className="stats-grid stats-filter-grid" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`stat-card stat-filter-card ${filters.status === 'student_pending' ? 'active' : ''}`}
          onClick={() => {
            setPage(1)
            setFilters((p) => ({
              ...p,
              status: p.status === 'student_pending' ? '' : 'student_pending',
            }))
          }}
        >
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{interventionCounts.student_pending}</div>
            <div className="stat-label">待学生处理</div>
            <div className="stat-label" style={{ fontSize: 12, opacity: 0.9 }}>
              查看
            </div>
          </div>
        </button>
        <button
          type="button"
          className={`stat-card stat-filter-card ${filters.status === 'pending_review' ? 'active' : ''}`}
          onClick={() => {
            setPage(1)
            setFilters((p) => ({
              ...p,
              status: p.status === 'pending_review' ? '' : 'pending_review',
            }))
          }}
        >
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{interventionCounts.pending_review}</div>
            <div className="stat-label">待审核</div>
            <div className="stat-label" style={{ fontSize: 12, opacity: 0.9 }}>
              审核
            </div>
          </div>
        </button>
        <button
          type="button"
          className={`stat-card stat-filter-card ${filters.status === 'completed' ? 'active' : ''}`}
          onClick={() => {
            setPage(1)
            setFilters((p) => ({
              ...p,
              status: p.status === 'completed' ? '' : 'completed',
            }))
          }}
        >
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <div className="stat-value">{interventionCounts.completed}</div>
            <div className="stat-label">已完成</div>
            <div className="stat-label" style={{ fontSize: 12, opacity: 0.9 }}>
              查看
            </div>
          </div>
        </button>
        <button
          type="button"
          className={`stat-card stat-filter-card ${filters.status === 'revoked' ? 'active' : ''}`}
          onClick={() => {
            setPage(1)
            setFilters((p) => ({
              ...p,
              status: p.status === 'revoked' ? '' : 'revoked',
            }))
          }}
        >
          <div className="stat-icon">⏹</div>
          <div className="stat-content">
            <div className="stat-value">{interventionCounts.revoked}</div>
            <div className="stat-label">已撤销</div>
            <div className="stat-label" style={{ fontSize: 12, opacity: 0.9 }}>
              查看
            </div>
          </div>
        </button>
      </div>

      {success && <div className="alert-success">{success}</div>}
      {listError && <div className="alert-error">{listError}</div>}

      <div className="warning-filters">
        <div className="filter-item student-search-filter">
          <label>学生</label>
          <div className="student-search-wrapper">
            <input
              type="text"
              className="student-search-input"
              placeholder="输入姓名或学号筛选"
              autoComplete="off"
              value={
                studentFilterDropdownOpen
                  ? studentFilterSearchInput
                  : filters.studentId
                    ? (() => {
                        const s = students.find((x) => x.id === filters.studentId)
                        return s ? `${s.name}（${s.studentId}）` : ''
                      })()
                    : ''
              }
              onChange={(e) => {
                setStudentFilterSearchInput(e.target.value)
                setStudentFilterDropdownOpen(true)
                if (!e.target.value.trim()) {
                  setPage(1)
                  setFilters((p) => ({ ...p, studentId: '' }))
                }
              }}
              onFocus={() => {
                setStudentFilterDropdownOpen(true)
                if (filters.studentId) setStudentFilterSearchInput('')
              }}
              onBlur={() => setTimeout(() => setStudentFilterDropdownOpen(false), 150)}
            />
            {studentFilterDropdownOpen && (
              <div className="student-search-dropdown student-search-dropdown--tall">
                <div
                  role="option"
                  className="student-search-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setPage(1)
                    setFilters((p) => ({ ...p, studentId: '' }))
                    setStudentFilterSearchInput('')
                    setStudentFilterDropdownOpen(false)
                  }}
                >
                  全部学生
                </div>
                {students
                  .filter((s) => {
                    const q = studentFilterSearchInput.trim().toLowerCase()
                    if (!q) return true
                    return (
                      s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
                    )
                  })
                  .map((s) => (
                    <div
                      key={s.id}
                      role="option"
                      className="student-search-option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setPage(1)
                        setFilters((p) => ({ ...p, studentId: s.id }))
                        setStudentFilterSearchInput('')
                        setStudentFilterDropdownOpen(false)
                      }}
                    >
                      {s.name}（{s.studentId}）
                    </div>
                  ))}
                {studentFilterSearchInput.trim() &&
                  students.filter((s) => {
                    const q = studentFilterSearchInput.trim().toLowerCase()
                    return (
                      s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
                    )
                  }).length === 0 && (
                    <div className="student-search-option student-search-empty">无匹配学生</div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="filter-item">
          <label>干预类型</label>
          <select
            value={filters.type}
            onChange={(e) => {
              setPage(1)
              setFilters((p) => ({ ...p, type: e.target.value }))
            }}
          >
            <option value="">全部类型</option>
            {interventionTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>状态</label>
          <select
            value={filters.status}
            onChange={(e) => {
              setPage(1)
              setFilters((p) => ({ ...p, status: e.target.value as FilterStatus }))
            }}
          >
            <option value="">全部状态</option>
            <option value="student_pending">待学生处理</option>
            <option value="pending_review">待审核</option>
            <option value="completed">已完成</option>
            <option value="revoked">已撤销</option>
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
          </select>
        </div>

        {(filters.studentId || filters.status || filters.type) && (
          <div className="filter-item" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={resetFilters} style={{ padding: '10px 16px' }}>
              🔄 重置筛选
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state">加载中...</div>
      ) : interventions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔧</div>
          <p>暂无干预记录</p>
        </div>
      ) : (
        <>
          <div className="students-table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>学生</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>描述</th>
                  <th>创建时间</th>
                  <th>链上</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((i) => (
                  <tr key={i._id}>
                    <td>{i.studentName}</td>
                    <td>{i.type}</td>
                    <td>
                      <span className={`status-badge ${statusBadgeClass(i.status)}`}>
                        {interventionStatusLabel(i.status)}
                      </span>
                    </td>
                    <td className="warning-message-cell" title={i.description}>
                      {i.description}
                    </td>
                    <td>{new Date(i.createdAt).toLocaleString('zh-CN')}</td>
                    {chainStatusCell(i)}
                    <td>
                      <div className="action-buttons">{primaryAction(i)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button type="button" className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
                上一页
              </button>
              <span className="page-info">
                第 {page} 页 / 共 {totalPages} 页
              </span>
              <button
                type="button"
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

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>创建干预</h3>
              <button type="button" className="modal-close" onClick={() => setShowCreateModal(false)}>
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
                <label>干预类型 *</label>
                <select
                  value={createData.type}
                  onChange={(e) => {
                    const type = e.target.value
                    setCreateData((p) => ({
                      ...p,
                      type,
                      description: getDefaultDescriptionForInterventionType(type),
                    }))
                  }}
                  required
                >
                  <option value="">请选择类型</option>
                  {interventionTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="form-hint" style={{ marginTop: 8 }}>
                  切换类型时会自动填入该类型的默认描述，您可直接修改后再提交。
                </p>
              </div>

              <div className="form-group">
                <label>干预描述 *</label>
                <textarea
                  className="warning-textarea"
                  value={createData.description}
                  onChange={(e) => setCreateData((p) => ({ ...p, description: e.target.value }))}
                  required
                  rows={4}
                  placeholder="根据所选类型自动填充，可修改"
                />
              </div>

              {createError && <div className="alert-error">{createError}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={chainBusy}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary" disabled={chainBusy}>
                  {chainBusy ? '上链中…' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailContext && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div
            className="modal-content modal-content-intervention-detail intervention-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header intervention-detail-modal-header">
              <div className="intervention-detail-modal-heading">
                <h3>{detailContext.mode === 'review' ? '审核干预' : '干预详情'}</h3>
                <span className={`status-badge ${statusBadgeClass(detailContext.intervention.status)}`}>
                  {interventionStatusLabel(detailContext.intervention.status)}
                </span>
              </div>
              <button type="button" className="modal-close" onClick={closeDetail} aria-label="关闭">
                ×
              </button>
            </div>

            {detailContext.mode === 'view' && (
              <>
                <div className="modal-body intervention-detail-body">
                  <InterventionDetailBody intervention={detailContext.intervention} eff={eff} />
                </div>
                <div className="modal-actions intervention-detail-modal-actions">
                  {(eff === 'student_pending' || eff === 'pending_review') && (
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => openRevokeFromDetail(detailContext.intervention)}
                    >
                      撤销干预
                    </button>
                  )}
                  <button type="button" className="btn-secondary" onClick={closeDetail}>
                    返回
                  </button>
                </div>
              </>
            )}

            {detailContext.mode === 'review' && (
              <form className="intervention-review-form" onSubmit={handleSubmitReview}>
                <div className="modal-body intervention-detail-body">
                  <InterventionDetailBody intervention={detailContext.intervention} eff="pending_review" />
                </div>

                <div className="intervention-review-extra">
                  <div className="form-group">
                    <label>审核结果 *</label>
                    <div className="intervention-review-radios">
                      <label className="checkbox-label">
                        <input
                          type="radio"
                          name="reviewResult"
                          checked={reviewResult === 'pass'}
                          onChange={() => setReviewResult('pass')}
                        />
                        <span>通过</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="radio"
                          name="reviewResult"
                          checked={reviewResult === 'fail'}
                          onChange={() => setReviewResult('fail')}
                        />
                        <span>不通过</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>审核意见（选填）</label>
                    <textarea
                      className="warning-textarea"
                      value={reviewOpinion}
                      onChange={(e) => setReviewOpinion(e.target.value)}
                      rows={3}
                      placeholder="选填"
                    />
                  </div>

                  {listError && <div className="alert-error">{listError}</div>}
                </div>

                <div className="modal-actions intervention-detail-modal-actions">
                  <button type="submit" className="btn-primary" disabled={detailActionLoading}>
                    {detailActionLoading ? '提交中…' : '提交审核'}
                  </button>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => openRevokeFromDetail(detailContext.intervention)}
                    disabled={detailActionLoading}
                  >
                    撤销干预
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeDetail}
                    disabled={detailActionLoading}
                  >
                    返回
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {revokeTarget && (
        <div className="modal-overlay" onClick={closeRevoke}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>撤销干预</h3>
              <button type="button" className="modal-close" onClick={closeRevoke}>
                ×
              </button>
            </div>
            <form onSubmit={handleConfirmRevoke}>
              <p style={{ marginBottom: 12, color: '#555' }}>
                确定撤销对「{revokeTarget.studentName}」的干预？状态将变为「已撤销」。
              </p>
              <div className="form-group">
                <label>撤销原因 *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {REVOKE_REASON_PRESETS.map((text) => (
                    <button
                      key={text}
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => {
                        setRevokeReason(text)
                        setRevokeError('')
                      }}
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <textarea
                  className="warning-textarea"
                  value={revokeReason}
                  onChange={(e) => {
                    setRevokeReason(e.target.value)
                    if (revokeError) setRevokeError('')
                  }}
                  required
                  rows={3}
                />
              </div>
              {revokeError && <div className="alert-error">{revokeError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeRevoke} disabled={revokeChainBusy}>
                  关闭
                </button>
                <button type="submit" className="btn-delete" disabled={revokeChainBusy}>
                  {revokeChainBusy ? '链上确认中…' : '确认撤销'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
