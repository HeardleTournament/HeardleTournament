import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import YouTubePlayer from 'youtube-player'
import {
  fetchPlaylistVideos,
  extractYouTubePlaylistId,
  type YouTubePlaylistItem,
} from '@/utils/youtube'
import { getXenobladePlaylistUrl, getYouTubeApiKey } from '@/utils/env'

export interface Track {
  id: string
  videoId: string
  title: string
  artist?: string
  duration?: number
}

type YouTubePlayerInstance = ReturnType<typeof YouTubePlayer>

export const useAudioPlayerStore = defineStore('audioPlayer', () => {
  // State
  const player = ref<YouTubePlayerInstance | null>(null)
  const playerElementId = ref<string | null>(null)
  const isPlayerReady = ref(false)
  const userInteracted = ref(false) // Track if user has interacted with player
  const currentTrack = ref<Track | null>(null)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const volume = ref(50)
  const currentTime = ref(0)
  const duration = ref(0)
  const playlist = ref<Track[]>([])
  const currentIndex = ref(-1)
  const isMuted = ref(false)
  const heardleMode = ref(false) // Flag to disable auto-advancement for Heardle

  // Getters
  const hasTrack = computed(() => currentTrack.value !== null)
  const hasPlaylist = computed(() => playlist.value.length > 0)
  const canGoNext = computed(() => currentIndex.value < playlist.value.length - 1)
  const canGoPrevious = computed(() => currentIndex.value > 0)
  const progress = computed(() =>
    duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0,
  )

  // Actions
  const initializePlayer = (elementId: string) => {
    if (player.value && playerElementId.value === elementId) return

    // If we have a player but it's attached to a different element, destroy it first
    if (player.value && playerElementId.value !== elementId) {
      player.value = null
      playerElementId.value = null
    }

    playerElementId.value = elementId
    isPlayerReady.value = false
    player.value = YouTubePlayer(elementId, {
      width: '100%',
      height: '1', // Make it 1px high instead of 0 to ensure it's rendered
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
      },
    })

    // Wait for player to be ready before setting up event listeners
    player.value.on('ready', () => {
      isPlayerReady.value = true

      // Set initial volume when player is ready
      if (player.value) {
        player.value.setVolume(volume.value).catch((err: Error) => {
          console.warn('Could not set initial volume:', err)
        })
      }
    })

    // Set up event listeners
    player.value.on('stateChange', (event: { data: number }) => {
      const state = event.data
      if (state === 1) {
        // Playing
        isPlaying.value = true
        isLoading.value = false
      } else if (state === 2) {
        // Paused
        isPlaying.value = false
      } else if (state === 3) {
        // Buffering
        isLoading.value = true
      } else if (state === 0) {
        // Ended - only auto-advance if not in Heardle mode
        isPlaying.value = false
        if (!heardleMode.value) {
          playNext()
        }
      }
    })

    player.value.on('ready', () => {
      updateDuration()
      setVolume(volume.value)
    })

    // Update current time periodically
    setInterval(async () => {
      if (player.value && isPlaying.value) {
        try {
          currentTime.value = await player.value.getCurrentTime()
        } catch {
          // Handle error silently
        }
      }
    }, 1000)
  }

  const loadTrack = async (track: Track) => {
    // Wait for player to be ready (with timeout)
    if (!isPlayerReady.value) {
      let waitTime = 0
      const maxWait = 5000 // 5 seconds timeout
      while (!isPlayerReady.value && waitTime < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        waitTime += 100
      }
    }

    currentTrack.value = track
    isLoading.value = true

    try {
      if (!player.value) throw new Error('Player not available')
      await player.value.loadVideoById(track.videoId)

      // Wait a bit for the video to be cued and check the state multiple times
      let attempts = 0
      const maxAttempts = 10
      let state = -1

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        try {
          if (!player.value) break
          state = await player.value.getPlayerState()

          // If we get a valid state (not UNSTARTED), we can proceed
          if (state !== -1) {
            break
          }
        } catch (stateError) {
          console.warn(`Error checking player state on attempt ${attempts + 1}:`, stateError)
        }

        attempts++
      }

      if (state === -1) {
        throw new Error('Video failed to load properly after multiple attempts')
      }

      await updateDuration()
    } catch (error) {
      console.error('Error loading track:', error)
      // Reset track if loading failed
      currentTrack.value = null
      isLoading.value = false
      throw error // Re-throw so calling code knows it failed
    } finally {
      // Always reset loading state
      isLoading.value = false
    }
  }

  const play = async () => {
    if (!player.value || !currentTrack.value) {
      return
    }

    if (!isPlayerReady.value) {
      return
    }

    try {
      // Mark that user has interacted when play is called directly
      userInteracted.value = true

      await player.value.playVideo()

      // Check player state after play attempt
      setTimeout(async () => {
        try {
          if (player.value) {
            const state = await player.value.getPlayerState()

            if (state !== 1) {
              if (!userInteracted.value) {
                // User must interact with the page first
              }
            }
          }
        } catch {
          // Error checking player state
        }
      }, 1000)
    } catch (error) {
      console.error('Error playing:', error)
    }
  }

  const pause = async () => {
    if (!player.value || !isPlayerReady.value) return

    try {
      await player.value.pauseVideo()
    } catch (error) {
      console.error('Error pausing:', error)
    }
  }

  const togglePlayPause = async () => {
    if (isPlaying.value) {
      await pause()
    } else {
      await play()
    }
  }

  const setVolume = async (newVolume: number) => {
    volume.value = Math.max(0, Math.min(100, newVolume))

    if (player.value && isPlayerReady.value) {
      try {
        await player.value.setVolume(volume.value)
      } catch (error) {
        console.error('Error setting volume:', error)
      }
    }
  }

  const toggleMute = async () => {
    if (!player.value || !isPlayerReady.value) return

    try {
      if (isMuted.value) {
        await player.value.unMute()
        isMuted.value = false
      } else {
        await player.value.mute()
        isMuted.value = true
      }
    } catch (error) {
      console.error('Error toggling mute:', error)
    }
  }

  const seekTo = async (time: number) => {
    if (!player.value || !isPlayerReady.value) return

    try {
      await player.value.seekTo(time, true)
      currentTime.value = time
    } catch (error) {
      console.error('Error seeking:', error)
    }
  }

  const updateDuration = async () => {
    if (!player.value || !isPlayerReady.value) return

    try {
      duration.value = await player.value.getDuration()
    } catch {
      // Handle error silently
    }
  }

  const addToPlaylist = (track: Track) => {
    playlist.value.push(track)
  }

  const removeFromPlaylist = (index: number) => {
    playlist.value.splice(index, 1)
    if (currentIndex.value === index) {
      currentIndex.value = -1
      currentTrack.value = null
      playNext()
    } else if (currentIndex.value > index) {
      currentIndex.value--
      playNext()
    }
  }

  const playTrackAtIndex = (index: number) => {
    if (index >= 0 && index < playlist.value.length) {
      currentIndex.value = index
      loadTrack(playlist.value[index])
    }
  }

  const playNext = () => {
    if (canGoNext.value) {
      playTrackAtIndex(currentIndex.value + 1)
    }
  }

  const playPrevious = () => {
    if (canGoPrevious.value) {
      playTrackAtIndex(currentIndex.value - 1)
    }
  }

  const clearPlaylist = () => {
    playlist.value = []
    currentIndex.value = -1
    currentTrack.value = null
    pause()
  }

  const loadPlaylistFromYouTube = async () => {
    const playListUrl = getXenobladePlaylistUrl()
    const playlistId = playListUrl ? extractYouTubePlaylistId(playListUrl) : ''
    if (!playlistId) {
      console.error('Invalid YouTube playlist URL')
      throw new Error('Invalid YouTube playlist URL')
    }

    const apiKey = getYouTubeApiKey()
    if (!apiKey) {
      throw new Error('YouTube API key is not configured')
    }

    try {
      isLoading.value = true
      const playlistItems = await fetchPlaylistVideos(playlistId, apiKey)

      // Convert YouTube playlist items to our Track format
      const tracks: Track[] = playlistItems.map((item: YouTubePlaylistItem) => ({
        id: item.videoId,
        videoId: item.videoId,
        title: item.title,
        artist: item.channelTitle,
      }))

      // Replace current playlist
      playlist.value = tracks
      currentIndex.value = -1

      // Optionally load the first track
      if (tracks.length > 0) {
        // playTrackAtIndex(0)
      }

      return tracks
    } catch (error) {
      console.error('Error loading YouTube playlist:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const addPlaylistFromYouTube = async (playlistUrl: string, apiKey: string) => {
    const playlistId = extractYouTubePlaylistId(playlistUrl)
    if (!playlistId) {
      throw new Error('Invalid YouTube playlist URL')
    }

    try {
      isLoading.value = true
      const playlistItems = await fetchPlaylistVideos(playlistId, apiKey)

      // Convert YouTube playlist items to our Track format
      const tracks: Track[] = playlistItems.map((item: YouTubePlaylistItem) => ({
        id: item.videoId,
        videoId: item.videoId,
        title: item.title,
        artist: item.channelTitle,
      }))

      // Add to existing playlist
      playlist.value.push(...tracks)

      return tracks
    } catch (error) {
      console.error('Error adding YouTube playlist:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const setHeardleMode = (enabled: boolean) => {
    heardleMode.value = enabled
  }

  // Method to prime the player for autoplay by triggering user interaction
  const primePlayerForAutoplay = async () => {
    if (!player.value || !isPlayerReady.value) {
      return false
    }

    try {
      // Try a very brief play/pause to establish user interaction
      await player.value.playVideo()
      await new Promise((resolve) => setTimeout(resolve, 100))
      await player.value.pauseVideo()
      userInteracted.value = true
      return true
    } catch (error) {
      console.error('Error priming player:', error)
      return false
    }
  }

  return {
    // State
    player,
    currentTrack,
    isPlaying,
    isLoading,
    isPlayerReady,
    userInteracted,
    volume,
    currentTime,
    duration,
    playlist,
    currentIndex,
    isMuted,
    heardleMode,

    // Getters
    hasTrack,
    hasPlaylist,
    canGoNext,
    canGoPrevious,
    progress,

    // Actions
    initializePlayer,
    loadTrack,
    play,
    pause,
    togglePlayPause,
    setVolume,
    toggleMute,
    seekTo,
    addToPlaylist,
    removeFromPlaylist,
    playTrackAtIndex,
    playNext,
    playPrevious,
    clearPlaylist,
    loadPlaylistFromYouTube,
    addPlaylistFromYouTube,
    setHeardleMode,
    primePlayerForAutoplay,
  }
})
