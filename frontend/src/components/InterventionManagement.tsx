import { useState, useEffect } from 'react'
import { interventionService, Intervention, CreateInterventionData } from '../services/interventions'
import { studentService, Student } from '../services/students'
import '../pages/Home.css'

interface InterventionManagementProps {
  interventionTypes: string[]
}

// 干预管理组件（教职工/管理员：对学生下发干预 + 列表筛选 + 状态管理）
export default function InterventionManagement({ interventionTypes }: InterventionManagementProps) {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [filters, setFilters] = useState<{
    studentId: string
    status: '' | 'pending' | 'in-progress' | 'completed' | 'cancelled'
    type: string
  }>({ studentId: '', status: '', type: '' })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createData, setCreateData] = useState<CreateInterventionData>({
    studentId: '',
    type: '',
    description: '',
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getStatusClass = (status: Intervention['status']) => {
    switch (status) {
      case 'completed':
        return 'status-completed'
      case 'in-progress':
        return 'status-in-progress'
      case 'pending':
        return 'status-pending'
      case 'cancelled':
        return 'status-pending'
      default:
        return ''
    }
  }

  const getStatusText = (status: Intervention['status']) => {
    switch (status) {
      case 'completed':
        return '已完成'
      case 'in-progress':
        return '进行中'
      case 'pending':
        return '待处理'
      case 'cancelled':
        return '已取消'
      default:
        return ''
    }
  }

  const fetchStudents = async () => {
    try {
      const res = await studentService.getStudents({ page: 1, limit: 200 })
      setStudents(res.students)
    } catch {
      // 学生列表失败不阻塞干预管理
    }
  }

  const fetchInterventions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await interventionService.getInterventions({
        page,
        limit: pageSize,
        studentId: filters.studentId || undefined,
        status: (filters.status || undefined) as any,
        type: filters.type || undefined,
      })
      setInterventions(res.interventions)
      setTotalPages(res.pagination.totalPages)
    } catch (err: any) {
      setError(err.response?.data?.message || '获取干预列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    fetchInterventions()
  }, [page, pageSize, filters.studentId, filters.status, filters.type])

  const resetFilters = () => {
    setFilters({ studentId: '', status: '', type: '' })
    setPage(1)
  }

  const openCreate = () => {
    setError('')
    setSuccess('')
    setCreateData({
      studentId: '',
      type: interventionTypes[0] || '',
      description: '',
    })
    setShowCreateModal(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!createData.studentId || !createData.type || !createData.description) {
      setError('请填写学生、干预类型和干预描述')
      return
    }

    // 验证 studentId 是否为有效的 ID（不是显示文本）
    const selectedStudent = students.find((s) => s.id === createData.studentId)
    if (!selectedStudent) {
      setError('请选择有效的学生')
      return
    }

    // 确保使用正确的 studentId
    const submitData = {
      ...createData,
      studentId: selectedStudent.id, // 确保使用真实的 ID
    }

    console.log('提交干预数据:', submitData)

    try {
      await interventionService.createIntervention(submitData)
      setShowCreateModal(false)
      setSuccess('创建干预成功')
      setPage(1)
      fetchInterventions()
      // 重置表单
      setCreateData({
        studentId: '',
        type: '',
        description: '',
      })
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || '创建干预失败'
      console.error('创建干预错误详情:', err.response?.data)
      setError(errorMessage)
    }
  }

  const handleUpdateStatus = async (intervention: Intervention, status: 'pending' | 'in-progress' | 'completed' | 'cancelled') => {
    setError('')
    setSuccess('')
    try {
      await interventionService.updateIntervention(intervention._id, { status })
      setSuccess('更新干预状态成功')
      fetchInterventions()
    } catch (err: any) {
      setError(err.response?.data?.message || '更新干预状态失败')
    }
  }

  const handleDelete = async (intervention: Intervention) => {
    setError('')
    setSuccess('')
    const ok = window.confirm(`确定删除对【${intervention.studentName}】的干预记录吗？此操作不可恢复。`)
    if (!ok) return

    try {
      await interventionService.deleteIntervention(intervention._id)
      setSuccess('删除干预记录成功')
      fetchInterventions()
    } catch (err: any) {
      setError(err.response?.data?.message || '删除干预记录失败')
    }
  }

  return (
    <div className="page-content">
      <div className="students-header">
        <h2 className="page-title">🔧 干预管理</h2>
        <button className="btn-primary" onClick={openCreate}>
          ➕ 创建干预
        </button>
      </div>

      {success && <div className="alert-success">{success}</div>}
      {error && <div className="alert-error">{error}</div>}

      {/* 筛选区域 */}
      <div className="warning-filters">
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
              setFilters((p) => ({ ...p, status: e.target.value as any }))
            }}
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="in-progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
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
            <button className="btn-secondary" onClick={resetFilters} style={{ padding: '10px 16px' }}>
              🔄 重置筛选
            </button>
          </div>
        )}
      </div>

      {/* 列表区域 */}
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
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((i) => (
                  <tr key={i._id}>
                    <td>{i.studentName}</td>
                    <td>{i.type}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(i.status)}`}>
                        {getStatusText(i.status)}
                      </span>
                    </td>
                    <td className="warning-message-cell" title={i.description}>
                      {i.description}
                    </td>
                    <td>{new Date(i.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        {i.status !== 'completed' && i.status !== 'cancelled' && (
                          <button
                            className="btn-edit"
                            onClick={() => handleUpdateStatus(i, 'completed')}
                          >
                            标记完成
                          </button>
                        )}
                        <button className="btn-delete" onClick={() => handleDelete(i)}>
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
                第 {page} 页 / 共 {totalPages} 页
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

      {/* 创建干预模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>创建干预</h3>
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
                <label>干预类型 *</label>
                <select
                  value={createData.type}
                  onChange={(e) => setCreateData((p) => ({ ...p, type: e.target.value }))}
                  required
                >
                  <option value="">请选择类型</option>
                  {interventionTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>干预描述 *</label>
                <textarea
                  className="warning-textarea"
                  value={createData.description}
                  onChange={(e) =>
                    setCreateData((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
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
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

