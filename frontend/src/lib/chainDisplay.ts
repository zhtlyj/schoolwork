/** 用于顶栏展示；未知链仅显示 chainId */
export function getChainLabel(chainId: bigint | null): { name: string; short: string } {
  if (chainId === null) {
    return { name: '未发现网络', short: '—' }
  }
  const id = chainId.toString()
  const map: Record<string, { name: string; short: string }> = {
    '1': { name: 'Ethereum 主网', short: 'Mainnet' },
    '11155111': { name: 'Sepolia 测试网', short: 'Sepolia' },
    '31337': { name: 'Hardhat 本地', short: 'Local' },
    '17000': { name: 'Holesky 测试网', short: 'Holesky' },
    '42161': { name: 'Arbitrum One', short: 'Arb' },
    '8453': { name: 'Base', short: 'Base' },
  }
  return map[id] ?? { name: `Chain ${id}`, short: `#${id}` }
}
