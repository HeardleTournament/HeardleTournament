/**
 * Environment configuration
 */

/**
 * Get YouTube API key from environment variables
 * @returns YouTube API key or null if not set
 */
export function getYouTubeApiKey(): string | null {
  return import.meta.env.VITE_YOUTUBE_API_KEY || null
}

/**
 * Check if YouTube API key is configured
 * @returns True if API key is available
 */
export function hasYouTubeApiKey(): boolean {
  return !!import.meta.env.VITE_YOUTUBE_API_KEY
}

export function getXenobladePlaylistUrl(): string  {
  return import.meta.env.VITE_XENO_PLAYLIST
}

/**
 * Get all available environment variables (for debugging)
 * @returns Environment variables object
 */
export function getEnvInfo() {
  return {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    hasApiKey: hasYouTubeApiKey(),
    // Don't log the actual API key for security
    apiKeyConfigured: !!import.meta.env.VITE_YOUTUBE_API_KEY,
  }
}
