/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EXPLAIN_API_URL: string;
  readonly VITE_EXPLAIN_GATE_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
