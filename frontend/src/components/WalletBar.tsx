import { useCallback, useEffect, useState } from 'react'
import { BrowserProvider, formatEther } from 'ethers'
import { useWallet, TARGET_CHAIN_ID } from '../contexts/WalletContext'
import { getChainLabel } from '../lib/chainDisplay'
import './WalletBar.css'

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function trimEthDisplay(wei: bigint): string {
  const s = formatEther(wei)
  const n = Number(s)
  if (!Number.isFinite(n)) return `${s.slice(0, 8)}…`
  if (n === 0) return '0'
  if (n < 0.0001) return '<0.0001'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 4, minimumFractionDigits: 0 })
}

export default function WalletBar() {
  const {
    address,
    chainId,
    isConnecting,
    error,
    connect,
    disconnect,
    ensureTargetChain,
  } = useWallet()

  const [balanceWei, setBalanceWei] = useState<bigint | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [copyDone, setCopyDone] = useState(false)

  const chainOk = chainId !== null && chainId === TARGET_CHAIN_ID
  const { name: chainName, short: chainShort } = getChainLabel(chainId)

  const fetchBalance = useCallback(async () => {
    if (!address || !window.ethereum) {
      setBalanceWei(null)
      return
    }
    setBalanceLoading(true)
    try {
      const provider = new BrowserProvider(window.ethereum)
      const bal = await provider.getBalance(address)
      setBalanceWei(bal)
    } catch {
      setBalanceWei(null)
    } finally {
      setBalanceLoading(false)
    }
  }, [address])

  useEffect(() => {
    void fetchBalance()
  }, [fetchBalance, chainId])

  useEffect(() => {
    if (!address || !window.ethereum) return
    const id = window.setInterval(() => void fetchBalance(), 25_000)
    return () => window.clearInterval(id)
  }, [address, fetchBalance])

  const onCopy = () => {
    if (!address || !navigator.clipboard?.writeText) return
    void navigator.clipboard.writeText(address).then(() => {
      setCopyDone(true)
      window.setTimeout(() => setCopyDone(false), 2000)
    })
  }

  return (
    <div className="wallet-strip-wrap">
      {!address ? (
        <div className="wallet-strip wallet-strip--idle">
          <span className="wallet-strip-label" aria-hidden>⛓️</span>
          <button
            type="button"
            className="wallet-strip-btn wallet-strip-btn--main"
            onClick={() => void connect()}
            disabled={isConnecting}
          >
            {isConnecting ? '连接中…' : '连接钱包'}
          </button>
          {error && (
            <span className="wallet-strip-err-icon" title={error}>
              ⚠️
            </span>
          )}
        </div>
      ) : (
        <div className="wallet-strip wallet-strip--live" title={chainName}>
          {error && (
            <span className="wallet-strip-err-icon" title={error}>
              ⚠️
            </span>
          )}
          <span
            className={`wallet-strip-net ${chainOk ? 'wallet-strip-net--ok' : 'wallet-strip-net--warn'}`}
          >
            <span className="wallet-strip-net-dot" />
            {chainShort}
          </span>
          {!chainOk && (
            <button
              type="button"
              className="wallet-strip-btn wallet-strip-btn--mini"
              onClick={() =>
                void ensureTargetChain().catch((e) => console.error('切换网络失败:', e))
              }
            >
              切链
            </button>
          )}
          <span className="wallet-strip-bal" title="ETH 余额">
            {balanceLoading && balanceWei === null ? (
              <span className="wallet-strip-bal-pending">···</span>
            ) : (
              <>
                <span className="wallet-strip-bal-num">
                  {balanceWei !== null ? trimEthDisplay(balanceWei) : '—'}
                </span>
                <span className="wallet-strip-bal-unit">ETH</span>
              </>
            )}
          </span>
          <span className="wallet-strip-div" aria-hidden />
          <code className="wallet-strip-addr" title={address}>
            {shortenAddress(address)}
          </code>
          <button
            type="button"
            className="wallet-strip-btn wallet-strip-btn--icon"
            onClick={onCopy}
            title={copyDone ? '已复制' : '复制地址'}
            aria-label="复制地址"
          >
            {copyDone ? '✓' : '📋'}
          </button>
          <button
            type="button"
            className="wallet-strip-btn wallet-strip-btn--icon"
            onClick={() => void fetchBalance()}
            title="刷新余额"
            aria-label="刷新余额"
          >
            ↻
          </button>
          <button
            type="button"
            className="wallet-strip-btn wallet-strip-btn--mini wallet-strip-btn--ghost"
            onClick={disconnect}
          >
            断开
          </button>
        </div>
      )}
    </div>
  )
}
