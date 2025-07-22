/**
 * Utility functions for YouTube video handling
 */

/**
 * Extracts YouTube video ID from various YouTube URL formats
 * @param url - YouTube URL
 * @returns Video ID or null if not found
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    // Standard watch URL
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embedded URL
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // Mobile URL
    /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // Short URL
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  // If it's already just a video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url
  }

  return null
}

/**
 * Validates if a string is a valid YouTube video ID
 * @param videoId - Video ID to validate
 * @returns True if valid
 */
export function isValidYouTubeVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
}

/**
 * Creates a YouTube thumbnail URL from video ID
 * @param videoId - YouTube video ID
 * @param quality - Thumbnail quality
 * @returns Thumbnail URL
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium',
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`
}

/**
 * Extracts playlist ID from YouTube playlist URL
 * @param url - YouTube playlist URL
 * @returns Playlist ID or null if not found
 */
export function extractYouTubePlaylistId(url: string): string | null {
  const patterns = [
    // Standard playlist URL
    /[?&]list=([a-zA-Z0-9_-]+)/,
    // Embedded playlist URL
    /youtube\.com\/embed\/videoseries\?list=([a-zA-Z0-9_-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  // If it's already just a playlist ID
  if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 11) {
    return url
  }

  return null
}

/**
 * YouTube playlist video item interface
 */
export interface YouTubePlaylistItem {
  videoId: string
  title: string
  description: string
  thumbnail: string
  duration?: string
  publishedAt: string
  channelTitle: string
}

/**
 * Fetches all videos from a YouTube playlist using YouTube Data API v3
 * @param playlistId - YouTube playlist ID
 * @param apiKey - YouTube Data API key
 * @returns Promise resolving to array of playlist items
 */
export async function fetchPlaylistVideos(
  playlistId: string,
  apiKey: string,
): Promise<YouTubePlaylistItem[]> {
  const videos: YouTubePlaylistItem[] = []
  let nextPageToken = ''
  const maxResults = 50 // Maximum allowed by API

  try {
    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('playlistId', playlistId)
      url.searchParams.set('maxResults', maxResults.toString())
      url.searchParams.set('key', apiKey)

      if (nextPageToken) {
        url.searchParams.set('pageToken', nextPageToken)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      for (const item of data.items) {
        const snippet = item.snippet
        videos.push({
          videoId: snippet.resourceId.videoId,
          title: snippet.title,
          description: snippet.description,
          thumbnail: snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
          publishedAt: snippet.publishedAt,
          channelTitle: snippet.channelTitle,
        })
      }

      nextPageToken = data.nextPageToken || ''
    } while (nextPageToken)

    return videos
  } catch (error) {
    console.error('Error fetching playlist videos:', error)
    throw error
  }
}

/**
 * Alternative method using a simpler approach (less reliable, no API key needed)
 * This method scrapes playlist data from YouTube's public pages
 * Note: This is less reliable and may break with YouTube updates
 */
export async function fetchPlaylistVideosSimple(
  playlistId: string,
): Promise<YouTubePlaylistItem[]> {
  try {
    // This is a simplified example - in practice, you'd need to handle CORS
    // and potentially use a proxy server or browser extension
    const response = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`)
    await response.text() // We're not using the HTML content in this example

    // This would require HTML parsing and is not recommended for production
    // It's shown here for educational purposes only
    console.warn('Simple playlist fetching is not implemented - use YouTube Data API instead')
    return []
  } catch (error) {
    console.error('Error in simple playlist fetch:', error)
    throw error
  }
}
