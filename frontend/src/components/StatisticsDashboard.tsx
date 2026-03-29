import { useState, useEffect } from 'react'
import { statisticsService, Statistics } from '../services/statistics'

export default function StatisticsDashboard() {
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  useEffect(() => {
    fetchStatistics()
  }, [])

  if (loading && !statistics) {
    return (
      <div className="page-content">
        <h2 className="page-title">📈 数据统计</h2>
        <div className="loading-state">加载中...</div>
      </div>
    )
  }

  if (error && !statistics) {
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

  /** 折线图坐标（SVG viewBox 内像素） */
  const chartW = 720
  const chartH = 260
  const pad = { t: 28, r: 32, b: 48, l: 46 }
  const plotW = chartW - pad.l - pad.r
  const plotH = chartH - pad.t - pad.b
  const n = statistics.trends.dates.length
  const xAt = (i: number) =>
    n <= 1 ? pad.l + plotW / 2 : pad.l + (i / Math.max(n - 1, 1)) * plotW
  const yAt = (v: number) => pad.t + plotH - (v / maxValue) * plotH

  const warningPoints = statistics.trends.warnings.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')
  const interventionPoints = statistics.trends.interventions
    .map((v, i) => `${xAt(i)},${yAt(v)}`)
    .join(' ')

  return (
    <div className="page-content">
      <div className="statistics-header">
        <div>
          <h2 className="page-title">📈 数据统计</h2>
          <p className="statistics-desc">系统运行数据概览，预警与干预为已下发记录</p>
        </div>
        <button className="btn-secondary" onClick={fetchStatistics} disabled={loading} style={{ alignSelf: 'flex-start' }}>
          {loading ? '刷新中...' : '🔄 刷新'}
        </button>
      </div>

      {/* 概览卡片 */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.warning.total}</div>
            <div className="stat-label">已下发预警</div>
          </div>
        </div>
        <div
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
        >
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.intervention.total}</div>
            <div className="stat-label">干预记录</div>
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
        <div
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}
        >
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.attendance.total}</div>
            <div className="stat-label">出勤记录</div>
          </div>
        </div>
      </div>

      <div className="statistics-grid">
        {/* 预警统计 */}
        <div className="statistics-card">
          <h3 className="statistics-title">⚠️ 预警统计（已下发）</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">按类型：</span>
              <div className="stat-item-values stat-values-inline">
                <span>成绩 {statistics.warning.byType.grade}</span>
                <span>学期学分 {statistics.warning.byType.credit_semester}</span>
                <span>总学分 {statistics.warning.byType.credit_total}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">按级别：</span>
              <div className="stat-item-values stat-values-inline">
                <span style={{ color: '#c62828' }}>高危 {statistics.warning.byLevel.high}</span>
                <span style={{ color: '#e65100' }}>中危 {statistics.warning.byLevel.medium}</span>
                <span style={{ color: '#2e7d32' }}>低危 {statistics.warning.byLevel.low}</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">近30天新增：</span>
              <span className="stat-item-value">{statistics.warning.recent30Days} 条</span>
            </div>
          </div>
        </div>

        {/* 干预统计 */}
        <div className="statistics-card">
          <h3 className="statistics-title">🔧 干预统计</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">按状态：</span>
              <div className="stat-item-values stat-values-inline">
                <span>待学生处理 {statistics.intervention.byStatus.student_pending}</span>
                <span>待审核 {statistics.intervention.byStatus.pending_review}</span>
                <span>已完成 {statistics.intervention.byStatus.completed}</span>
                <span>已撤销 {statistics.intervention.byStatus.revoked}</span>
              </div>
            </div>
            {Object.keys(statistics.intervention.byType).length > 0 && (
              <div className="stat-item">
                <span className="stat-item-label">按类型：</span>
                <div className="stat-item-values stat-values-inline">
                  {Object.entries(statistics.intervention.byType).map(([type, count]) => (
                    <span key={type}>{type} {count}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="stat-item">
              <span className="stat-item-label">近30天新增：</span>
              <span className="stat-item-value">{statistics.intervention.recent30Days} 条</span>
            </div>
          </div>
        </div>

        {/* 学生统计 */}
        <div className="statistics-card">
          <h3 className="statistics-title">👥 学生统计</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">有预警学生：</span>
              <span className="stat-item-value">{statistics.student.withWarnings} 人</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">无预警学生：</span>
              <span className="stat-item-value">{statistics.student.withoutWarnings ?? (statistics.student.total - statistics.student.withWarnings)} 人</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">有干预学生：</span>
              <span className="stat-item-value">{statistics.student.withInterventions} 人</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">预警+干预：</span>
              <span className="stat-item-value">{statistics.student.withBoth} 人</span>
            </div>
          </div>
        </div>

        {/* 成绩统计 */}
        <div className="statistics-card statistics-card-grade">
          <h3 className="statistics-title">📝 成绩统计</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">总体概况</span>
              <div className="stat-item-values stat-values-inline">
                <span>全部 {statistics.grade.total} 条</span>
                <span>均分 {statistics.grade.average.toFixed(1)}</span>
                <span>及格率 {(statistics.grade.passRate ?? 0).toFixed(1)}%</span>
                <span>
                  不及格 {statistics.grade.below60}（{statistics.grade.below60Percent.toFixed(1)}%）
                </span>
                <span>
                  {statistics.grade.courseCount ?? 0} 门课程 / {statistics.grade.termCount ?? 0} 个学期
                </span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">按课程</span>
              {statistics.grade.byCourse && statistics.grade.byCourse.length > 0 ? (
                <div className="statistics-grade-table-wrap">
                  <table className="statistics-grade-table">
                    <thead>
                      <tr>
                        <th>课程</th>
                        <th>成绩条数</th>
                        <th>平均分</th>
                        <th>及格率</th>
                        <th>不及格</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics.grade.byCourse.map((row) => (
                        <tr key={row.course}>
                          <td className="statistics-grade-course">{row.course}</td>
                          <td>{row.recordCount}</td>
                          <td>{row.average.toFixed(1)}</td>
                          <td>{row.passRate.toFixed(1)}%</td>
                          <td>{row.below60}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="statistics-grade-empty">暂无成绩记录</p>
              )}
            </div>
          </div>
        </div>

        {/* 出勤统计 */}
        <div className="statistics-card">
          <h3 className="statistics-title">📅 出勤统计</h3>
          <div className="statistics-content">
            <div className="stat-item">
              <span className="stat-item-label">记录总数：</span>
              <span className="stat-item-value">{statistics.attendance.total} 条</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">平均缺勤：</span>
              <span className="stat-item-value">{statistics.attendance.averageAbsentCount.toFixed(1)} 次</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">缺勤&gt;3次：</span>
              <span className="stat-item-value">{statistics.attendance.overThreshold} 条</span>
            </div>
          </div>
        </div>

        {/* 趋势分析 */}
        <div className="statistics-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="statistics-title">📈 趋势分析（最近7天）</h3>
          <div className="statistics-content">
            <div className="trend-chart trend-line-chart">
              <div className="trend-line-wrap">
                <svg
                  className="trend-line-svg"
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  aria-label="最近7天预警与干预条数折线图"
                >
                  {/* 横向参考线 */}
                  {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                    const y = pad.t + plotH * (1 - t)
                    return (
                      <line
                        key={t}
                        x1={pad.l}
                        y1={y}
                        x2={pad.l + plotW}
                        y2={y}
                        className="trend-line-grid"
                      />
                    )
                  })}
                  {/* Y 轴刻度 */}
                  <text x={pad.l - 8} y={pad.t + plotH + 4} textAnchor="end" className="trend-line-axis">
                    0
                  </text>
                  <text x={pad.l - 8} y={pad.t + 12} textAnchor="end" className="trend-line-axis">
                    {maxValue}
                  </text>
                  <polyline
                    fill="none"
                    stroke="#667eea"
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={warningPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#f5576c"
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={interventionPoints}
                  />
                  {statistics.trends.dates.map((date, i) => {
                    const wx = xAt(i)
                    const wy = yAt(statistics.trends.warnings[i])
                    const ix = xAt(i)
                    const iy = yAt(statistics.trends.interventions[i])
                    const dayLabel = new Date(date).toLocaleDateString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                    })
                    return (
                      <g key={date} className="trend-line-day-group">
                        <title>{`${dayLabel} 预警 ${statistics.trends.warnings[i]}，干预 ${statistics.trends.interventions[i]}`}</title>
                        <circle cx={wx} cy={wy} r="5" fill="#fff" stroke="#667eea" strokeWidth="2" />
                        <circle cx={ix} cy={iy} r="5" fill="#fff" stroke="#f5576c" strokeWidth="2" />
                        <text x={wx} y={chartH - 14} textAnchor="middle" className="trend-line-xlabel">
                          {dayLabel}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
              <div className="trend-legend">
                <div className="legend-item">
                  <span className="legend-color trend-legend-line trend-legend-line--warning" />
                  <span>预警（新建条数）</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color trend-legend-line trend-legend-line--intervention" />
                  <span>干预（新建条数）</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


