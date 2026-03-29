import { useCallback, useEffect, useState } from 'react'
import {
  clearChainTxHistoryRemote,
  fetchChainTxHistory,
  subscribeChainTxHistory,
  type ChainTxHistoryRecord,
} from '../services/chainTxHistory'

export function useChainTxHistory(): {
  records: ChainTxHistoryRecord[]
  loading: boolean
  error: string
  clear: () => Promise<void>
  reload: () => Promise<void>
} {
  const [records, setRecords] = useState<ChainTxHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchChainTxHistory()
      setRecords(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  const silentRefetch = useCallback(async () => {
    try {
      const data = await fetchChainTxHistory()
      setRecords(data)
    } catch {
      //
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    return subscribeChainTxHistory(() => {
      void silentRefetch()
    })
  }, [silentRefetch])

  const clear = useCallback(async () => {
    setError('')
    try {
      await clearChainTxHistoryRemote()
      setRecords([])
    } catch (e) {
      setError(e instanceof Error ? e.message : '清空失败')
    }
  }, [])

  return { records, loading, error, clear, reload }
}
