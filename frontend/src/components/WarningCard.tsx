import { useState } from 'react'
import { Warning, warningService } from '../services/warnings'
import {
  computeWarningAckStepHash,
  explorerTxUrl,
  logWarningTraceOnChain,
} from '../services/warningChain'
import { useWallet } from '../contexts/WalletContext'
import '../pages/Home.css'

interface WarningCardProps {
  warning: Warning
  /** 学生端：展示「确认知晓」链上交互 */
  interactive?: boolean
  /** 链上确认成功后刷新列表 */
  onAcknowledged?: () => void
}

/**
 * 预警卡片组件
 * 用于展示单个预警信息；学生端可勾选并调用 MetaMask 完成 logWarningTrace 确认。
 */
export default function WarningCard({ warning, interactive, onAcknowledged }: WarningCardProps) {
  const { ensureTargetChain, connect } = useWallet()
  const [ackChecked, setAckChecked] = useState(false)
  const [ackSubmitting, setAckSubmitting] = useState(false)
  const [ackError, setAckError] = useState('')

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

  const handleStudentAck = async () => {
    setAckError('')
    if (!ackChecked) {
      setAckError('请先勾选「我已阅读上述预警内容」')
      return
    }
    const eth = window.ethereum
    if (!eth) {
      setAckError('未检测到钱包，请安装 MetaMask')
      return
    }
    setAckSubmitting(true)
    try {
      const accs = (await eth.request({ method: 'eth_accounts' })) as string[]
      if (!accs?.length) {
        await connect()
      }
      const accs2 = (await eth.request({ method: 'eth_accounts' })) as string[]
      if (!accs2?.length) {
        setAckError('请先连接钱包后再确认')
        return
      }
      await ensureTargetChain()

      const ts = new Date().toISOString()
      const stepHash = computeWarningAckStepHash(warning._id, ts)
      const txHash = await logWarningTraceOnChain(warning._id, stepHash)

      await warningService.updateWarning(warning._id, { studentAckTxHash: txHash })
      setAckChecked(false)
      onAcknowledged?.()
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e instanceof Error ? e.message : String(e)) ||
        '确认失败'
      setAckError(msg)
    } finally {
      setAckSubmitting(false)
    }
  }

  const staffTx = warning.blockHash
  const studentTx = warning.studentAckTxHash

  return (
    <div className={`warning-card ${getWarningLevelClass(warning.level)}`}>
      <div className="warning-header">
        <div className="warning-level-badge">{getWarningLevelText(warning.level)}</div>
        <div className="warning-type">{getWarningTypeText(warning.type)}</div>
      </div>
      <div className="warning-content">
        <h3>{warning.course}</h3>
        <p>{warning.message}</p>
        {interactive && !studentTx && (
          <div className="warning-student-ack" style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ackChecked}
                onChange={(e) => setAckChecked(e.target.checked)}
              />
              <span>我已阅读上述预警内容，知晓学业风险并愿意配合改进。</span>
            </label>
            <p className="form-hint" style={{ marginTop: 8 }}>
              点击确认后将弹出 MetaMask，在链上记录本次确认（logWarningTrace），请使用与系统一致的测试网。
            </p>
            {ackError ? <div className="alert-error" style={{ marginTop: 8 }}>{ackError}</div> : null}
            <button
              type="button"
              className="btn-primary btn-small"
              style={{ marginTop: 8 }}
              disabled={ackSubmitting}
              onClick={() => void handleStudentAck()}
            >
              {ackSubmitting ? '链上确认中…' : '确认知晓并上链'}
            </button>
          </div>
        )}
        <div className="warning-footer">
          <span className="warning-time">{new Date(warning.createdAt).toLocaleDateString()}</span>
          {staffTx && (
            <span className="blockchain-badge" title={staffTx}>
              ⛓️ 存证: {staffTx.slice(0, 10)}…
            </span>
          )}
          {studentTx &&
            (explorerTxUrl(studentTx) ? (
              <a
                href={explorerTxUrl(studentTx)!}
                target="_blank"
                rel="noopener noreferrer"
                className="blockchain-badge"
                style={{ textDecoration: 'none' }}
              >
                ✓ 我已链上确认
              </a>
            ) : (
              <span className="blockchain-badge">✓ 已链上确认</span>
            ))}
        </div>
      </div>
    </div>
  )
}
