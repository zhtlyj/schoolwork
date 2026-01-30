import { useState, useEffect } from 'react'
import { warningService, Warning } from '../services/warnings'
import WarningCard from './WarningCard'
import '../pages/Home.css'

interface WarningListProps {
  /**
   * 是否显示加载状态
   */
  showLoading?: boolean
  /**
   * 是否显示空状态
   */
  showEmpty?: boolean
  /**
   * 自定义空状态提示文本
   */
  emptyText?: string
}

/**
 * 预警列表组件
 * 用于学生端展示预警列表，从 API 获取数据
 */
export default function WarningList({
  showLoading = true,
  showEmpty = true,
  emptyText = '暂无预警信息',
}: WarningListProps) {
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWarnings()
  }, [])

  const fetchWarnings = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await warningService.getWarnings({
        page: 1,
        limit: 100, // 学生端显示所有预警
      })
      setWarnings(res.warnings)
    } catch (err: any) {
      setError(err.response?.data?.message || '获取预警列表失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading && showLoading) {
    return <div className="loading-state">加载中...</div>
  }

  if (error) {
    return <div className="alert-error">{error}</div>
  }

  if (warnings.length === 0 && showEmpty) {
    return (
      <div className="empty-state">
        <div className="empty-icon">✅</div>
        <p>{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="warnings-section">
      {warnings.map((warning) => (
        <WarningCard key={warning._id} warning={warning} />
      ))}
    </div>
  )
}

