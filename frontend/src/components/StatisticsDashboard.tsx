import { useState, useEffect } from 'react'
import { statisticsService, Statistics } from '../services/statistics'

export default function StatisticsDashboard() {
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await statisticsService.getStatistics()
        setStatistics(data)
      } catch (err: any) {
        setError(err.response?.data?.message || '获取统计数据失败')
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [])

  if (loading) {
    return (
      <div className="page-content">
        <h2 className="page-title">📈 数据统计</h2>
        <div className="loading-state">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-content">
        <h2 className="page-title">📈 数据统计</h2>
        <div className="alert-error">{error}</div>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="page-content">
        <h2 className="page-title">📈 数据统计</h2>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>暂无统计数据</p>
        </div>
      </div>
    )
  }

  const maxValue =
    Math.max(...statistics.trends.warnings, ...statistics.trends.interventions, 1) || 1

  return (
    <div className="page-content">
      <h2 className="page-title">📈 数据统计</h2>

      {/* 概览卡片 */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.warning.total}</div>
            <div className="stat-label">预警总数</div>
          </div>
        </div>
        <div
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
        >
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.intervention.total}</div>
            <div className="stat-label">干预总数</div>
          </div>
        </div>
        <div
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
        >
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.student.total}</div>
            <div className="stat-label">学生总数</div>
          </div>
        </div>
        <div
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}
        >
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.grade.total}</div>
            <div className="stat-label">成绩记录</div>
          </div>
        </div>
      </div>

      <div className="statistics-grid">
        {/* 预警统计 */}
        <div className="statistics-card">
          <h3 className="statistics-title">⚠️ 预警统计</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">按类型分布：</span>
              <div className="stat-item-values">
                <span>成绩: {statistics.warning.byType.grade}</span>
                <span>出勤: {statistics.warning.byType.attendance}</span>
                <span>作业: {statistics.warning.byType.assignment}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">按级别分布：</span>
              <div className="stat-item-values">
                <span style={{ color: '#c62828' }}>高危: {statistics.warning.byLevel.high}</span>
                <span style={{ color: '#e65100' }}>中危: {statistics.warning.byLevel.medium}</span>
                <span style={{ color: '#2e7d32' }}>低危: {statistics.warning.byLevel.low}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">近30天新增：</span>
              <span className="stat-item-value">{statistics.warning.recent30Days}</span>
            </div>
          </div>
        </div>

        {/* 干预统计 */}
        <div className="statistics-card">
          <h3 className="statistics-title">🔧 干预统计</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">按状态分布：</span>
              <div className="stat-item-values">
                <span>待处理: {statistics.intervention.byStatus.pending}</span>
                <span>进行中: {statistics.intervention.byStatus['in-progress']}</span>
                <span>已完成: {statistics.intervention.byStatus.completed}</span>
                <span>已取消: {statistics.intervention.byStatus.cancelled}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">按类型分布：</span>
              <div className="stat-item-values">
                {Object.entries(statistics.intervention.byType).map(([type, count]) => (
                  <span key={type}>
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">近30天新增：</span>
              <span className="stat-item-value">{statistics.intervention.recent30Days}</span>
            </div>
          </div>
        </div>

        {/* 学生统计 */}
        <div className="statistics-card">
          <h3 className="statistics-title">👥 学生统计</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">有预警学生：</span>
              <span className="stat-item-value">{statistics.student.withWarnings}</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">有干预学生：</span>
              <span className="stat-item-value">{statistics.student.withInterventions}</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">既有预警又有干预：</span>
              <span className="stat-item-value">{statistics.student.withBoth}</span>
            </div>
          </div>
        </div>

        {/* 成绩统计 */}
        <div className="statistics-card">
          <h3 className="statistics-title">📝 成绩统计</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">平均分：</span>
              <span className="stat-item-value">
                {statistics.grade.average.toFixed(1)} 分
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">低于60分：</span>
              <span className="stat-item-value">{statistics.grade.below60} 条</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">不及格率：</span>
              <span className="stat-item-value">
                {statistics.grade.below60Percent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 出勤统计 */}
        <div className="statistics-card">
          <h3 className="statistics-title">📅 出勤统计</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">平均缺勤次数：</span>
              <span className="stat-item-value">
                {statistics.attendance.averageAbsentCount.toFixed(1)} 次
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">超过阈值（&gt;3次）：</span>
              <span className="stat-item-value">
                {statistics.attendance.overThreshold} 条
              </span>
            </div>
          </div>
        </div>

        {/* 趋势分析 */}
        <div className="statistics-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="statistics-title">📈 趋势分析（最近7天）</h3>
          <div className="statistics-content">
            <div className="trend-chart">
              <div className="trend-bars">
                {statistics.trends.dates.map((date, idx) => {
                  const warningHeight = (statistics.trends.warnings[idx] / maxValue) * 100
                  const interventionHeight =
                    (statistics.trends.interventions[idx] / maxValue) * 100
                  const dateLabel = new Date(date).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                  })

                  return (
                    <div key={date} className="trend-bar-group">
                      <div className="trend-bar-container">
                        <div
                          className="trend-bar trend-bar-warning"
                          style={{ height: `${warningHeight}%` }}
                          title={`预警: ${statistics.trends.warnings[idx]}`}
                        >
                          {statistics.trends.warnings[idx] > 0 && (
                            <span className="trend-bar-value">
                              {statistics.trends.warnings[idx]}
                            </span>
                          )}
                        </div>
                        <div
                          className="trend-bar trend-bar-intervention"
                          style={{ height: `${interventionHeight}%` }}
                          title={`干预: ${statistics.trends.interventions[idx]}`}
                        >
                          {statistics.trends.interventions[idx] > 0 && (
                            <span className="trend-bar-value">
                              {statistics.trends.interventions[idx]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="trend-bar-label">{dateLabel}</div>
                    </div>
                  )
                })}
              </div>
              <div className="trend-legend">
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#667eea' }}></span>
                  <span>预警</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#f5576c' }}></span>
                  <span>干预</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


