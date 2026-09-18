/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PINATA_API_KEY: string
  readonly VITE_PINATA_SECRET_API_KEY: string
  readonly VITE_PINATA_JWT: string
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_USDC_ADDRESS: string
  readonly VITE_USDT_ADDRESS: string
  readonly VITE_ELEVENLABS_API_KEY: string
  readonly VITE_AIMLAPI_API_KEY: string
  readonly VITE_OPENAI_API_KEY?: string
  readonly VITE_SUPABASE_FUNCTION_URL?: string
  readonly VITE_SUPABASE_ZKSEND_FUNCTION_URL?: string
  /** Opt-in: enable Internal Wallet / Circle DCW on Arc Mainnet (`ARC`). Default off. */
  readonly VITE_CIRCLE_ARC_MAINNET_ENABLED?: string
  /** Optional override for Circle Arc Mainnet blockchain code (default `ARC`). */
  readonly VITE_CIRCLE_ARC_MAINNET_BLOCKCHAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
