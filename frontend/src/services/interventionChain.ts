import { BrowserProvider, solidityPackedKeccak256 } from 'ethers'
import type { Intervention } from './interventions'
import { canonicalInterventionStatusClient } from './interventions'
import { appendChainTxRecord } from './chainTxHistory'
import { getAcademicIntegrityWithSigner } from './blockchainContract'

const TARGET_CHAIN_ID = BigInt(import.meta.env.VITE_CHAIN_ID ?? '11155111')

/** keccak256(abi.encodePacked("intervention:", mongoObjectId)) */
export function computeInterventionRecordKey(interventionMongoId: string): string {
  return solidityPackedKeccak256(['string', 'string'], ['intervention:', interventionMongoId])
}

/**
 * 创建时快照：字段顺序固定；空字段用空串，状态用规范值。
 */
export function computeInterventionContentHash(
  i: Pick<
    Intervention,
    | 'studentId'
    | 'studentName'
    | 'type'
    | 'status'
    | 'description'
    | 'createdBy'
    | 'createdByName'
    | 'createdAt'
  > & {
    warningId?: string
    plan?: string
    assignedTo?: string
    assignedToName?: string
  }
): string {
  const createdAt =
    typeof i.createdAt === 'string' ? i.createdAt : new Date(i.createdAt as string).toISOString()
  const status = canonicalInterventionStatusClient(i.status)
  return solidityPackedKeccak256(
    [
      'string',
      'string',
      'string',
      'string',
      'string',
      'string',
      'string',
      'string',
      'string',
      'string',
      'string',
      'string',
    ],
    [
      i.studentId,
      i.studentName,
      (i.warningId ?? '').trim(),
      i.type,
      status,
      i.description,
      (i.plan ?? '').trim(),
      i.createdBy,
      i.createdByName,
      (i.assignedTo ?? '').trim(),
      (i.assignedToName ?? '').trim(),
      createdAt,
    ]
  )
}

export function computeInterventionReviewStepHash(
  interventionMongoId: string,
  result: 'pass' | 'fail',
  opinion: string
): string {
  return solidityPackedKeccak256(
    ['string', 'string', 'string', 'string'],
    ['review:', interventionMongoId, result, opinion.trim()]
  )
}

export function computeInterventionRevokeStepHash(interventionMongoId: string, reason: string): string {
  return solidityPackedKeccak256(
    ['string', 'string', 'string'],
    ['revoke:', interventionMongoId, reason.trim()]
  )
}

function normalizeInterventionId(intervention: Intervention): string {
  const id = intervention._id as unknown
  if (typeof id === 'string' && id) return id
  if (id != null && typeof (id as { toString?: () => string }).toString === 'function') {
    return String(id)
  }
  return ''
}

function alreadyAnchoredMessage(err: unknown): boolean {
  const s = err instanceof Error ? err.message : String(err)
  return s.includes('AlreadyAnchored') || s.includes('already anchored')
}

/** anchorIntervention；返回交易哈希（可写入 blockHash） */
export async function anchorInterventionOnChain(intervention: Intervention): Promise<string> {
  if (!window.ethereum) {
    throw new Error('未检测到 MetaMask 等钱包，请先连接')
  }
  const iid = normalizeInterventionId(intervention)
  if (!iid) {
    throw new Error('干预 ID 无效，无法上链')
  }
  const provider = new BrowserProvider(window.ethereum)
  const network = await provider.getNetwork()
  if (network.chainId !== TARGET_CHAIN_ID) {
    throw new Error(`请先在钱包中切换到目标网络（chainId=${TARGET_CHAIN_ID.toString()}）`)
  }

  const contract = await getAcademicIntegrityWithSigner()
  const recordKey = computeInterventionRecordKey(iid)
  const createdAtRaw = intervention.createdAt
  const createdAtStr =
    typeof createdAtRaw === 'string'
      ? createdAtRaw
      : createdAtRaw != null
        ? new Date(createdAtRaw as unknown as Date).toISOString()
        : ''
  const contentHash = computeInterventionContentHash({
    studentId: intervention.studentId,
    studentName: intervention.studentName,
    warningId: intervention.warningId,
    type: intervention.type,
    status: intervention.status,
    description: intervention.description,
    plan: intervention.plan,
    createdBy: intervention.createdBy,
    createdByName: intervention.createdByName,
    assignedTo: intervention.assignedTo,
    assignedToName: intervention.assignedToName,
    createdAt: createdAtStr,
  })

  try {
    const tx = await contract.anchorIntervention(recordKey, contentHash)
    const receipt = await tx.wait()
    if (!receipt || receipt.status !== 1) {
      throw new Error('链上交易失败或未打包')
    }
    await appendChainTxRecord(receipt, { action: '干预链上存证（anchorIntervention）' })
    return receipt.hash
  } catch (e: unknown) {
    if (alreadyAnchoredMessage(e)) {
      throw new Error('该干预已在链上存证过（每条记录仅可锚定一次）')
    }
    throw e instanceof Error ? e : new Error('链上存证失败')
  }
}

/** 已锚定则 appendInterventionAudit，否则 logInterventionTrace */
export async function appendOrTraceInterventionStepOnChain(
  interventionMongoId: string,
  stepHash: string,
  options?: { action?: string }
): Promise<string> {
  if (!window.ethereum) {
    throw new Error('未检测到 MetaMask 等钱包，请先连接')
  }
  const id = interventionMongoId.trim()
  if (!id) {
    throw new Error('干预 ID 无效')
  }
  const provider = new BrowserProvider(window.ethereum)
  const network = await provider.getNetwork()
  if (network.chainId !== TARGET_CHAIN_ID) {
    throw new Error(`请先在钱包中切换到目标网络（chainId=${TARGET_CHAIN_ID.toString()}）`)
  }

  const contract = await getAcademicIntegrityWithSigner()
  const recordKey = computeInterventionRecordKey(id)
  const row = await contract.interventions(recordKey)
  const exists = Boolean(row[3])
  const tx = exists
    ? await contract.appendInterventionAudit(recordKey, stepHash)
    : await contract.logInterventionTrace(recordKey, stepHash)
  const receipt = await tx.wait()
  if (!receipt || receipt.status !== 1) {
    throw new Error('链上交易失败或未打包')
  }
  const actionLabel =
    options?.action ??
    (exists ? '干预审计步骤（appendInterventionAudit）' : '干预链上留痕（logInterventionTrace）')
  await appendChainTxRecord(receipt, { action: actionLabel })
  return receipt.hash
}

export { explorerTxUrl } from './warningChain'
