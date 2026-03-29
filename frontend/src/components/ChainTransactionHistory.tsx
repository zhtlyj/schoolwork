import { formatUnits } from 'ethers'
import { useChainTxHistory } from '../hooks/useChainTxHistory'
import { explorerTxUrl } from '../services/warningChain'
import { formatTxFeeEth, type ChainTxHistoryRecord } from '../services/chainTxHistory'
import '../pages/Home.css'

function gasPriceGwei(gasPriceWei: string): string {
  try {
    const v = BigInt(gasPriceWei)
    if (v === 0n) return '—'
    return formatUnits(v, 'gwei')
  } catch {
    return '—'
  }
}

function TxRow({ r }: { r: ChainTxHistoryRecord }) {
  const url = explorerTxUrl(r.txHash)
  return (
    <tr>
      <td>{new Date(r.recordedAt).toLocaleString('zh-CN')}</td>
      <td title={r.action}>{r.action}</td>
      <td className="chain-tx-hash-cell">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="warning-tx-link">
            {r.txHash.slice(0, 12)}…
          </a>
        ) : (
          <span title={r.txHash} className="warning-tx-hash">
            {r.txHash.slice(0, 12)}…
          </span>
        )}
      </td>
      <td>{r.blockNumber}</td>
      <td>{r.gasUsed}</td>
      <td>{gasPriceGwei(r.gasPriceWei)}</td>
      <td>{formatTxFeeEth(r.feeWei)}</td>
    </tr>
  )
}

export default function ChainTransactionHistory() {
  const { records, loading, error, clear } = useChainTxHistory()

  return (
    <div className="page-content">
      <div className="students-header" style={{ marginBottom: 16 }}>
        <h2 className="page-title">📜 链上交易历史</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span className="form-hint" style={{ margin: 0 }}>
            数据保存在服务器，按当前登录账号关联；记录 MetaMask 确认成功的合约交易。
          </span>
          {records.length > 0 && (
            <button type="button" className="btn-secondary btn-small" onClick={() => void clear()}>
              清空我的记录
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading && records.length === 0 ? (
        <div className="loading-state">加载中...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>暂无记录。在预警/干预管理中使用「上链」并成功确认交易后，将自动同步到此列表。</p>
        </div>
      ) : (
        <div className="students-table-container">
          <table className="students-table chain-tx-history-table">
            <thead>
              <tr>
                <th>记录时间</th>
                <th>操作类型</th>
                <th>交易哈希</th>
                <th>区块号</th>
                <th>Gas 消耗</th>
                <th>Gas 单价 (Gwei)</th>
                <th>手续费 (ETH)</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <TxRow key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
