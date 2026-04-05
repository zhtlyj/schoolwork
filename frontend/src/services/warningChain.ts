import { BrowserProvider, solidityPackedKeccak256 } from 'ethers'
import type { Warning } from './warnings'
import { appendChainTxRecord } from './chainTxHistory'
import { getAcademicIntegrityWithSigner } from './blockchainContract'

const TARGET_CHAIN_ID = BigInt(import.meta.env.VITE_CHAIN_ID ?? '11155111')

/** 与合约注释一致：keccak256(abi.encodePacked("warning:", mongoObjectId)) */
export function computeWarningRecordKey(warningMongoId: string): string {
  return solidityPackedKeccak256(['string', 'string'], ['warning:', warningMongoId])
}

/** 取消预警上链：与 logWarningCancellation 的 payloadHash 对应 */
export function computeWarningCancelPayloadHash(warningMongoId: string, reason: string): string {
  return solidityPackedKeccak256(
    ['string', 'string', 'string'],
    ['cancel:', warningMongoId, reason]
  )
}

/** 学生确认知晓：与 logWarningTrace 的 stepHash 对应 */
export function computeWarningAckStepHash(warningMongoId: string, timestampIso: string): string {
  return solidityPackedKeccak256(
    ['string', 'string', 'string'],
    ['ack:', warningMongoId, timestampIso.trim()]
  )
}

/**
 * 与链下约定：对快照字段做 packed keccak，顺序与字段必须固定以便核验。
 */
export function computeWarningContentHash(
  w: Pick<
    Warning,
    | 'studentId'
    | 'studentName'
    | 'type'
    | 'level'
    | 'course'
    | 'message'
    | 'createdBy'
    | 'createdByName'
    | 'createdAt'
  >
): string {
  const createdAt =
    typeof w.createdAt === 'string' ? w.createdAt : new Date(w.createdAt as string).toISOString()
  return solidityPackedKeccak256(
    ['string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string'],
    [
      w.studentId,
      w.studentName,
      w.type,
      w.level,
      w.course,
      w.message,
      w.createdBy,
      w.createdByName,
      createdAt,
    ]
  )
}

function alreadyAnchoredMessage(err: unknown): boolean {
  const s = err instanceof Error ? err.message : String(err)
  return s.includes('AlreadyAnchored') || s.includes('already anchored')
}

/**
 * 调用 AcademicIntegrityAnchor.anchorWarning；MetaMask 会弹出确认。
 * @returns 交易哈希（写入后台 blockHash 字段）
 */
function normalizeWarningId(warning: Warning): string {
  const id = warning._id as unknown
  if (typeof id === 'string' && id) return id
  if (id != null && typeof (id as { toString?: () => string }).toString === 'function') {
    return String(id)
  }
  return ''
}

export async function anchorWarningOnChain(warning: Warning): Promise<string> {
  if (!window.ethereum) {
    throw new Error('未检测到 MetaMask 等钱包，请先连接')
  }
  const wid = normalizeWarningId(warning)
  if (!wid) {
    throw new Error('预警 ID 无效，无法上链')
  }
  const provider = new BrowserProvider(window.ethereum)
  const network = await provider.getNetwork()
  if (network.chainId !== TARGET_CHAIN_ID) {
    throw new Error(`请先在钱包中切换到目标网络（chainId=${TARGET_CHAIN_ID.toString()}）`)
  }

  const contract = await getAcademicIntegrityWithSigner()
  const recordKey = computeWarningRecordKey(wid)
  const createdAtRaw = warning.createdAt
  const createdAtStr =
    typeof createdAtRaw === 'string'
      ? createdAtRaw
      : createdAtRaw != null
        ? new Date(createdAtRaw as unknown as Date).toISOString()
        : ''
  const contentHash = computeWarningContentHash({
    studentId: warning.studentId,
    studentName: warning.studentName,
    type: warning.type,
    level: warning.level,
    course: warning.course,
    message: warning.message,
    createdBy: warning.createdBy,
    createdByName: warning.createdByName,
    createdAt: createdAtStr,
  })

  try {
    const tx = await contract.anchorWarning(recordKey, contentHash)
    const receipt = await tx.wait()
    if (!receipt || receipt.status !== 1) {
      throw new Error('链上交易失败或未打包')
    }
    await appendChainTxRecord(receipt, { action: '预警链上存证（anchorWarning）' })
    return receipt.hash
  } catch (e: unknown) {
    if (alreadyAnchoredMessage(e)) {
      throw new Error('该预警已在链上存证过（每条记录仅可锚定一次）')
    }
    throw e instanceof Error ? e : new Error('链上存证失败')
  }
}

/**
 * 记录预警取消（先 MetaMask 确认，再删库）
 */
export async function logWarningCancellationOnChain(
  warningMongoId: string,
  reason: string
): Promise<string> {
  if (!window.ethereum) {
    throw new Error('未检测到 MetaMask 等钱包，请先连接')
  }
  const id = warningMongoId.trim()
  if (!id) {
    throw new Error('预警 ID 无效')
  }
  const provider = new BrowserProvider(window.ethereum)
  const network = await provider.getNetwork()
  if (network.chainId !== TARGET_CHAIN_ID) {
    throw new Error(`请先在钱包中切换到目标网络（chainId=${TARGET_CHAIN_ID.toString()}）`)
  }
  const contract = await getAcademicIntegrityWithSigner()
  const recordKey = computeWarningRecordKey(id)
  const payloadHash = computeWarningCancelPayloadHash(id, reason)
  const tx = await contract.logWarningCancellation(recordKey, payloadHash)
  const receipt = await tx.wait()
  if (!receipt || receipt.status !== 1) {
    throw new Error('链上交易失败或未打包')
  }
  await appendChainTxRecord(receipt, { action: '预警取消链上记录（logWarningCancellation）' })
  return receipt.hash
}

/**
 * 学生端「已阅读并知晓」：调用 logWarningTrace，需 MetaMask 签名。
 */
export async function logWarningTraceOnChain(warningMongoId: string, stepHash: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('未检测到 MetaMask 等钱包，请先连接')
  }
  const provider = new BrowserProvider(window.ethereum)
  const network = await provider.getNetwork()
  if (network.chainId !== TARGET_CHAIN_ID) {
    throw new Error(`请先在钱包中切换到目标网络（chainId=${TARGET_CHAIN_ID.toString()}）`)
  }
  const contract = await getAcademicIntegrityWithSigner()
  const recordKey = computeWarningRecordKey(warningMongoId)
  const tx = await contract.logWarningTrace(recordKey, stepHash)
  const receipt = await tx.wait()
  if (!receipt || receipt.status !== 1) {
    throw new Error('链上交易失败或未打包')
  }
  await appendChainTxRecord(receipt, { action: '学生确认预警（logWarningTrace）' })
  return receipt.hash
}

export function explorerTxUrl(txHash: string): string | null {
  const id = TARGET_CHAIN_ID
  if (id === 11155111n) return `https://sepolia.etherscan.io/tx/${txHash}`
  if (id === 1n) return `https://etherscan.io/tx/${txHash}`
  if (id === 31337n) return null
  return null
}
