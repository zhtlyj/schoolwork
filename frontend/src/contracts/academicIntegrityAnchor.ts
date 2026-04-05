// ABI 与 backend/hardhat 编译产物 AcademicIntegrityAnchor.json 保持一致；合约变更后请运行 node scripts/sync-academic-anchor-abi.mjs
export const ACADEMIC_INTEGRITY_ANCHOR_ABI = [
  {
    "inputs": [],
    "name": "AlreadyAnchored",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InterventionNotAnchored",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "contentHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "anchoredAt",
        "type": "uint64"
      }
    ],
    "name": "InterventionAnchored",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "stepHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "ts",
        "type": "uint64"
      }
    ],
    "name": "InterventionAuditStep",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "contentHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "anchoredAt",
        "type": "uint64"
      }
    ],
    "name": "WarningAnchored",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "stepHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "ts",
        "type": "uint64"
      }
    ],
    "name": "WarningAuditStep",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "payloadHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "ts",
        "type": "uint64"
      }
    ],
    "name": "WarningCancellationLogged",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "contentHash",
        "type": "bytes32"
      }
    ],
    "name": "anchorIntervention",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "contentHash",
        "type": "bytes32"
      }
    ],
    "name": "anchorWarning",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "stepHash",
        "type": "bytes32"
      }
    ],
    "name": "appendInterventionAudit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "interventions",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "contentHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "anchoredAt",
        "type": "uint64"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "stepHash",
        "type": "bytes32"
      }
    ],
    "name": "logInterventionTrace",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "payloadHash",
        "type": "bytes32"
      }
    ],
    "name": "logWarningCancellation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "recordKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "stepHash",
        "type": "bytes32"
      }
    ],
    "name": "logWarningTrace",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "warnings",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "contentHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "anchoredAt",
        "type": "uint64"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

/**
 * 本地备用地址：当未设置 `VITE_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS` 时使用。
 * 重新部署合约后请在此或 .env 中同步更新（二者优先读环境变量）。
 */
export const FALLBACK_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS =
  '0xA39614245eE7fF4db373414e76e43d40C2589Db0'

const fromEnv = (import.meta.env.VITE_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS ?? '').trim()

export const ACADEMIC_INTEGRITY_ANCHOR_ADDRESS = (
  fromEnv || FALLBACK_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS
).trim()

export function requireContractAddress(): string {
  if (!ACADEMIC_INTEGRITY_ANCHOR_ADDRESS) {
    throw new Error(
      '请配置合约地址：在 frontend/.env 设置 VITE_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS，或在 contracts/academicIntegrityAnchor.ts 中填写 FALLBACK_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS'
    )
  }
  return ACADEMIC_INTEGRITY_ANCHOR_ADDRESS
}
