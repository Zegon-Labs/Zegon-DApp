/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_OG_COMPUTE: string;
  readonly VITE_LOCAL_API: string;
  readonly VITE_LEADERBOARD_CONTRACT_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
