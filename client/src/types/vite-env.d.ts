/// <reference types="vite/client" />

// Tells TypeScript which VITE_ settings exist.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_IDLE_MINUTES?: string; // kiosk: minutes before an untouched student page goes Home
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}