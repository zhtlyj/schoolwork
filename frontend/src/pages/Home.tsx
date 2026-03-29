import { useState, useEffect, useCallback } from 'react'
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
import { operationLogService, OperationLog } from '../services/operationLogs'
import { ACADEMIC_INTEGRITY_ANCHOR_ADDRESS } from '../contracts/academicIntegrityAnchor'
import { TARGET_CHAIN_ID } from '../contexts/WalletContext'
import WalletBar from '../components/WalletBar'
import ChainTransactionHistory from '../components/ChainTransactionHistory'
import { verifyContractCodeOnChain } from '../services/blockchainContract'
import './Home.css'


export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'warnings' | 'interventions'>('overview')
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'warning' | 'intervention' | 'blockchain' | 'system' | 'permission'>('warning')
  
  // 设置数据：预警规则按高危/中危/低危细分
  const [warningSettings, setWarningSettings] = useState({
    // 成绩预警：score < high 高危，high<=score<medium 中危，medium<=score<low 低危
    gradeHigh: 50,
    gradeMedium: 60,
    gradeLow: 70,
    // 学期学分：earned < high 高危，high<=earned<medium 中危，medium<=earned<low 低危
    semesterHigh: 5,
    semesterMedium: 10,
    semesterLow: 15,
    // 总学分：earned < high 高危，high<=earned<medium 中危，medium<=earned<low 低危
    totalHigh: 10,
    totalMedium: 20,
    totalLow: 30,
  })
  
  const [interventionSettings, setInterventionSettings] = useState({
    autoIntervention: false,
    interventionTypes: ['学习辅导', '心理疏导', '纪律教育', '考勤督促'],
    defaultDuration: 30,
  })
  
  const [blockchainSettings, setBlockchainSettings] = useState({
    enableBlockchain: true,
    autoUpload: true,
    network: 'testnet',
    contractAddress: ACADEMIC_INTEGRITY_ANCHOR_ADDRESS || '',
  })

  const [chainVerifyMsg, setChainVerifyMsg] = useState<string | null>(null)
  
  const [systemSettings, setSystemSettings] = useState({
    systemName: '学生学业预警与学习干预系统',
    maintenanceMode: false,
    dataRetention: 365,
    maxFileSize: 10,
  })

  // 操作日志（权限管理内，实时同步）
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([])
  const [operationLogsLoading, setOperationLogsLoading] = useState(false)

  // 预警数据状态（用于统计卡片和筛选项）
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [warningsLoading, setWarningsLoading] = useState(false)

  // 预警类型筛选项（成绩/学期学分/总学分）
  const [warningTypeFilter, setWarningTypeFilter] = useState<'' | 'grade' | 'credit_semester' | 'credit_total'>('')

  // 获取预警数据（用于统计卡片和筛选项）
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

  // 获取操作日志（权限管理内，进入时拉取 + 每8秒轮询实现实时同步）
  const fetchOperationLogs = useCallback(async () => {
    if (user?.role !== 'staff' && user?.role !== 'admin') return
    setOperationLogsLoading(true)
    try {
      const res = await operationLogService.getLogs({ limit: 50 })
      setOperationLogs(res.logs)
    } catch (err) {
      console.error('获取操作日志失败:', err)
    } finally {
      setOperationLogsLoading(false)
    }
  }, [user?.role])

  useEffect(() => {
    if (activeNav === 'settings' && settingsTab === 'permission' && (user?.role === 'staff' || user?.role === 'admin')) {
      fetchOperationLogs()
      const timer = setInterval(fetchOperationLogs, 8000)
      return () => clearInterval(timer)
    }
  }, [activeNav, settingsTab, user?.role, fetchOperationLogs])

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
              <span className="system-title-text">学生学业预警与学习干预系统</span>
            </h1>
          </div>
          <nav className="header-nav" aria-label="主导航">
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
                  className={`nav-item ${activeNav === 'chainHistory' ? 'active' : ''}`}
                  onClick={() => setActiveNav('chainHistory')}
                >
                  <span className="nav-icon">📜</span>
                  交易历史
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
                  className={`nav-item ${activeNav === 'chainHistory' ? 'active' : ''}`}
                  onClick={() => setActiveNav('chainHistory')}
                >
                  <span className="nav-icon">📜</span>
                  交易历史
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
            <WalletBar />
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
                {user?.studentId && <span className="user-id user-id--header">学号: {user.studentId}</span>}
                {user?.staffId && <span className="user-id user-id--header">工号: {user.staffId}</span>}
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
          {/* 预警类型快捷筛选：仅在「预警」相关入口展示，不在干预管理等页面展示 */}
          {(activeNav === 'warnings' ||
            (activeNav === 'dashboard' && activeTab === 'warnings')) && (
            <div className="stats-grid stats-filter-grid">
              <button
                type="button"
                className={`stat-card stat-filter-card ${warningTypeFilter === 'grade' ? 'active' : ''}`}
                onClick={() => setWarningTypeFilter((v) => (v === 'grade' ? '' : 'grade'))}
              >
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <div className="stat-value">
                    {warningsLoading ? '...' : warnings.filter((w) => w.type === 'grade').length}
                  </div>
                  <div className="stat-label">成绩预警</div>
                </div>
              </button>
              <button
                type="button"
                className={`stat-card stat-filter-card ${warningTypeFilter === 'credit_semester' ? 'active' : ''}`}
                onClick={() => setWarningTypeFilter((v) => (v === 'credit_semester' ? '' : 'credit_semester'))}
              >
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <div className="stat-value">
                    {warningsLoading ? '...' : warnings.filter((w) => w.type === 'credit_semester').length}
                  </div>
                  <div className="stat-label">学期学分预警</div>
                </div>
              </button>
              <button
                type="button"
                className={`stat-card stat-filter-card ${warningTypeFilter === 'credit_total' ? 'active' : ''}`}
                onClick={() => setWarningTypeFilter((v) => (v === 'credit_total' ? '' : 'credit_total'))}
              >
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">
                    {warningsLoading ? '...' : warnings.filter((w) => w.type === 'credit_total').length}
                  </div>
                  <div className="stat-label">总学分预警</div>
                </div>
              </button>
            </div>
          )}

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
            {activeNav === 'chainHistory' && <ChainTransactionHistory />}

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
                warningSettings={warningSettings}
                typeFilter={warningTypeFilter}
                onTypeFilterChange={setWarningTypeFilter}
              />
            )}
            {activeNav === 'warnings' && user?.role === 'student' && (
              <div className="page-content">
                <h2 className="page-title">⚠️ 我的预警</h2>
                <WarningList typeFilter={warningTypeFilter} onTypeFilterChange={setWarningTypeFilter} showFilters />
              </div>
            )}
            {activeNav === 'dashboard' && activeTab === 'warnings' && (
              <WarningList typeFilter={warningTypeFilter} onTypeFilterChange={setWarningTypeFilter} showFilters />
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
                      <p className="form-hint" style={{ marginBottom: 16 }}>按高危、中危、低危分别设置阈值，达到对应条件时触发相应级别预警</p>
                      <div className="settings-form">
                        <div className="warning-rules-section">
                          <h4>📝 成绩预警（分数）</h4>
                          <div className="form-row-triple">
                            <div className="form-group">
                              <label>高危</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  value={warningSettings.gradeHigh}
                                  onChange={(e) => setWarningSettings({ ...warningSettings, gradeHigh: parseInt(e.target.value) || 50 })}
                                  min="0"
                                  max="100"
                                />
                                <span className="input-suffix">分以下</span>
                              </div>
                              <p className="form-hint">成绩 &lt; 此值</p>
                            </div>
                            <div className="form-group">
                              <label>中危</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  value={warningSettings.gradeMedium}
                                  onChange={(e) => setWarningSettings({ ...warningSettings, gradeMedium: parseInt(e.target.value) || 60 })}
                                  min="0"
                                  max="100"
                                />
                                <span className="input-suffix">分以下</span>
                              </div>
                              <p className="form-hint">高危值 ≤ 成绩 &lt; 此值</p>
                            </div>
                            <div className="form-group">
                              <label>低危</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  value={warningSettings.gradeLow}
                                  onChange={(e) => setWarningSettings({ ...warningSettings, gradeLow: parseInt(e.target.value) || 70 })}
                                  min="0"
                                  max="100"
                                />
                                <span className="input-suffix">分以下</span>
                              </div>
                              <p className="form-hint">中危值 ≤ 成绩 &lt; 此值</p>
                            </div>
                          </div>
                        </div>

                        <div className="warning-rules-section">
                          <h4>📚 学期学分预警</h4>
                          <div className="form-row-triple">
                            <div className="form-group">
                              <label>高危</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  value={warningSettings.semesterHigh}
                                  onChange={(e) => setWarningSettings({ ...warningSettings, semesterHigh: parseInt(e.target.value) || 5 })}
                                  min="0"
                                />
                                <span className="input-suffix">学分以下</span>
                              </div>
                              <p className="form-hint">学期学分 &lt; 此值</p>
                            </div>
                            <div className="form-group">
                              <label>中危</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  value={warningSettings.semesterMedium}
                                  onChange={(e) => setWarningSettings({ ...warningSettings, semesterMedium: parseInt(e.target.value) || 10 })}
                                  min="0"
                                />
                                <span className="input-suffix">学分以下</span>
                              </div>
                              <p className="form-hint">高危值 ≤ 学分 &lt; 此值</p>
                            </div>
                            <div className="form-group">
                              <label>低危</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  value={warningSettings.semesterLow}
                                  onChange={(e) => setWarningSettings({ ...warningSettings, semesterLow: parseInt(e.target.value) || 15 })}
                                  min="0"
                                />
                                <span className="input-suffix">学分以下</span>
                              </div>
                              <p className="form-hint">中危值 ≤ 学分 &lt; 此值</p>
                            </div>
                          </div>
                        </div>

                        <div className="warning-rules-section">
                          <h4>📊 总学分预警</h4>
                          <div className="form-row-triple">
                            <div className="form-group">
                              <label>高危</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  value={warningSettings.totalHigh}
                                  onChange={(e) => setWarningSettings({ ...warningSettings, totalHigh: parseInt(e.target.value) || 10 })}
                                  min="0"
                                />
                                <span className="input-suffix">学分以下</span>
                              </div>
                              <p className="form-hint">总学分 &lt; 此值</p>
                            </div>
                            <div className="form-group">
                              <label>中危</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  value={warningSettings.totalMedium}
                                  onChange={(e) => setWarningSettings({ ...warningSettings, totalMedium: parseInt(e.target.value) || 20 })}
                                  min="0"
                                />
                                <span className="input-suffix">学分以下</span>
                              </div>
                              <p className="form-hint">高危值 ≤ 总学分 &lt; 此值</p>
                            </div>
                            <div className="form-group">
                              <label>低危</label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  value={warningSettings.totalLow}
                                  onChange={(e) => setWarningSettings({ ...warningSettings, totalLow: parseInt(e.target.value) || 30 })}
                                  min="0"
                                />
                                <span className="input-suffix">学分以下</span>
                              </div>
                              <p className="form-hint">中危值 ≤ 总学分 &lt; 此值</p>
                            </div>
                          </div>
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
                          <p className="form-hint">数据存储智能合约的地址（可与下方 .env 中配置保持一致）</p>
                        </div>

                        <div className="form-group">
                          <label>前端环境变量（Vite）</label>
                          <p className="form-hint" style={{ wordBreak: 'break-all' }}>
                            VITE_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS：
                            {ACADEMIC_INTEGRITY_ANCHOR_ADDRESS || '未配置'}
                          </p>
                          <p className="form-hint">
                            目标链 VITE_CHAIN_ID：{TARGET_CHAIN_ID.toString()}（Sepolia 为 11155111，本地 Hardhat 为 31337）
                          </p>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              void verifyContractCodeOnChain().then((r) =>
                                setChainVerifyMsg(`${r.ok ? '✓' : '✗'} ${r.message}`)
                              )
                            }}
                          >
                            验证当前网络下合约代码
                          </button>
                          {chainVerifyMsg && (
                            <p className="form-hint" style={{ marginTop: 8 }}>
                              {chainVerifyMsg}
                            </p>
                          )}
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h4 style={{ margin: 0 }}>操作日志</h4>
                            <button className="btn-secondary btn-small" onClick={fetchOperationLogs} disabled={operationLogsLoading}>
                              {operationLogsLoading ? '刷新中...' : '🔄 刷新'}
                            </button>
                          </div>
                          <p className="form-hint" style={{ marginBottom: 12, fontSize: 13 }}>系统操作记录，每8秒自动刷新</p>
                          {operationLogsLoading && operationLogs.length === 0 ? (
                            <div className="loading-state" style={{ padding: 20 }}>加载中...</div>
                          ) : operationLogs.length === 0 ? (
                            <div className="empty-state" style={{ padding: 20, minHeight: 80 }}>
                              <p>暂无操作记录</p>
                            </div>
                          ) : (
                            <div className="log-list">
                              {operationLogs.map((log) => (
                                <div key={log._id} className="log-item">
                                  <span className="log-time">
                                    {new Date(log.createdAt).toLocaleString('zh-CN', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="log-action">{log.details}</span>
                                </div>
                              ))}
                            </div>
                          )}
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

