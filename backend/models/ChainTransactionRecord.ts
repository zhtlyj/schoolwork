import mongoose, { Document, Schema } from 'mongoose'

export interface IChainTransactionRecord extends Document {
  userId: string
  userName: string
  txHash: string
  blockNumber: number
  blockHash: string
  gasUsed: string
  gasPriceWei: string
  feeWei: string
  action: string
  chainId: string
  fromAddress: string
  toAddress: string | null
  createdAt: Date
  updatedAt: Date
}

const ChainTransactionRecordSchema = new Schema<IChainTransactionRecord>(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    txHash: { type: String, required: true },
    blockNumber: { type: Number, required: true },
    blockHash: { type: String, required: true },
    gasUsed: { type: String, required: true },
    gasPriceWei: { type: String, required: true },
    feeWei: { type: String, required: true },
    action: { type: String, required: true },
    chainId: { type: String, required: true },
    fromAddress: { type: String, required: true },
    toAddress: { type: String, default: null },
  },
  { timestamps: true }
)

ChainTransactionRecordSchema.index({ userId: 1, createdAt: -1 })
ChainTransactionRecordSchema.index({ txHash: 1 }, { unique: true })

const ChainTransactionRecord =
  mongoose.models.ChainTransactionRecord ||
  mongoose.model<IChainTransactionRecord>('ChainTransactionRecord', ChainTransactionRecordSchema)

export default ChainTransactionRecord
