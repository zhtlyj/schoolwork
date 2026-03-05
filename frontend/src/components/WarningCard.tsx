import { Warning } from '../services/warnings'
import '../pages/Home.css'

interface WarningCardProps {
  warning: Warning
}

/**
 * 预警卡片组件
 * 用于展示单个预警信息
 */
export default function WarningCard({ warning }: WarningCardProps) {
  const getWarningLevelClass = (level: string) => {
    switch (level) {
      case 'high':
        return 'warning-high'
      case 'medium':
        return 'warning-medium'
      case 'low':
        return 'warning-low'
      default:
        return ''
    }
  }

  const getWarningLevelText = (level: string) => {
    switch (level) {
      case 'high':
        return '高危'
      case 'medium':
        return '中危'
      case 'low':
        return '低危'
      default:
        return ''
    }
  }

  const getWarningTypeText = (type: string) => {
    switch (type) {
      case 'grade':
        return '📊 成绩预警'
      case 'credit_semester':
        return '📚 学期学分预警'
      case 'credit_total':
        return '📚 总学分预警'
      default:
        return '⚠️ 预警'
    }
  }

  return (
    <div className={`warning-card ${getWarningLevelClass(warning.level)}`}>
      <div className="warning-header">
        <div className="warning-level-badge">{getWarningLevelText(warning.level)}</div>
        <div className="warning-type">{getWarningTypeText(warning.type)}</div>
      </div>
      <div className="warning-content">
        <h3>{warning.course}</h3>
        <p>{warning.message}</p>
        <div className="warning-footer">
          <span className="warning-time">{new Date(warning.createdAt).toLocaleDateString()}</span>
          {warning.blockHash && (
            <span className="blockchain-badge">⛓️ 已上链: {warning.blockHash}</span>
          )}
        </div>
      </div>
    </div>
  )
}

