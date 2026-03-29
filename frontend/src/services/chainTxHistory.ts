import { formatEther } from 'ethers'
import type { ContractTransactionReceipt } from 'ethers'
import { chainTransactionService } from './chainTransactions'

export type ChainTxHistoryRecord = {
  id: string
  recordedAt: string
  txHash: string
  blockNumber: number
  blockHash: string
  gasUsed: string
  gasPriceWei: string
  feeWei: string
  action: string
  chainId: string
  from: string
  to: string | null
}

const listeners = new Set<() => void>()

export function subscribeChainTxHistory(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(): void {
  listeners.forEach((l) => {
    try {
      l()
    } catch {
      //
    }
  })
}

export async function fetchChainTxHistory(): Promise<ChainTxHistoryRecord[]> {
  const { records } = await chainTransactionService.list()
  return records
}

export async function clearChainTxHistoryRemote(): Promise<void> {
  await chainTransactionService.clearMine()
  notify()
}

/**
 * 交易确认成功后同步到服务器（按当前登录用户归属）；失败仅打日志，不影响业务流程。
 */
export async function appendChainTxRecord(
  receipt: ContractTransactionReceipt,
  meta: { action: string }
): Promise<void> {
  const chainId = (import.meta.env.VITE_CHAIN_ID ?? '11155111').trim()
  const feeWei = receipt.fee
  const gasPrice = receipt.gasPrice
  const payload: Omit<ChainTxHistoryRecord, 'id' | 'recordedAt'> = {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    gasUsed: receipt.gasUsed.toString(),
    gasPriceWei: gasPrice != null ? gasPrice.toString() : '0',
    feeWei: feeWei.toString(),
    action: meta.action,
    chainId,
    from: receipt.from,
    to: receipt.to,
  }
  try {
    await chainTransactionService.create(payload)
    notify()
  } catch (e) {
    console.error('链上交易记录同步到服务器失败:', e)
  }
}

/** 展示用：手续费 ETH 字符串 */
export function formatTxFeeEth(feeWei: string): string {
  try {
    return formatEther(BigInt(feeWei))
  } catch {
    return '—'
  }
}
