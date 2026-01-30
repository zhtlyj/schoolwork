import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'staff' | 'admin',
    studentId: '',
    staffId: '',
    name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证密码确认
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    // 验证必填字段
    if (formData.role === 'student' && !formData.studentId) {
      setError('请输入学号')
      return
    }

    if ((formData.role === 'staff' || formData.role === 'admin') && !formData.staffId) {
      setError('请输入工号')
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, ...registerData } = formData
      await register(registerData)
      // 注册成功后跳转到登录页面
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>注册</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="role">身份</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="student">学生</option>
              <option value="staff">教职工</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="name">姓名</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="请输入姓名"
            />
          </div>
          {formData.role === 'student' && (
            <div className="form-group">
              <label htmlFor="studentId">学号</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                required
                placeholder="请输入学号"
              />
            </div>
          )}
          {formData.role === 'staff' && (
            <div className="form-group">
              <label htmlFor="staffId">工号</label>
              <input
                type="text"
                id="staffId"
                name="staffId"
                value={formData.staffId}
                onChange={handleChange}
                required
                placeholder="请输入工号"
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="请输入用户名（3-20个字符）"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="请输入邮箱"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="请输入密码（至少6个字符）"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="请再次输入密码"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="auth-link">
          已有账号？<Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  )
}

