import { useState, useEffect, useMemo } from 'react'
import { warningService, Warning } from '../services/warnings'
import WarningCard from './WarningCard'
import '../pages/Home.css'

interface WarningListProps {
  showLoading?: boolean
  showEmpty?: boolean
  emptyText?: string
  /** 公用类型筛选项（与首页统计卡片联动） */
  typeFilter?: '' | 'grade' | 'credit_semester' | 'credit_total'
  onTypeFilterChange?: (v: '' | 'grade' | 'credit_semester' | 'credit_total') => void
  /** 是否显示完整筛选项（公用+各自子筛选项） */
  showFilters?: boolean
  /** 学生端：预警卡片上展示「确认知晓」链上交互 */
  showStudentAck?: boolean
}

/**
 * 预警列表组件（学生端）
 * 公用筛选项：成绩、学期学分、总学分
 * 各类型子筛选项：成绩(课程、级别)、学期学分(学期、级别)、总学分(级别)
 */
export default function WarningList({
  showLoading = true,
  showEmpty = true,
  emptyText = '暂无预警信息',
  typeFilter = '',
  onTypeFilterChange,
  showFilters = true,
  showStudentAck = false,
}: WarningListProps) {
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [localTypeFilter, setLocalTypeFilter] = useState<'' | 'grade' | 'credit_semester' | 'credit_total'>(typeFilter)
  const [levelFilter, setLevelFilter] = useState<'' | 'low' | 'medium' | 'high'>('')
  const [courseFilter, setCourseFilter] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLocalTypeFilter(typeFilter)
  }, [typeFilter])

  useEffect(() => {
    fetchWarnings()
  }, [])

  const fetchWarnings = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await warningService.getWarnings({
        page: 1,
        limit: 500,
      })
      setWarnings(res.warnings)
    } catch (err: any) {
      setError(err.response?.data?.message || '获取预警列表失败')
    } finally {
      setLoading(false)
    }
  }

  const filteredByType = localTypeFilter ? warnings.filter((w) => w.type === localTypeFilter) : warnings
  const uniqueCourses = useMemo(() => {
    const set = new Set<string>()
    filteredByType.forEach((w) => w.course && set.add(w.course))
    return Array.from(set).sort()
  }, [filteredByType])

  const filteredWarnings = useMemo(() => {
    let list = filteredByType
    if (levelFilter) list = list.filter((w) => w.level === levelFilter)
    if (courseFilter) list = list.filter((w) => w.course === courseFilter)
    return list
  }, [filteredByType, levelFilter, courseFilter])

  const paginatedWarnings = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredWarnings.slice(start, start + pageSize)
  }, [filteredWarnings, page, pageSize])
  const totalPages = Math.ceil(filteredWarnings.length / pageSize) || 1

  const resetSubFilters = () => {
    setLevelFilter('')
    setCourseFilter('')
    setPage(1)
  }

  if (loading && showLoading) {
    return <div className="loading-state">加载中...</div>
  }

  if (error) {
    return <div className="alert-error">{error}</div>
  }

  return (
    <div className="warning-list-with-filters">
      {showFilters && (
        <div className="warning-filters warning-list-filters">
          {/* 公用筛选项：成绩、学期学分、总学分 */}
          <div className="filter-row filter-row-common">
            <span className="filter-label">类型</span>
            <div className="filter-options">
              <button
                type="button"
                className={`warning-mode-btn ${!localTypeFilter ? 'active' : ''}`}
                onClick={() => {
                  setLocalTypeFilter('')
                  resetSubFilters()
                  onTypeFilterChange?.('')
                }}
              >
                全部
              </button>
              <button
                type="button"
                className={`warning-mode-btn ${localTypeFilter === 'grade' ? 'active' : ''}`}
                onClick={() => {
                  setLocalTypeFilter('grade')
                  resetSubFilters()
                  onTypeFilterChange?.('grade')
                }}
              >
                成绩预警
              </button>
              <button
                type="button"
                className={`warning-mode-btn ${localTypeFilter === 'credit_semester' ? 'active' : ''}`}
                onClick={() => {
                  setLocalTypeFilter('credit_semester')
                  resetSubFilters()
                  onTypeFilterChange?.('credit_semester')
                }}
              >
                学期学分预警
              </button>
              <button
                type="button"
                className={`warning-mode-btn ${localTypeFilter === 'credit_total' ? 'active' : ''}`}
                onClick={() => {
                  setLocalTypeFilter('credit_total')
                  resetSubFilters()
                  onTypeFilterChange?.('credit_total')
                }}
              >
                总学分预警
              </button>
            </div>
          </div>

          {/* 各类型子筛选项 */}
          <div className="filter-row filter-row-sub">
            {(localTypeFilter === 'grade' || localTypeFilter === 'credit_semester') && uniqueCourses.length > 0 && (
              <div className="filter-item">
                <label>{localTypeFilter === 'grade' ? '课程' : '学期'}</label>
                <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1) }}>
                  <option value="">全部</option>
                  {uniqueCourses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="filter-item">
              <label>级别</label>
              <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value as any); setPage(1) }}>
                <option value="">全部级别</option>
                <option value="high">高危</option>
                <option value="medium">中危</option>
                <option value="low">低危</option>
              </select>
            </div>
            <div className="filter-item">
              <label>每页显示</label>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
                <option value="10">10 条</option>
                <option value="20">20 条</option>
                <option value="50">50 条</option>
                <option value="100">100 条</option>
              </select>
            </div>
            {(levelFilter || courseFilter) && (
              <button type="button" className="btn-secondary" onClick={resetSubFilters} style={{ padding: '10px 16px' }}>
                🔄 重置
              </button>
            )}
          </div>
        </div>
      )}

      {filteredWarnings.length === 0 && showEmpty ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <p>{localTypeFilter || levelFilter || courseFilter ? '该筛选条件下暂无预警信息' : emptyText}</p>
        </div>
      ) : (
        <>
          <div className="warnings-section">
            {paginatedWarnings.map((warning) => (
              <WarningCard
                key={warning._id}
                warning={warning}
                interactive={showStudentAck}
                onAcknowledged={fetchWarnings}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button type="button" className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button>
              <span className="page-info">第 {page} / {totalPages} 页（共 {filteredWarnings.length} 条）</span>
              <button type="button" className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

