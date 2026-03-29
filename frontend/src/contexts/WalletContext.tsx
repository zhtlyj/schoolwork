import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on?: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
    }
  }
}

/** 与 .env 中 VITE_CHAIN_ID 一致；默认 Sepolia */
export const TARGET_CHAIN_ID = BigInt(import.meta.env.VITE_CHAIN_ID ?? '11155111')

type WalletContextValue = {
  address: string | null
  chainId: bigint | null
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  ensureTargetChain: () => Promise<void>
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<bigint | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshChain = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) return
    const id = await eth.request({ method: 'eth_chainId' })
    setChainId(BigInt(String(id)))
  }, [])

  const refreshAccounts = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) return
    const accs = await eth.request({ method: 'eth_accounts' })
    const list = accs as string[]
    setAddress(list[0] ?? null)
  }, [])

  useEffect(() => {
    const eth = window.ethereum
    if (!eth) return

    const onAccounts = () => {
      void refreshAccounts()
    }
    const onChain = () => {
      void refreshChain()
    }

    void refreshAccounts()
    void refreshChain()
    eth.on?.('accountsChanged', onAccounts)
    eth.on?.('chainChanged', onChain)
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts)
      eth.removeListener?.('chainChanged', onChain)
    }
  }, [refreshAccounts, refreshChain])

  const connect = useCallback(async () => {
    setError(null)
    const eth = window.ethereum
    if (!eth) {
      setError('未检测到钱包（如 MetaMask），请安装浏览器扩展后重试')
      return
    }
    setIsConnecting(true)
    try {
      await eth.request({ method: 'eth_requestAccounts' })
      await refreshAccounts()
      await refreshChain()
    } catch (e) {
      setError(e instanceof Error ? e.message : '连接钱包失败')
    } finally {
      setIsConnecting(false)
    }
  }, [refreshAccounts, refreshChain])

  const disconnect = useCallback(() => {
    setAddress(null)
    setError(null)
  }, [])

  const ensureTargetChain = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) throw new Error('未检测到钱包')
    const hex = '0x' + TARGET_CHAIN_ID.toString(16)
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hex }],
      })
    } catch (e: unknown) {
      const err = e as { code?: number }
      if (err.code !== 4902) throw e

      if (TARGET_CHAIN_ID === 11155111n) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: hex,
              chainName: 'Sepolia',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: [
                import.meta.env.VITE_SEPOLIA_RPC_URL ||
                  'https://ethereum-sepolia-rpc.publicnode.com',
              ],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        })
      } else if (TARGET_CHAIN_ID === 31337n) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: hex,
              chainName: 'Hardhat Local',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: [import.meta.env.VITE_LOCAL_RPC_URL || 'http://127.0.0.1:8545'],
            },
          ],
        })
      } else {
        throw e
      }
    }
    await refreshChain()
  }, [refreshChain])

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnecting,
        error,
        connect,
        disconnect,
        ensureTargetChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWallet 需在 WalletProvider 内使用')
  }
  return ctx
}
