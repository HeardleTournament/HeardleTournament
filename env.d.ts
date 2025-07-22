/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOUTUBE_API_KEY: string
  readonly VITE_XENO_PLAYLIST: string
  // Add other environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
