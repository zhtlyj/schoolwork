import { useEffect, useState } from 'react'
import { gradeService, Grade, ExamType } from '../services/grades'
import { useAuth } from '../contexts/AuthContext'

export default function MyGrades() {
  const { user } = useAuth()
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // 筛选条件
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedExamType, setSelectedExamType] = useState<ExamType | ''>('')
  
  // 获取所有学期和课程（用于筛选）
  const [terms, setTerms] = useState<string[]>([])
  const [courses, setCourses] = useState<string[]>([])

  // 获取成绩列表
  const fetchGrades = async () => {
    if (!user?.studentId) return
    
    setLoading(true)
    setError('')
    try {
      const params: {
        studentId?: string
        term?: string
        course?: string
        examType?: ExamType
      } = {
        studentId: user.studentId,
      }
      
      if (selectedTerm) params.term = selectedTerm
      if (selectedCourse) params.course = selectedCourse
      if (selectedExamType) params.examType = selectedExamType
      
      const response = await gradeService.getGrades(params)
      setGrades(response.grades)
      
      // 提取唯一的学期和课程
      const uniqueTerms = Array.from(new Set(response.grades.map(g => g.term))).sort()
      const uniqueCourses = Array.from(new Set(response.grades.map(g => g.course))).sort()
      setTerms(uniqueTerms)
      setCourses(uniqueCourses)
    } catch (err: any) {
      setError(err.response?.data?.message || '获取成绩失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGrades()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerm, selectedCourse, selectedExamType, user?.studentId])

  // 计算统计数据
  const calculateStats = () => {
    if (grades.length === 0) {
      return {
        average: 0,
        total: 0,
        count: 0,
        passCount: 0,
        failCount: 0,
      }
    }

    const total = grades.reduce((sum, grade) => sum + grade.score, 0)
    const average = total / grades.length
    const passCount = grades.filter(g => g.score >= 60).length
    const failCount = grades.filter(g => g.score < 60).length

    return {
      average: Math.round(average * 100) / 100,
      total,
      count: grades.length,
      passCount,
      failCount,
    }
  }

  const stats = calculateStats()

  // 获取考试类型文本
  const getExamTypeText = (type: ExamType) => {
    switch (type) {
      case 'midterm':
        return '期中考试'
      case 'final':
        return '期末考试'
      case 'regular':
        return '平时成绩'
      default:
        return type
    }
  }

  // 获取成绩等级
  const getGradeLevel = (score: number) => {
    if (score >= 90) return { text: '优秀', class: 'grade-excellent' }
    if (score >= 80) return { text: '良好', class: 'grade-good' }
    if (score >= 70) return { text: '中等', class: 'grade-medium' }
    if (score >= 60) return { text: '及格', class: 'grade-pass' }
    return { text: '不及格', class: 'grade-fail' }
  }

  // 重置筛选
  const handleResetFilters = () => {
    setSelectedTerm('')
    setSelectedCourse('')
    setSelectedExamType('')
  }

  if (loading && grades.length === 0) {
    return (
      <div className="page-content">
        <h2 className="page-title">📝 我的成绩</h2>
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <h2 className="page-title">📝 我的成绩</h2>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grades-stats">
        <div className="stat-card-small">
          <div className="stat-icon-small">📊</div>
          <div className="stat-content-small">
            <div className="stat-value-small">{stats.average}</div>
            <div className="stat-label-small">平均分</div>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">📝</div>
          <div className="stat-content-small">
            <div className="stat-value-small">{stats.count}</div>
            <div className="stat-label-small">成绩总数</div>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">✅</div>
          <div className="stat-content-small">
            <div className="stat-value-small">{stats.passCount}</div>
            <div className="stat-label-small">及格数</div>
          </div>
        </div>
        <div className="stat-card-small">
          <div className="stat-icon-small">❌</div>
          <div className="stat-content-small">
            <div className="stat-value-small">{stats.failCount}</div>
            <div className="stat-label-small">不及格数</div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="grades-filters">
        <div className="filter-group">
          <label className="filter-label">学期</label>
          <select
            className="filter-select"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            <option value="">全部学期</option>
            {terms.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">课程</label>
          <select
            className="filter-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="">全部课程</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">考试类型</label>
          <select
            className="filter-select"
            value={selectedExamType}
            onChange={(e) => setSelectedExamType(e.target.value as ExamType | '')}
          >
            <option value="">全部类型</option>
            <option value="midterm">期中考试</option>
            <option value="final">期末考试</option>
            <option value="regular">平时成绩</option>
          </select>
        </div>
        <button className="btn-reset" onClick={handleResetFilters}>
          重置筛选
        </button>
      </div>

      {/* 成绩列表 */}
      {grades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>暂无成绩记录</p>
        </div>
      ) : (
        <div className="grades-table-container">
          <table className="grades-table">
            <thead>
              <tr>
                <th>课程名称</th>
                <th>学期</th>
                <th>考试类型</th>
                <th>成绩</th>
                <th>等级</th>
                <th>记录时间</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade) => {
                const level = getGradeLevel(grade.score)
                return (
                  <tr key={grade._id}>
                    <td className="course-name">{grade.course}</td>
                    <td>{grade.term}</td>
                    <td>{getExamTypeText(grade.examType)}</td>
                    <td>
                      <span className={`score ${level.class}`}>{grade.score}</span>
                    </td>
                    <td>
                      <span className={`grade-badge ${level.class}`}>{level.text}</span>
                    </td>
                    <td className="grade-time">
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
  )
}

