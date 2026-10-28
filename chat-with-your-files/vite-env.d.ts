/// <reference types="vite/client" />

declare const __LOOM_HOST__: string;
declare const __LOOM_ADMIN_URL__: string;

interface ImportMetaEnv {
  readonly VITE_STORAGE_PROFILE: string;
}
