import { BrowserProvider, Contract } from 'ethers'
import {
  ACADEMIC_INTEGRITY_ANCHOR_ABI,
  ACADEMIC_INTEGRITY_ANCHOR_ADDRESS,
  requireContractAddress,
} from '../contracts/academicIntegrityAnchor'

export function getAcademicIntegrityReadonly(): Contract {
  if (!window.ethereum) {
    throw new Error('未检测到钱包')
  }
  const addr = requireContractAddress()
  const provider = new BrowserProvider(window.ethereum)
  return new Contract(addr, ACADEMIC_INTEGRITY_ANCHOR_ABI, provider)
}

export async function getAcademicIntegrityWithSigner(): Promise<Contract> {
  if (!window.ethereum) {
    throw new Error('未检测到钱包')
  }
  const addr = requireContractAddress()
  const provider = new BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  return new Contract(addr, ACADEMIC_INTEGRITY_ANCHOR_ABI, signer)
}

/** 检查当前环境配置的合约地址上是否存在字节码（需钱包可读 RPC） */
export async function verifyContractCodeOnChain(): Promise<{
  ok: boolean
  message: string
}> {
  const addr = ACADEMIC_INTEGRITY_ANCHOR_ADDRESS.trim()
  if (!addr) {
    return { ok: false, message: '未配置 VITE_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS' }
  }
  if (!window.ethereum) {
    return { ok: false, message: '未检测到钱包，无法查询链上代码' }
  }
  try {
    const provider = new BrowserProvider(window.ethereum)
    const code = await provider.getCode(addr)
    if (!code || code === '0x') {
      return { ok: false, message: '该地址在当前网络上无合约字节码' }
    }
    return { ok: true, message: '当前网络下该地址存在合约代码' }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : '查询失败',
    }
  }
}
