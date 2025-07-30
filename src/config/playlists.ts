/**
 * Default playlists configuration
 * Add your default playlists here instead of using environment variables
 */

export interface PlaylistConfig {
  id: string
  name: string
  description: string
  url: string
  songCount: string
  genre: string
  estimatedSongs?: number
}

/**
 * Default playlists that are available in the application
 * These are hardcoded and don't require environment variables
 */
export const DEFAULT_PLAYLISTS: PlaylistConfig[] = [
  {
    id: 'xenoblade-1',
    name: 'Xenoblade Chronicles 1',
    description: 'Xenoblade Chronicles: Definitive Edition OST [Game-Rip]',
    url: 'https://www.youtube.com/watch?v=d7V3M2DAq1E&list=PLIpqsKgkQEvPAqsHciUotnyjm02WeaQar',
    songCount: '99',
    genre: 'RPG/Orchestral',
    estimatedSongs: 99
  },
  {
    id: 'xenoblade-2',
    name: 'Xenoblade Chronicles 2',
    description: 'Xenoblade Chronicles 2 OST [Game-Rip]',
    url: 'https://www.youtube.com/watch?v=PFto0LPNkBI&list=PLIpqsKgkQEvMUFbngp-GbW1JwDGXnxcm9',
    songCount: '119',
    genre: 'RPG/Anime',
    estimatedSongs: 119
  },
  {
    id: 'xenoblade-3',
    name: 'Xenoblade Chronicles 3',
    description: 'Xenoblade Chronicles 3 Original Soundtrack',
    url: 'https://www.youtube.com/watch?v=kPxRL2nta7I&list=PLgBAXaMeVtypgOvL6OcYI3D_oOgA9hcC8',
    songCount: '142',
    genre: 'RPG/Anime',
    estimatedSongs: 142
  },
  {
    id: 'xenoblade-x',
    name: 'Xenoblade Chronicles X DE',
    description: 'Xenoblade Chronicles X Original Soundtrack and some DE tracks',
    url: 'https://www.youtube.com/watch?v=_DfjXNZ3sMA&list=PLP0B1G-EHwBqoWAxCrpBUy4LNrvlmuYP9',
    songCount: '63',
    genre: 'RPG/Anime',
    estimatedSongs: 63
  },
  {
    id: 'xenoblade-trilogy',
    name: 'Xenoblade Chronicles Trilogy',
    description: 'Xenoblade Chronicles 1, 2 and 3 Original Soundtrack',
    url: 'https://www.youtube.com/watch?v=d7V3M2DAq1E&list=PLP0B1G-EHwBoT6fL2Wg0H7cMJpku9-w-M',
    songCount: '360',
    genre: 'RPG/Anime',
    estimatedSongs: 360
  },
]

/**
 * Get a playlist configuration by ID
 */
export function getPlaylistById(id: string): PlaylistConfig | undefined {
  return DEFAULT_PLAYLISTS.find(playlist => playlist.id === id)
}

/**
 * Get the default Xenoblade playlist URL (for backward compatibility)
 * This replaces the environment variable approach
 */
export function getDefaultXenobladePlaylistUrl(): string {
  const xenobladePlaylist = DEFAULT_PLAYLISTS.find(p => p.id === 'xenoblade-1')
  return xenobladePlaylist?.url || ''
}

/**
 * Check if a URL matches any of the default playlists
 */
export function getPlaylistConfigByUrl(url: string): PlaylistConfig | undefined {
  return DEFAULT_PLAYLISTS.find(playlist => playlist.url === url)
}

/**
 * Get a human-readable label for a playlist URL
 */
export function getPlaylistLabel(url: string): string {
  const config = getPlaylistConfigByUrl(url)
  if (config) {
    return config.name
  }

  if (url && url.startsWith('http')) {
    return 'Custom Playlist'
  }

  return 'Default Playlist'
}
