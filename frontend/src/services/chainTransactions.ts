import api from './api'
import type { ChainTxHistoryRecord } from './chainTxHistory'

export interface ChainTransactionsListResponse {
  records: ChainTxHistoryRecord[]
}

export const chainTransactionService = {
  async list(limit = 200): Promise<ChainTransactionsListResponse> {
    const res = await api.get<ChainTransactionsListResponse>('/chain-transactions', {
      params: { limit },
    })
    return res.data
  },

  async create(entry: Omit<ChainTxHistoryRecord, 'id' | 'recordedAt'>): Promise<{ record: ChainTxHistoryRecord }> {
    const res = await api.post<{ record: ChainTxHistoryRecord }>('/chain-transactions', entry)
    return res.data
  },

  async clearMine(): Promise<void> {
    await api.delete('/chain-transactions')
  },
}
