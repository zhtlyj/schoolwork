import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import StudentManagement from '../components/StudentManagement'
import StatisticsDashboard from '../components/StatisticsDashboard'
import InterventionManagement from '../components/InterventionManagement'
import WarningManagement from '../components/WarningManagement'
import WarningList from '../components/WarningList'
import MyGrades from '../components/MyGrades'
import LearningRecords from '../components/LearningRecords'
import UserProfile from '../components/UserProfile'
import { warningService, Warning } from '../services/warnings'
import { interventionService, Intervention } from '../services/interventions'
import './Home.css'


export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'warnings' | 'interventions'>('overview')
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'warning' | 'intervention' | 'blockchain' | 'system' | 'permission'>('warning')
  
  // 设置数据
  const [warningSettings, setWarningSettings] = useState({
    gradeThreshold: 60,
    attendanceThreshold: 3,
    assignmentThreshold: 2,
    enableAutoWarning: true,
  })
  
  const [interventionSettings, setInterventionSettings] = useState({
    autoIntervention: false,
    interventionTypes: ['学习辅导', '出勤提醒', '家长沟通', '心理辅导'],
    defaultDuration: 30,
  })
  
  const [blockchainSettings, setBlockchainSettings] = useState({
    enableBlockchain: true,
    autoUpload: true,
    network: 'testnet',
    contractAddress: '0x1234567890abcdef',
  })
  
  const [systemSettings, setSystemSettings] = useState({
    systemName: '学生学业预警与学习干预系统',
    maintenanceMode: false,
    dataRetention: 365,
    maxFileSize: 10,
  })

  // 预警数据状态（用于统计卡片）
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [warningsLoading, setWarningsLoading] = useState(false)

  // 干预记录数据状态（用于统计卡片）
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [interventionsLoading, setInterventionsLoading] = useState(false)

  // 获取预警数据（用于统计卡片）
  useEffect(() => {
    const fetchWarnings = async () => {
      setWarningsLoading(true)
      try {
        // 学生端获取自己的预警，教职工/管理员获取全部预警
        const res = await warningService.getWarnings({
          page: 1,
          limit: 100,
        })
        setWarnings(res.warnings)
      } catch (err) {
        console.error('获取预警数据失败:', err)
      } finally {
        setWarningsLoading(false)
      }
    }

    if (user) {
      fetchWarnings()
    }
  }, [user])

  // 获取干预记录数据（用于统计卡片）
  useEffect(() => {
    const fetchInterventions = async () => {
      setInterventionsLoading(true)
      try {
        // 学生端获取自己的干预，教职工/管理员获取全部干预
        const res = await interventionService.getInterventions({
          page: 1,
          limit: 100,
        })
        setInterventions(res.interventions)
      } catch (err) {
        console.error('获取干预记录失败:', err)
      } finally {
        setInterventionsLoading(false)
      }
    }

    if (user) {
      fetchInterventions()
    }
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="system-title">
              <span className="blockchain-icon">⛓️</span>
              学生学业预警与学习干预系统
            </h1>
          </div>
          <nav className="header-nav">
            {user?.role === 'student' ? (
              <>
                <button
                  className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveNav('dashboard')
                    setActiveTab('overview')
                  }}
                >
                  <span className="nav-icon">📊</span>
                  首页
                </button>
                <button
                  className={`nav-item ${activeNav === 'grades' ? 'active' : ''}`}
                  onClick={() => setActiveNav('grades')}
                >
                  <span className="nav-icon">📝</span>
                  我的成绩
                </button>
                <button
                  className={`nav-item ${activeNav === 'warnings' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveNav('warnings')
                    setActiveTab('warnings')
                  }}
                >
                  <span className="nav-icon">⚠️</span>
                  我的预警
                </button>
                <button
                  className={`nav-item ${activeNav === 'records' ? 'active' : ''}`}
                  onClick={() => setActiveNav('records')}
                >
                  <span className="nav-icon">📚</span>
                  学习记录
                </button>
                <button
                  className={`nav-item ${activeNav === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveNav('profile')}
                >
                  <span className="nav-icon">👤</span>
                  个人中心
                </button>
              </>
            ) : (
              <>
                <button
                  className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveNav('dashboard')
                    setActiveTab('overview')
                  }}
                >
                  <span className="nav-icon">📊</span>
                  仪表板
                </button>
                <button
                  className={`nav-item ${activeNav === 'students' ? 'active' : ''}`}
                  onClick={() => setActiveNav('students')}
                >
                  <span className="nav-icon">👥</span>
                  学生管理
                </button>
                <button
                  className={`nav-item ${activeNav === 'warnings' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveNav('warnings')
                    setActiveTab('warnings')
                  }}
                >
                  <span className="nav-icon">⚠️</span>
                  预警管理
                </button>
                <button
                  className={`nav-item ${activeNav === 'interventions' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveNav('interventions')
                    setActiveTab('interventions')
                  }}
                >
                  <span className="nav-icon">🔧</span>
                  干预管理
                </button>
                <button
                  className={`nav-item ${activeNav === 'statistics' ? 'active' : ''}`}
                  onClick={() => setActiveNav('statistics')}
                >
                  <span className="nav-icon">📈</span>
                  数据统计
                </button>
                <button
                  className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveNav('settings')}
                >
                  <span className="nav-icon">⚙️</span>
                  系统设置
                </button>
              </>
            )}
          </nav>
          <div className="header-right">
            <div
              className="user-profile"
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ cursor: 'pointer' }}
            >
              <div className="user-info-dropdown">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">
                  {user?.role === 'student' && '👨‍🎓 学生'}
                  {user?.role === 'staff' && '👨‍🏫 教职工'}
                  {user?.role === 'admin' && '👑 管理员'}
                </span>
                {user?.studentId && <span className="user-id">学号: {user.studentId}</span>}
                {user?.staffId && <span className="user-id">工号: {user.staffId}</span>}
              </div>
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <button
                    className="menu-item"
                    onClick={() => {
                      setActiveNav('profile')
                      setShowUserMenu(false)
                    }}
                  >
                    <span className="menu-icon">👤</span>
                    个人设置
                  </button>
                  <button className="menu-item" onClick={handleLogout}>
                    <span className="menu-icon">🚪</span>
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="dashboard">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-value">
                  {warningsLoading ? '...' : warnings.length}
                </div>
                <div className="stat-label">预警数量</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">
                  {warningsLoading
                    ? '...'
                    : warnings.filter((w) => w.level === 'high').length}
                </div>
                <div className="stat-label">高危预警</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔧</div>
              <div className="stat-content">
                <div className="stat-value">
                  {interventionsLoading ? '...' : interventions.length}
                </div>
                <div className="stat-label">干预记录</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⛓️</div>
              <div className="stat-content">
                <div className="stat-value">
                  {warningsLoading
                    ? '...'
                    : warnings.filter((w) => w.blockHash).length}
                </div>
                <div className="stat-label">已上链数据</div>
              </div>
            </div>
          </div>

          {activeNav === 'dashboard' && (
            <div className="content-tabs">
              <button
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                总览
              </button>
              <button
                className={`tab-btn ${activeTab === 'warnings' ? 'active' : ''}`}
                onClick={() => setActiveTab('warnings')}
              >
                预警信息
              </button>
              <button
                className={`tab-btn ${activeTab === 'interventions' ? 'active' : ''}`}
                onClick={() => setActiveTab('interventions')}
              >
                干预记录
              </button>
            </div>
          )}

          <div className="tab-content">
            {activeNav === 'dashboard' && activeTab === 'overview' && (
              <div className="overview-section">
                <div className="section-card">
                  <h2>系统简介</h2>
                  <p>
                    本系统基于区块链技术，实现学生学业数据的可信存储和预警分析。
                    通过智能合约确保数据的不可篡改性，为学习干预提供可靠的数据支撑。
                  </p>
                </div>
                <div className="section-card">
                  <h2>核心功能</h2>
                  <ul className="feature-list">
                    <li>📈 学业数据实时监控与分析</li>
                    <li>⚠️ 多维度学业预警机制</li>
                    <li>🔧 个性化学习干预方案</li>
                    <li>⛓️ 区块链数据上链存储</li>
                    <li>📊 数据可视化分析报告</li>
                  </ul>
                </div>
                {user?.role === 'student' && (
                  <div className="section-card">
                    <h2>学习建议</h2>
                    <div className="suggestion-list">
                      <div className="suggestion-item">
                        <span className="suggestion-icon">📚</span>
                        <span>建议加强高等数学的学习，可申请一对一辅导</span>
                      </div>
                      <div className="suggestion-item">
                        <span className="suggestion-icon">⏰</span>
                        <span>注意出勤率，确保按时参加课程</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeNav === 'warnings' && (user?.role === 'staff' || user?.role === 'admin') && (
              <WarningManagement
                gradeThreshold={warningSettings.gradeThreshold}
                attendanceThreshold={warningSettings.attendanceThreshold}
              />
            )}
            {activeNav === 'warnings' && user?.role === 'student' && (
              <div className="page-content">
                <h2 className="page-title">⚠️ 我的预警</h2>
                <WarningList />
              </div>
            )}
            {activeNav === 'dashboard' && activeTab === 'warnings' && (
              <WarningList />
            )}

            {activeNav === 'interventions' && (user?.role === 'staff' || user?.role === 'admin') && (
              <InterventionManagement interventionTypes={interventionSettings.interventionTypes} />
            )}
            {(activeNav === 'dashboard' && activeTab === 'interventions') && (
              <InterventionManagement interventionTypes={interventionSettings.interventionTypes} />
            )}

            {/* 学生功能页面 */}
            {user?.role === 'student' && activeNav === 'grades' && <MyGrades />}

            {user?.role === 'student' && activeNav === 'records' && <LearningRecords />}

            {user?.role === 'student' && activeNav === 'profile' && <UserProfile />}

            {/* 教职工和管理员功能页面 */}
            {(user?.role === 'staff' || user?.role === 'admin') && activeNav === 'students' && (
              <StudentManagement />
            )}

            {(user?.role === 'staff' || user?.role === 'admin') && activeNav === 'statistics' && (
              <StatisticsDashboard />
            )}

            {(user?.role === 'staff' || user?.role === 'admin') && activeNav === 'settings' && (
              <div className="page-content">
                <h2 className="page-title">⚙️ 系统设置</h2>
                
                <div className="settings-tabs">
                  <button
                    className={`settings-tab-btn ${settingsTab === 'warning' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('warning')}
                  >
                    ⚠️ 预警规则
                  </button>
                  <button
                    className={`settings-tab-btn ${settingsTab === 'intervention' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('intervention')}
                  >
                    🔧 干预方案
                  </button>
                  <button
                    className={`settings-tab-btn ${settingsTab === 'blockchain' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('blockchain')}
                  >
                    ⛓️ 区块链配置
                  </button>
                  <button
                    className={`settings-tab-btn ${settingsTab === 'system' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('system')}
                  >
                    🖥️ 系统参数
                  </button>
                  <button
                    className={`settings-tab-btn ${settingsTab === 'permission' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('permission')}
                  >
                    👥 权限管理
        </button>
      </div>

                <div className="settings-content">
                  {settingsTab === 'warning' && (
                    <div className="settings-panel">
                      <h3>预警规则配置</h3>
                      <div className="settings-form">
                        <div className="form-group">
                          <label>成绩预警阈值</label>
                          <div className="input-group">
                            <input
                              type="number"
                              value={warningSettings.gradeThreshold}
                              onChange={(e) =>
                                setWarningSettings({
                                  ...warningSettings,
                                  gradeThreshold: parseInt(e.target.value) || 60,
                                })
                              }
                              min="0"
                              max="100"
                            />
                            <span className="input-suffix">分</span>
                          </div>
                          <p className="form-hint">成绩低于此分数将触发预警</p>
                        </div>

                        <div className="form-group">
                          <label>出勤预警阈值</label>
                          <div className="input-group">
                            <input
                              type="number"
                              value={warningSettings.attendanceThreshold}
                              onChange={(e) =>
                                setWarningSettings({
                                  ...warningSettings,
                                  attendanceThreshold: parseInt(e.target.value) || 3,
                                })
                              }
                              min="0"
                            />
                            <span className="input-suffix">次</span>
                          </div>
                          <p className="form-hint">缺勤次数超过此值将触发预警</p>
                        </div>

                        <div className="form-group">
                          <label>作业预警阈值</label>
                          <div className="input-group">
                            <input
                              type="number"
                              value={warningSettings.assignmentThreshold}
                              onChange={(e) =>
                                setWarningSettings({
                                  ...warningSettings,
                                  assignmentThreshold: parseInt(e.target.value) || 2,
                                })
                              }
                              min="0"
                            />
                            <span className="input-suffix">次</span>
                          </div>
                          <p className="form-hint">未交作业次数超过此值将触发预警</p>
                        </div>

                        <div className="form-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={warningSettings.enableAutoWarning}
                              onChange={(e) =>
                                setWarningSettings({
                                  ...warningSettings,
                                  enableAutoWarning: e.target.checked,
                                })
                              }
                            />
                            <span>启用自动预警</span>
                          </label>
                          <p className="form-hint">系统将自动检测并生成预警信息</p>
                        </div>

                        <div className="form-actions">
                          <button className="btn-primary">保存设置</button>
                          <button className="btn-secondary">重置</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'intervention' && (
                    <div className="settings-panel">
                      <h3>干预方案配置</h3>
                      <div className="settings-form">
                        <div className="form-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={interventionSettings.autoIntervention}
                              onChange={(e) =>
                                setInterventionSettings({
                                  ...interventionSettings,
                                  autoIntervention: e.target.checked,
                                })
                              }
                            />
                            <span>自动生成干预方案</span>
                          </label>
                          <p className="form-hint">系统将根据预警自动生成干预建议</p>
                        </div>

                        <div className="form-group">
                          <label>干预类型</label>
                          <div className="intervention-types">
                            {interventionSettings.interventionTypes.map((type, index) => (
                              <div key={index} className="intervention-type-tag">
                                {type}
                                <button
                                  className="remove-btn"
                                  onClick={() => {
                                    const newTypes = [...interventionSettings.interventionTypes]
                                    newTypes.splice(index, 1)
                                    setInterventionSettings({
                                      ...interventionSettings,
                                      interventionTypes: newTypes,
                                    })
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <input
                              type="text"
                              placeholder="添加新类型"
                              className="add-type-input"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value) {
                                  setInterventionSettings({
                                    ...interventionSettings,
                                    interventionTypes: [
                                      ...interventionSettings.interventionTypes,
                                      e.currentTarget.value,
                                    ],
                                  })
                                  e.currentTarget.value = ''
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>默认干预周期</label>
                          <div className="input-group">
                            <input
                              type="number"
                              value={interventionSettings.defaultDuration}
                              onChange={(e) =>
                                setInterventionSettings({
                                  ...interventionSettings,
                                  defaultDuration: parseInt(e.target.value) || 30,
                                })
                              }
                              min="1"
                            />
                            <span className="input-suffix">天</span>
                          </div>
                          <p className="form-hint">默认干预方案执行周期</p>
                        </div>

                        <div className="form-actions">
                          <button className="btn-primary">保存设置</button>
                          <button className="btn-secondary">重置</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'blockchain' && (
                    <div className="settings-panel">
                      <h3>区块链配置</h3>
                      <div className="settings-form">
                        <div className="form-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={blockchainSettings.enableBlockchain}
                              onChange={(e) =>
                                setBlockchainSettings({
                                  ...blockchainSettings,
                                  enableBlockchain: e.target.checked,
                                })
                              }
                            />
                            <span>启用区块链存储</span>
                          </label>
                          <p className="form-hint">启用后将重要数据上链存储，确保数据不可篡改</p>
                        </div>

                        <div className="form-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={blockchainSettings.autoUpload}
                              onChange={(e) =>
                                setBlockchainSettings({
                                  ...blockchainSettings,
                                  autoUpload: e.target.checked,
                                })
                              }
                              disabled={!blockchainSettings.enableBlockchain}
                            />
                            <span>自动上链</span>
                          </label>
                          <p className="form-hint">数据变更时自动上传到区块链</p>
                        </div>

                        <div className="form-group">
                          <label>区块链网络</label>
                          <select
                            value={blockchainSettings.network}
                            onChange={(e) =>
                              setBlockchainSettings({
                                ...blockchainSettings,
                                network: e.target.value,
                              })
                              }
                            disabled={!blockchainSettings.enableBlockchain}
                          >
                            <option value="testnet">测试网络</option>
                            <option value="mainnet">主网络</option>
                            <option value="local">本地网络</option>
                          </select>
                          <p className="form-hint">选择区块链网络环境</p>
                        </div>

                        <div className="form-group">
                          <label>智能合约地址</label>
                          <input
                            type="text"
                            value={blockchainSettings.contractAddress}
                            onChange={(e) =>
                              setBlockchainSettings({
                                ...blockchainSettings,
                                contractAddress: e.target.value,
                              })
                            }
                            disabled={!blockchainSettings.enableBlockchain}
                            placeholder="0x..."
                          />
                          <p className="form-hint">数据存储智能合约的地址</p>
                        </div>

                        <div className="form-actions">
                          <button className="btn-primary">保存设置</button>
                          <button className="btn-secondary">重置</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'system' && (
                    <div className="settings-panel">
                      <h3>系统参数配置</h3>
                      <div className="settings-form">
                        <div className="form-group">
                          <label>系统名称</label>
                          <input
                            type="text"
                            value={systemSettings.systemName}
                            onChange={(e) =>
                              setSystemSettings({
                                ...systemSettings,
                                systemName: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="form-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={systemSettings.maintenanceMode}
                              onChange={(e) =>
                                setSystemSettings({
                                  ...systemSettings,
                                  maintenanceMode: e.target.checked,
                                })
                              }
                            />
                            <span>维护模式</span>
                          </label>
                          <p className="form-hint">启用后系统将进入维护状态，仅管理员可访问</p>
                        </div>

                        <div className="form-group">
                          <label>数据保留期限</label>
                          <div className="input-group">
                            <input
                              type="number"
                              value={systemSettings.dataRetention}
                              onChange={(e) =>
                                setSystemSettings({
                                  ...systemSettings,
                                  dataRetention: parseInt(e.target.value) || 365,
                                })
                              }
                              min="30"
                            />
                            <span className="input-suffix">天</span>
                          </div>
                          <p className="form-hint">数据在系统中的保留时间</p>
                        </div>

                        <div className="form-group">
                          <label>最大文件上传大小</label>
                          <div className="input-group">
                            <input
                              type="number"
                              value={systemSettings.maxFileSize}
                              onChange={(e) =>
                                setSystemSettings({
                                  ...systemSettings,
                                  maxFileSize: parseInt(e.target.value) || 10,
                                })
                              }
                              min="1"
                            />
                            <span className="input-suffix">MB</span>
                          </div>
                          <p className="form-hint">单个文件的最大上传大小限制</p>
                        </div>

                        <div className="form-actions">
                          <button className="btn-primary">保存设置</button>
                          <button className="btn-secondary">重置</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'permission' && (
                    <div className="settings-panel">
                      <h3>权限管理</h3>
                      <div className="permission-section">
                        <div className="permission-card">
                          <h4>角色权限配置</h4>
                          <div className="permission-list">
                            <div className="permission-item">
                              <div className="permission-role">
                                <span className="role-icon">👨‍🎓</span>
                                <span className="role-name">学生</span>
                              </div>
                              <div className="permission-rights">
                                <span className="permission-tag">查看个人信息</span>
                                <span className="permission-tag">查看预警</span>
                                <span className="permission-tag">查看成绩</span>
                              </div>
                            </div>
                            <div className="permission-item">
                              <div className="permission-role">
                                <span className="role-icon">👨‍🏫</span>
                                <span className="role-name">教职工</span>
                              </div>
                              <div className="permission-rights">
                                <span className="permission-tag">学生管理</span>
                                <span className="permission-tag">预警管理</span>
                                <span className="permission-tag">干预管理</span>
                                <span className="permission-tag">系统设置</span>
                                <span className="permission-tag">数据统计</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="permission-card">
                          <h4>操作日志</h4>
                          <div className="log-list">
                            <div className="log-item">
                              <span className="log-time">2024-01-15 10:30</span>
                              <span className="log-action">管理员修改了预警规则</span>
                            </div>
                            <div className="log-item">
                              <span className="log-time">2024-01-14 15:20</span>
                              <span className="log-action">管理员更新了区块链配置</span>
                            </div>
                            <div className="log-item">
                              <span className="log-time">2024-01-13 09:10</span>
                              <span className="log-action">管理员修改了系统参数</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(user?.role === 'staff' || user?.role === 'admin') && activeNav === 'profile' && (
              <UserProfile />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

