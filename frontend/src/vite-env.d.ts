/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACADEMIC_INTEGRITY_ANCHOR_ADDRESS?: string
  readonly VITE_CHAIN_ID?: string
  readonly VITE_SEPOLIA_RPC_URL?: string
  readonly VITE_LOCAL_RPC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

