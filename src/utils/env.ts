/**
 * Environment configuration
 */

/**
 * Get YouTube API key from environment variables
 * @returns YouTube API key or null if not set
 */
export function getYouTubeApiKey(): string | null {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || null

  // Debug logging for troubleshooting
  if (apiKey) {
    console.log('YouTube API Key Debug:', {
      length: apiKey.length,
      firstChar: apiKey.charAt(0),
      lastChar: apiKey.charAt(apiKey.length - 1),
      startsWithAI: apiKey.startsWith('AI'),
      hasExtraChars: apiKey.includes('+') || apiKey.includes(' '),
      buildTime: new Date().toISOString()
    })
  } else {
    console.log('YouTube API Key is null or undefined')
  }

  return apiKey
}

/**
 * Check if YouTube API key is configured
 * @returns True if API key is available
 */
export function hasYouTubeApiKey(): boolean {
  return !!import.meta.env.VITE_YOUTUBE_API_KEY
}

export function getXenobladePlaylistUrl(): string {
  // For backward compatibility, first check if environment variable is set
  const envPlaylistUrl = import.meta.env.VITE_XENO_PLAYLIST

  if (envPlaylistUrl) {
    // Debug logging for troubleshooting
    console.log('Xenoblade Playlist URL Debug (from env):', {
      url: envPlaylistUrl || 'undefined/empty',
      length: envPlaylistUrl ? envPlaylistUrl.length : 0,
      isString: typeof envPlaylistUrl === 'string',
      buildTime: new Date().toISOString()
    })
    return envPlaylistUrl
  }

  // Fallback to default configuration
  console.log('Using default Xenoblade playlist from config')
  return 'https://www.youtube.com/playlist?list=PLvNp0Boas721OFweCH2OdAbgaaziNHV7S'
}

/**
 * Check if Firebase is configured
 * @returns True if Firebase configuration is available
 */
export function hasFirebaseConfig(): boolean {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_DATABASE_URL &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  )
}

/**
 * Get Firebase configuration status
 * @returns Object with Firebase configuration details
 */
export function getFirebaseConfigStatus() {
  return {
    hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
    hasDatabaseUrl: !!import.meta.env.VITE_FIREBASE_DATABASE_URL,
    hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    hasAuthDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    isFullyConfigured: hasFirebaseConfig(),
  }
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
    hasFirebase: hasFirebaseConfig(),
    // Don't log the actual API keys for security
    apiKeyConfigured: !!import.meta.env.VITE_YOUTUBE_API_KEY,
    firebaseConfigured: hasFirebaseConfig(),
  }
}
