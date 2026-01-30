import { useState, useEffect } from 'react'
import { attendanceService, AttendanceRecord } from '../services/attendance'
import { gradeService, Grade } from '../services/grades'
import { interventionService, Intervention } from '../services/interventions'
import { useAuth } from '../contexts/AuthContext'
import '../pages/Home.css'

/**
 * 学习记录组件
 * 整合展示学生的出勤记录、成绩记录和干预记录
 */
export default function LearningRecords() {
  const { user } = useAuth()
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
    const activeInterventions = interventions.filter((i) => i.status === 'in-progress').length
    const completedInterventions = interventions.filter((i) => i.status === 'completed').length

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
        active: activeInterventions,
        completed: completedInterventions,
      },
    }
  }

  const stats = calculateStats()

  // 获取干预状态文本
  const getInterventionStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理'
      case 'in-progress':
        return '进行中'
      case 'completed':
        return '已完成'
      case 'cancelled':
        return '已取消'
      default:
        return status
    }
  }

  // 获取干预状态样式
  const getInterventionStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending'
      case 'in-progress':
        return 'status-in-progress'
      case 'completed':
        return 'status-completed'
      case 'cancelled':
        return 'status-cancelled'
      default:
        return ''
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
            <div className="stat-value-small">{stats.interventions.active}</div>
            <div className="stat-label-small">进行中干预</div>
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
              {interventions.map((intervention) => (
                <div key={intervention._id} className="intervention-card">
                  <div className="intervention-header">
                    <div className="intervention-student">
                      <strong>{intervention.type}</strong>
                    </div>
                    <span className={`status-badge ${getInterventionStatusClass(intervention.status)}`}>
                      {getInterventionStatusText(intervention.status)}
                    </span>
                  </div>
                  <div className="intervention-content">
                    <p>{intervention.description}</p>
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
                  </div>
                  <div className="intervention-footer">
                    <span className="intervention-time">
                      {new Date(intervention.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    {intervention.blockHash && (
                      <span className="blockchain-badge">⛓️ 已上链</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

