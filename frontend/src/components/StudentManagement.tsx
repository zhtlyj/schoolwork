import { useEffect, useState } from 'react'
import { studentService, Student, CreateStudentData, UpdateStudentData } from '../services/students'
import { warningService } from '../services/warnings'

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState<CreateStudentData>({
    username: '',
    email: '',
    password: '',
    studentId: '',
    name: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [warningCountByStudent, setWarningCountByStudent] = useState<Record<string, { total: number; high: number; medium: number; low: number }>>({})

  // 获取预警数据（按学生统计）
  const fetchWarningCounts = async () => {
    try {
      const res = await warningService.getWarnings({ page: 1, limit: 500 })
      const map: Record<string, { total: number; high: number; medium: number; low: number }> = {}
      for (const w of res.warnings) {
        if (!map[w.studentId]) map[w.studentId] = { total: 0, high: 0, medium: 0, low: 0 }
        map[w.studentId].total++
        if (w.level === 'high') map[w.studentId].high++
        else if (w.level === 'medium') map[w.studentId].medium++
        else map[w.studentId].low++
      }
      setWarningCountByStudent(map)
    } catch {
      setWarningCountByStudent({})
    }
  }

  // 获取学生列表
  const fetchStudents = async () => {
    setLoading(true)
    try {
      const response = await studentService.getStudents({
        search,
        page,
        limit: 10,
      })
      setStudents(response.students)
      setTotalPages(response.pagination.totalPages)
    } catch (err: any) {
      setError(err.response?.data?.message || '获取学生列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search])

  useEffect(() => {
    fetchWarningCounts()
  }, [])

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  // 打开添加模态框
  const handleAdd = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      studentId: '',
      name: '',
    })
    setError('')
    setSuccess('')
    setShowAddModal(true)
  }

  // 打开编辑模态框
  const handleEdit = (student: Student) => {
    setSelectedStudent(student)
    setFormData({
      username: student.username,
      email: student.email,
      password: '',
      studentId: student.studentId,
      name: student.name,
    })
    setError('')
    setSuccess('')
    setShowEditModal(true)
  }

  // 打开删除模态框
  const handleDelete = (student: Student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  // 提交添加
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await studentService.createStudent(formData)
      setSuccess('添加学生成功')
      setShowAddModal(false)
      fetchStudents()
      fetchWarningCounts()
    } catch (err: any) {
      setError(err.response?.data?.message || '添加学生失败')
    }
  }

  // 提交编辑
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    setError('')
    setSuccess('')

    const updateData: UpdateStudentData = {
      username: formData.username,
      email: formData.email,
      studentId: formData.studentId,
      name: formData.name,
    }

    // 如果密码不为空，则更新密码
    if (formData.password) {
      updateData.password = formData.password
    }

    try {
      await studentService.updateStudent(selectedStudent.id, updateData)
      setSuccess('更新学生信息成功')
      setShowEditModal(false)
      fetchStudents()
    } catch (err: any) {
      setError(err.response?.data?.message || '更新学生信息失败')
    }
  }

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!selectedStudent) return

    try {
      await studentService.deleteStudent(selectedStudent.id)
      setSuccess('删除学生成功')
      setShowDeleteModal(false)
      fetchStudents()
      fetchWarningCounts()
    } catch (err: any) {
      setError(err.response?.data?.message || '删除学生失败')
    }
  }

  return (
    <div className="page-content">
      <div className="students-header">
        <h2 className="page-title">👥 学生管理</h2>
        <button className="btn-primary" onClick={handleAdd}>
          ➕ 添加学生
        </button>
      </div>

      {success && <div className="alert-success">{success}</div>}
      {error && <div className="alert-error">{error}</div>}

      <div className="students-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索学生（姓名、邮箱、学号）"
            value={search}
            onChange={handleSearch}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">加载中...</div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>暂无学生数据</p>
        </div>
      ) : (
        <>
          <div className="students-table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>学号</th>
                  <th>姓名</th>
                  <th>邮箱</th>
                  <th>预警情况</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const wc = warningCountByStudent[student.id]
                  const parts: string[] = []
                  if (wc && wc.total > 0) {
                    parts.push(`${wc.total} 条`)
                    if (wc.high > 0) parts.push(`高危 ${wc.high}`)
                    if (wc.medium > 0) parts.push(`中危 ${wc.medium}`)
                    if (wc.low > 0) parts.push(`低危 ${wc.low}`)
                  }
                  const warningText = parts.length === 0 ? '无' : parts.join(' / ')
                  return (
                  <tr key={student.id}>
                    <td>{student.studentId}</td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                    <td>
                      <span className={wc && wc.total > 0 ? (wc.high > 0 ? 'warning-badge high' : wc.medium > 0 ? 'warning-badge medium' : 'warning-badge low') : 'warning-badge none'}>
                        {warningText}
                      </span>
                    </td>
                    <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(student)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(student)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </button>
            <span className="page-info">
              第 {page} / {totalPages} 页
            </span>
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
            </button>
          </div>
        </>
      )}

      {/* 添加学生模态框 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加学生</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitAdd}>
              <div className="form-group">
                <label>用户名 *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>邮箱 *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>密码 *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>学号 *</label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) => setFormData((p) => ({ ...p, studentId: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>姓名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              {error && <div className="alert-error">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
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

      {/* 编辑学生模态框 */}
      {showEditModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>编辑学生信息</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitEdit}>
              <div className="form-group">
                <label>用户名 *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>邮箱 *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>密码（不填则不修改）</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>学号 *</label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) => setFormData((p) => ({ ...p, studentId: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>姓名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              {error && <div className="alert-error">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认删除</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                确认删除学生「{selectedStudent.name}（{selectedStudent.studentId}）」吗？
              </p>
              <p className="modal-warning-text">此操作不可恢复，请谨慎操作。</p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                取消
              </button>
              <button type="button" className="btn-danger" onClick={handleConfirmDelete}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


