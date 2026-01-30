import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { studentService } from '../services/students'
import '../pages/Home.css'

/**
 * 个人中心组件
 * 支持查看和编辑个人信息、修改密码
 */
export default function UserProfile() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 个人信息表单
  const [infoForm, setInfoForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    username: user?.username || '',
  })

  // 密码修改表单
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // 处理个人信息更新
  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 目前只支持学生更新，教职工和管理员暂时不支持
      if (user.role === 'student') {
        const updateData: any = {}
        if (infoForm.name !== user.name) updateData.name = infoForm.name
        if (infoForm.email !== user.email) updateData.email = infoForm.email
        if (infoForm.username !== user.username) updateData.username = infoForm.username

        if (Object.keys(updateData).length === 0) {
          setError('没有需要更新的信息')
          setLoading(false)
          return
        }

        const response = await studentService.updateStudent(user.id, updateData)
        
        // 更新本地存储的用户信息
        const updatedUser = {
          ...user,
          ...response.student,
        }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        
        // 更新 AuthContext 中的用户信息（需要重新登录以获取最新 token）
        setSuccess('个人信息更新成功，请重新登录以刷新信息')
      } else {
        setError('教职工和管理员的个人信息更新功能开发中...')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '更新个人信息失败')
    } finally {
      setLoading(false)
    }
  }

  // 处理密码修改
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')
    setSuccess('')

    // 验证新密码
    if (passwordForm.newPassword.length < 6) {
      setError('新密码至少需要6个字符')
      setLoading(false)
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('两次输入的密码不一致')
      setLoading(false)
      return
    }

    try {
      // 目前只支持学生修改密码
      if (user.role === 'student') {
        await studentService.updateStudent(user.id, {
          password: passwordForm.newPassword,
        })
        
        setSuccess('密码修改成功，请使用新密码登录')
        // 清空表单
        setPasswordForm({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        setError('教职工和管理员的密码修改功能开发中...')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '修改密码失败')
    } finally {
      setLoading(false)
    }
  }

  // 重置表单
  const handleResetInfo = () => {
    setInfoForm({
      name: user?.name || '',
      email: user?.email || '',
      username: user?.username || '',
    })
    setError('')
    setSuccess('')
  }

  const handleResetPassword = () => {
    setPasswordForm({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setError('')
    setSuccess('')
  }

  if (!user) {
    return (
      <div className="page-content">
        <h2 className="page-title">👤 个人中心</h2>
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <p>未获取到用户信息</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <h2 className="page-title">👤 个人中心</h2>

      {/* 标签页 */}
      <div className="profile-tabs">
        <button
          className={`profile-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('info')
            setError('')
            setSuccess('')
          }}
        >
          📝 个人信息
        </button>
        <button
          className={`profile-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('password')
            setError('')
            setSuccess('')
          }}
        >
          🔒 修改密码
        </button>
      </div>

      {/* 个人信息标签页 */}
      {activeTab === 'info' && (
        <div className="profile-tab-content">
          <div className="profile-section">
            {/* 个人信息展示 */}
            <div className="profile-card">
              <h3>个人信息</h3>
              <div className="profile-info">
                <p>
                  <strong>姓名:</strong> {user.name}
                </p>
                <p>
                  <strong>用户名:</strong> {user.username}
                </p>
                <p>
                  <strong>邮箱:</strong> {user.email}
                </p>
                {user.studentId && (
                  <p>
                    <strong>学号:</strong> {user.studentId}
                  </p>
                )}
                {user.staffId && (
                  <p>
                    <strong>工号:</strong> {user.staffId}
                  </p>
                )}
                <p>
                  <strong>身份:</strong>{' '}
                  {user.role === 'student' && '👨‍🎓 学生'}
                  {user.role === 'staff' && '👨‍🏫 教职工'}
                  {user.role === 'admin' && '👑 管理员'}
                </p>
              </div>
            </div>

            {/* 编辑个人信息 */}
            {user.role === 'student' ? (
              <div className="profile-card">
                <h3>编辑个人信息</h3>
                {error && <div className="alert-error">{error}</div>}
                {success && <div className="alert-success">{success}</div>}
                <form onSubmit={handleUpdateInfo} className="profile-form">
                  <div className="form-group">
                    <label>姓名 *</label>
                    <input
                      type="text"
                      value={infoForm.name}
                      onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                      required
                      minLength={1}
                      maxLength={50}
                    />
                  </div>

                  <div className="form-group">
                    <label>用户名 *</label>
                    <input
                      type="text"
                      value={infoForm.username}
                      onChange={(e) => setInfoForm({ ...infoForm, username: e.target.value })}
                      required
                      minLength={3}
                      maxLength={20}
                    />
                    <p className="form-hint">用户名长度为3-20个字符</p>
                  </div>

                  <div className="form-group">
                    <label>邮箱 *</label>
                    <input
                      type="email"
                      value={infoForm.email}
                      onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? '保存中...' : '保存修改'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleResetInfo}>
                      重置
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="profile-card">
                <h3>账户设置</h3>
                <div className="info-card">
                  <p>教职工和管理员的个人信息编辑功能开发中...</p>
                  <p className="info-text">如需修改信息，请联系系统管理员</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 修改密码标签页 */}
      {activeTab === 'password' && (
        <div className="profile-tab-content">
          <div className="profile-section">
            <div className="profile-card">
              <h3>修改密码</h3>
              {error && <div className="alert-error">{error}</div>}
              {success && <div className="alert-success">{success}</div>}
              {user.role === 'student' ? (
                <form onSubmit={handleChangePassword} className="profile-form">
                  <div className="form-group">
                    <label>新密码 *</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      required
                      minLength={6}
                      placeholder="至少6个字符"
                    />
                    <p className="form-hint">密码长度至少6个字符</p>
                  </div>

                  <div className="form-group">
                    <label>确认新密码 *</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      required
                      minLength={6}
                      placeholder="请再次输入新密码"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? '修改中...' : '修改密码'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleResetPassword}>
                      重置
                    </button>
                  </div>
                </form>
              ) : (
                <div className="info-card">
                  <p>教职工和管理员的密码修改功能开发中...</p>
                  <p className="info-text">如需修改密码，请联系系统管理员</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

