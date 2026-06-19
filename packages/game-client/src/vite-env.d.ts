/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_OG_COMPUTE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
