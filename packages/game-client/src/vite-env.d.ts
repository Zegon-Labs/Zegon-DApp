/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_OG_COMPUTE: string;
  readonly VITE_LOCAL_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
