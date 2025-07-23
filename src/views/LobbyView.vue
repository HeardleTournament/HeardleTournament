<template>
  <div class="lobby-view">
    <div class="lobby-header">
      <button class="back-button" @click="leaveLobby">
        ← Leave Lobby
      </button>
      <h1>Lobby: {{ lobbyCode }}</h1>
      <p>Waiting for players...</p>
    </div>

    <div class="lobby-content">
      <div class="players-section">
        <h3>Players ({{ playerCount }}/{{ maxPlayers }})</h3>
        <div class="players-list">
          <div v-for="player in players" :key="player.id" class="player-item">
            <span class="player-name">{{ player.name }}</span>
            <span v-if="player.isHost" class="host-badge">Host</span>
            <span class="ready-status" :class="{ ready: player.isReady }">
              {{ player.isReady ? '✅ Ready' : '⏳ Not Ready' }}
            </span>
          </div>
        </div>
      </div>

      <div class="lobby-info">
        <h3>Game Settings</h3>
        <div v-if="!isHost" class="settings-info" :class="{ 'settings-updated': settingsJustUpdated }">
          <div class="settings-header">
            <p><strong>Tournament:</strong> {{ gameSettings?.tournamentName || 'Multiplayer Game' }}</p>
            <p><strong>Rounds:</strong> {{ gameSettings?.totalRounds || 5 }}</p>
            <p><strong>Playlist:</strong> {{ getPlaylistLabel(gameSettings?.playlistUrl || '') }}</p>
            <p><strong>Status:</strong> Waiting for players</p>
          </div>
          <div class="player-notice">
            <small>⚡ Settings update automatically when the host makes changes</small>
          </div>
        </div>
        <div v-else class="settings-form">
          <!-- Tournament Name -->
          <div class="form-group">
            <label for="tournamentName">Tournament Name</label>
            <input id="tournamentName" type="text" v-model="editableSettings.tournamentName" @blur="updateSettings"
              placeholder="Name your tournament" class="form-input" maxlength="50" />
          </div>

          <!-- YouTube Playlist -->
          <div class="form-group">
            <label for="playlistUrl">YouTube Playlist URL</label>
            <input type="url" id="playlistUrl" v-model="editableSettings.playlistUrl" @blur="updateSettings"
              placeholder="https://www.youtube.com/playlist?list=..." class="form-input" />
            <p class="form-hint">
              ⚠️ Make sure your playlist is set to <strong>Public</strong> or <strong>Unlisted</strong> (not Private)
            </p>
          </div>

          <!-- Predefined Playlists -->
          <div class="form-group">
            <div class="predefined-playlists">
              <button type="button" class="predefined-toggle" @click="showPredefined = !showPredefined">
                {{ showPredefined ? '▼' : '▶' }} Or choose from predefined playlists
              </button>

              <div v-if="showPredefined" class="predefined-menu">
                <div class="predefined-item" v-for="playlist in predefinedPlaylists" :key="playlist.id">
                  <button type="button" class="predefined-btn" @click="selectPredefinedPlaylist(playlist.url)"
                    :class="{ 'selected': editableSettings.playlistUrl === playlist.url }">
                    <div class="playlist-info">
                      <h4>{{ playlist.name }}</h4>
                      <p>{{ playlist.description }}</p>
                      <span class="playlist-meta">{{ playlist.songCount }} songs • {{ playlist.genre }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Number of Songs -->
          <div class="form-group">
            <label for="songCount">Number of Songs</label>
            <input type="number" id="songCount" v-model.number="editableSettings.totalRounds" @blur="updateSettings"
              :disabled="!editableSettings.playlistUrl || editableSettings.playlistUrl.trim() === ''" :min="1"
              :max="maxSongs > 0 ? maxSongs : undefined" placeholder="Enter number of songs" class="form-input" :class="{
                'disabled': !editableSettings.playlistUrl || editableSettings.playlistUrl.trim() === '',
                'error': maxSongs > 0 && editableSettings.totalRounds > maxSongs
              }" />
            <p class="form-hint" v-if="!editableSettings.playlistUrl || editableSettings.playlistUrl.trim() === ''">
              Please select a playlist first
            </p>
            <p class="form-hint" v-else-if="isLoadingPlaylist">
              🔄 Loading playlist data...
            </p>
            <p class="form-hint" v-else-if="maxSongs > 0 && editableSettings.totalRounds <= maxSongs">
              Choose between 1 and {{ maxSongs }} songs (playlist contains {{ maxSongs }} songs)
            </p>
            <p class="form-hint error" v-else-if="maxSongs > 0 && editableSettings.totalRounds > maxSongs">
              ⚠️ Cannot exceed {{ maxSongs }} songs (playlist limit)
            </p>
            <p class="form-hint" v-else-if="maxSongs === 0 && editableSettings.playlistUrl">
              ⚠️ Could not load playlist data - please check the URL
            </p>
            <p class="form-hint" v-else>
              How many songs will be played in this tournament
            </p>
          </div>

          <div v-if="settingsUpdateMessage" class="settings-message" :class="settingsUpdateType">
            {{ settingsUpdateMessage }}
          </div>
        </div>
      </div>

      <div class="lobby-actions">
        <button v-if="isHost" class="action-btn primary" @click="startGame" :disabled="!canStartGame">
          🚀 Start Game
        </button>
        <button v-else class="action-btn secondary" @click="toggleReady" :class="{ 'ready': isCurrentPlayerReady }">
          {{ isCurrentPlayerReady ? '✅ Ready' : '⏳ Ready Up' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { firebaseLobbyService, type LobbyData, type PlayerData } from '@/services/firebaseLobbyService'
import { getXenobladePlaylistUrl, getYouTubeApiKey } from '@/utils/env'
import { extractYouTubePlaylistId, fetchPlaylistVideos } from '@/utils/youtube'

// Interface for predefined playlists
interface PredefinedPlaylist {
  id: string
  name: string
  description: string
  url: string
  songCount: string
  genre: string
}

const router = useRouter()
const route = useRoute()
const lobbyData = ref<LobbyData | null>(null)

// Settings form data
const editableSettings = ref({
  tournamentName: '',
  totalRounds: 5,
  playlistUrl: ''
})
const settingsUpdateMessage = ref('')
const settingsUpdateType = ref<'success' | 'error'>('success')

// Predefined playlists state
const showPredefined = ref(false)
const maxSongs = ref<number>(0)
const isLoadingPlaylist = ref(false)

// Settings synchronization state
const lastKnownSettings = ref<string>('')
const settingsJustUpdated = ref(false)

// Polling interval for settings updates (for non-host players)
const settingsPollingInterval = ref<number | null>(null)

// Predefined playlists data
const showPredefinedPlaylists = ref(false)
const predefinedPlaylists = ref<PredefinedPlaylist[]>([
  {
    id: 'xenoblade',
    name: 'Xenoblade Chronicles',
    description: 'Epic orchestral soundtrack from the Xenoblade Chronicles series',
    url: getXenobladePlaylistUrl(),
    songCount: 'Loading...', // Will be updated dynamically
    genre: 'RPG/Orchestral'
  }
])
const lobbyCode = computed(() => route.params.lobbyCode as string)
const players = computed(() => lobbyData.value ? Object.values(lobbyData.value.players) : [])
const playerCount = computed(() => players.value.length)
const maxPlayers = computed(() => lobbyData.value?.maxPlayers || 8)
const gameSettings = computed(() => lobbyData.value?.gameSettings)
const isHost = computed(() => {
  const currentPlayerId = lobbyService.getCurrentPlayerId()
  return lobbyData.value?.hostId === currentPlayerId
})

const isCurrentPlayerReady = computed(() => {
  const currentPlayerId = lobbyService.getCurrentPlayerId()
  if (!currentPlayerId || !lobbyData.value) return false
  return lobbyData.value.players[currentPlayerId]?.isReady || false
})

const canStartGame = computed(() => {
  if (!lobbyData.value || !isHost.value) return false

  // Check if we have a valid playlist
  if (!editableSettings.value.playlistUrl || editableSettings.value.playlistUrl.trim() === '') {
    return false
  }

  // Check if all non-host players are ready
  const nonHostPlayers = Object.values(lobbyData.value.players).filter(p => !p.isHost)
  if (nonHostPlayers.length === 0) return true // Host can start alone for testing

  return nonHostPlayers.every(player => player.isReady)
})

// Watch for host status changes to start/stop polling
watch(isHost, (newIsHost, oldIsHost) => {
  if (newIsHost && !oldIsHost) {
    // Became host - switch to host polling (less frequent, only for player updates)
    if (settingsPollingInterval.value) {
      clearInterval(settingsPollingInterval.value)
    }
    settingsPollingInterval.value = setInterval(() => {
      pollLobbyUpdatesForHost()
    }, 3000) // Slower polling for host
    console.log('Became host - started host polling')
  } else if (!newIsHost && oldIsHost) {
    // No longer host - switch to regular polling
    if (settingsPollingInterval.value) {
      clearInterval(settingsPollingInterval.value)
    }
    settingsPollingInterval.value = setInterval(() => {
      pollLobbyUpdates()
    }, 2000)
    console.log('No longer host - started regular polling')
  }
})

// Watch for game settings changes (for non-host players to see updates)
watch(gameSettings, (newSettings) => {
  if (newSettings) {
    const settingsJson = JSON.stringify(newSettings)
    if (settingsJson !== lastKnownSettings.value) {
      lastKnownSettings.value = settingsJson

      // If we're not the host, update our display
      if (!isHost.value) {
        console.log('Settings updated by host:', newSettings)

        // Trigger visual feedback for settings update
        settingsJustUpdated.value = true
        setTimeout(() => {
          settingsJustUpdated.value = false
        }, 2000)
      }
    }
  }
}, { deep: true, immediate: true })

// Initialize editable settings when lobby data changes
watch(gameSettings, (newSettings) => {
  if (newSettings && isHost.value) {
    editableSettings.value = {
      tournamentName: newSettings.tournamentName || '',
      totalRounds: newSettings.totalRounds || 5,
      playlistUrl: newSettings.playlistUrl || ''
    }
    // Set max songs estimate based on playlist
    updateMaxSongs(newSettings.playlistUrl || '')
  }
}, { immediate: true })

// Watch for playlist URL changes to update max songs
watch(() => editableSettings.value.playlistUrl, (newUrl) => {
  updateMaxSongs(newUrl)
})

// Watch for totalRounds changes to validate against maxSongs
watch(() => editableSettings.value.totalRounds, (newValue) => {
  if (maxSongs.value > 0 && newValue > maxSongs.value) {
    editableSettings.value.totalRounds = maxSongs.value
    showSettingsMessage(`Number of songs cannot exceed ${maxSongs.value} (playlist size)`, 'error')
  }
})

// Playlist management methods
const selectPredefinedPlaylist = (url: string) => {
  editableSettings.value.playlistUrl = url
  showPredefinedPlaylists.value = false

  // Update max songs immediately when playlist is selected
  updateMaxSongs(url)
}

const updateMaxSongs = async (url: string) => {
  if (!url || url === 'custom' || url.trim() === '') {
    maxSongs.value = 0
    isLoadingPlaylist.value = false
    return
  }

  try {
    isLoadingPlaylist.value = true

    // Extract playlist ID from the URL
    const playlistId = extractYouTubePlaylistId(url)
    if (!playlistId) {
      // If it's not a valid YouTube playlist URL, set default
      maxSongs.value = 0
      isLoadingPlaylist.value = false
      return
    }

    // Get YouTube API key
    const apiKey = getYouTubeApiKey()
    if (!apiKey) {
      console.warn('YouTube API key not configured, using fallback estimates')
      // For predefined playlists, use known estimates as fallback
      const xenobladeUrl = getXenobladePlaylistUrl()
      if (url === xenobladeUrl) {
        maxSongs.value = 99 // Known estimate for Xenoblade playlist
      } else {
        maxSongs.value = 25 // Conservative estimate for unknown playlists
      }
      isLoadingPlaylist.value = false
      return
    }

    // Fetch actual playlist data from YouTube API
    const playlistItems = await fetchPlaylistVideos(playlistId, apiKey)
    maxSongs.value = playlistItems.length

    // Update predefined playlist display if this is a predefined playlist
    const xenobladeUrl = getXenobladePlaylistUrl()
    if (url === xenobladeUrl) {
      const xenobladePlaylist = predefinedPlaylists.value.find(p => p.id === 'xenoblade')
      if (xenobladePlaylist) {
        xenobladePlaylist.songCount = `${playlistItems.length} songs`
      }
    }

    console.log(`Playlist "${url}" contains ${playlistItems.length} songs`)

  } catch (error) {
    console.warn('Error fetching playlist data:', error)

    // Fallback to estimates if API fails
    const xenobladeUrl = getXenobladePlaylistUrl()
    if (url === xenobladeUrl) {
      maxSongs.value = 99 // Known estimate for Xenoblade playlist
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      maxSongs.value = 25 // Conservative estimate for unknown YouTube playlists
    } else {
      maxSongs.value = 0
    }
  } finally {
    isLoadingPlaylist.value = false
  }

  // Ensure totalRounds doesn't exceed maxSongs
  if (maxSongs.value > 0 && editableSettings.value.totalRounds > maxSongs.value) {
    editableSettings.value.totalRounds = maxSongs.value
  }
}

onMounted(async () => {
  // Add a small delay to ensure localStorage operations are complete
  await new Promise(resolve => setTimeout(resolve, 50))

  // Get fresh lobby data from storage
  const currentLobby = lobbyService.getLobby(lobbyCode.value)
  if (currentLobby) {
    lobbyData.value = currentLobby

    // Set up polling for lobby updates - both host and players need polling
    // Use nextTick to ensure computed properties are updated
    nextTick(() => {
      if (isHost.value) {
        // Do an immediate poll for the host to catch any players that might have joined
        pollLobbyUpdatesForHost()

        // Host polls more frequently initially, then reduces frequency
        settingsPollingInterval.value = setInterval(() => {
          pollLobbyUpdatesForHost()
        }, 1000) // Start with faster polling
        console.log('Started host polling for player updates')
      } else {
        // Do an immediate poll for non-host players
        pollLobbyUpdates()

        // Non-host players poll more frequently for settings and player updates
        settingsPollingInterval.value = setInterval(() => {
          pollLobbyUpdates()
        }, 1000) // Start with faster polling
        console.log('Started polling for non-host player')
      }
    })
  } else {
    // Redirect if no valid lobby data
    router.push('/multiplayer')
  }

  // Load predefined playlist data to get accurate song counts
  const xenobladeUrl = getXenobladePlaylistUrl()
  if (xenobladeUrl) {
    updateMaxSongs(xenobladeUrl)
  }
})

onUnmounted(() => {
  // Clean up polling interval
  if (settingsPollingInterval.value) {
    clearInterval(settingsPollingInterval.value)
    settingsPollingInterval.value = null
  }
})

// Also clean up when leaving route (ensures cleanup even if component doesn't unmount properly)
onBeforeRouteLeave(() => {
  if (settingsPollingInterval.value) {
    clearInterval(settingsPollingInterval.value)
    settingsPollingInterval.value = null
    console.log('Cleaned up polling interval on route leave')
  }
})

const leaveLobby = async () => {
  // Clean up polling before leaving
  if (settingsPollingInterval.value) {
    clearInterval(settingsPollingInterval.value)
    settingsPollingInterval.value = null
  }
  await lobbyService.leaveLobby()
  router.push('/multiplayer')
}

const getPlaylistLabel = (playlistUrl: string): string => {
  const options = lobbyService.getPlaylistOptions()
  const option = options.find(opt => opt.value === playlistUrl)
  if (option) {
    return option.label
  }
  if (playlistUrl && playlistUrl.startsWith('http')) {
    return 'Custom Playlist'
  }
  return 'Default Playlist'
}

const showSettingsMessage = (message: string, type: 'success' | 'error' = 'success') => {
  settingsUpdateMessage.value = message
  settingsUpdateType.value = type
  setTimeout(() => {
    settingsUpdateMessage.value = ''
  }, 3000)
}

const updateSettings = async () => {
  if (!isHost.value) return

  try {
    const playlistUrl = editableSettings.value.playlistUrl

    // If it's one of our predefined playlists, use it directly
    if (playlistUrl && playlistUrl !== 'custom') {
      // Update game settings in the lobby
      const result = await lobbyService.updateGameSettings({
        tournamentName: editableSettings.value.tournamentName,
        totalRounds: Number(editableSettings.value.totalRounds),
        playlistUrl: playlistUrl
      })

      if (result.success) {
        // Update local lobby data selectively to preserve player list
        const freshLobbyData = lobbyService.refreshCurrentLobby()

        if (freshLobbyData && lobbyData.value) {
          // Only update the game settings, preserve players and other data
          lobbyData.value = {
            ...lobbyData.value,
            gameSettings: freshLobbyData.gameSettings
          }
        } else if (freshLobbyData) {
          // Fallback: if no current lobby data, use fresh data
          lobbyData.value = freshLobbyData
        }

        showSettingsMessage('Settings updated successfully!', 'success')

        // Trigger a manual refresh for all players by updating localStorage timestamp
        localStorage.setItem('lobby-settings-updated', Date.now().toString())

        console.log('Host updated settings - fresh lobby data:', lobbyData.value?.gameSettings)
      } else {
        showSettingsMessage(result.error || 'Failed to update settings', 'error')
      }
    }
  } catch {
    showSettingsMessage('Error updating settings', 'error')
  }
}

const toggleReady = async () => {
  const newReadyStatus = !isCurrentPlayerReady.value
  const result = await lobbyService.updatePlayerReady(newReadyStatus)

  if (result.success) {
    // Refresh lobby data to show updated ready status, but preserve other data
    const freshLobby = lobbyService.getLobby(lobbyCode.value)
    if (freshLobby && lobbyData.value) {
      // Only update the players data to preserve settings and other data
      lobbyData.value = {
        ...lobbyData.value,
        players: freshLobby.players
      }
    } else if (freshLobby) {
      // Fallback: if no current lobby data, use fresh data
      lobbyData.value = freshLobby
    }
  } else {
    console.error('Failed to update ready status:', result.error)
  }
}

const startGame = async () => {
  if (!isHost.value || !canStartGame.value) return

  try {
    const result = await lobbyService.startGame()

    if (result.success) {
      // Navigate to multiplayer game view
      router.push(`/lobby/${lobbyCode.value}/game`)
    } else {
      showSettingsMessage(result.error || 'Failed to start game', 'error')
    }
  } catch {
    showSettingsMessage('Error starting game', 'error')
  }
}

// Poll for lobby updates (for non-host players only)
const pollLobbyUpdates = () => {
  // Only poll if we're not the host and still in a multiplayer route
  if (isHost.value || !router.currentRoute.value.path.includes('/lobby/')) {
    return
  }

  // Use getLobby to get fresh data from localStorage instead of cached data
  const freshLobbyData = lobbyService.getLobby(lobbyCode.value)
  if (freshLobbyData) {
    const previousLobbyData = lobbyData.value

    // Check if the game has started (status changed to 'playing')
    if (freshLobbyData.status === 'playing' && (!previousLobbyData || previousLobbyData.status !== 'playing')) {
      console.log('Game started by host - navigating to game view')
      router.push(`/lobby/${lobbyCode.value}/game`)
      return
    }

    // Check if the tournament has finished (status changed to 'finished')
    // Only redirect if this is a real-time status change, not when manually navigating back to lobby
    if (freshLobbyData.status === 'finished' && previousLobbyData && previousLobbyData.status !== 'finished') {
      console.log('Tournament finished - navigating to results view')
      router.push(`/lobby/${lobbyCode.value}/results`)
      return
    }

    // Update lobby data selectively to avoid resetting player list
    if (lobbyData.value) {
      // Only update if there are actual changes to avoid unnecessary re-renders
      const prevSettingsJson = JSON.stringify(previousLobbyData?.gameSettings || {})
      const newSettingsJson = JSON.stringify(freshLobbyData.gameSettings || {})
      const prevPlayersJson = JSON.stringify(previousLobbyData?.players || {})
      const newPlayersJson = JSON.stringify(freshLobbyData.players || {})

      // Check if settings have changed
      if (prevSettingsJson !== newSettingsJson) {
        console.log('Host updated game settings:', freshLobbyData.gameSettings)

        // Update only the game settings to preserve other data
        lobbyData.value = {
          ...lobbyData.value,
          gameSettings: freshLobbyData.gameSettings
        }

        // Trigger visual feedback for settings update
        settingsJustUpdated.value = true
        setTimeout(() => {
          settingsJustUpdated.value = false
        }, 2000)
      }

      // Check if players have changed
      if (prevPlayersJson !== newPlayersJson) {
        console.log('Player list updated')

        // Update only the players data
        lobbyData.value = {
          ...lobbyData.value,
          players: freshLobbyData.players
        }
      }
    } else {
      // First time - update everything
      lobbyData.value = freshLobbyData
    }
  } else {
    // Lobby no longer exists - redirect to multiplayer menu
    console.log('Lobby no longer exists, redirecting...')
    router.push('/multiplayer')
  }
}

// Poll for lobby updates (for host - only player changes, not settings)
const pollLobbyUpdatesForHost = () => {
  // Only poll if we are the host and still in a multiplayer route
  if (!isHost.value || !router.currentRoute.value.path.includes('/lobby/')) {
    return
  }

  // Use getLobby to get fresh data from localStorage instead of cached data
  const freshLobbyData = lobbyService.getLobby(lobbyCode.value)
  if (freshLobbyData) {
    const previousLobbyData = lobbyData.value

    // Check if the game has started (status changed to 'playing') - this could happen if another host instance started the game
    if (freshLobbyData.status === 'playing' && (!previousLobbyData || previousLobbyData.status !== 'playing')) {
      console.log('Game started - navigating to game view')
      router.push(`/lobby/${lobbyCode.value}/game`)
      return
    }

    // Check if the tournament has finished (status changed to 'finished')
    // Only redirect if this is a real-time status change, not when manually navigating back to lobby
    if (freshLobbyData.status === 'finished' && previousLobbyData && previousLobbyData.status !== 'finished') {
      console.log('Tournament finished - navigating to results view')
      router.push(`/lobby/${lobbyCode.value}/results`)
      return
    }

    // Always update the players data for the host to ensure they see new players immediately
    // This handles the case where players join while the host is already in the lobby
    if (lobbyData.value) {
      lobbyData.value = {
        ...lobbyData.value,
        players: freshLobbyData.players
      }
    } else {
      lobbyData.value = freshLobbyData
    }

    // Log when player states change for debugging
    if (previousLobbyData) {
      const prevPlayers = Object.keys(previousLobbyData.players).length
      const newPlayers = Object.keys(freshLobbyData.players).length

      const prevPlayerStates = JSON.stringify(previousLobbyData.players)
      const newPlayerStates = JSON.stringify(freshLobbyData.players)

      if (prevPlayerStates !== newPlayerStates) {
        console.log('Player states updated (ready status or new players)')

        if (prevPlayers !== newPlayers) {
          console.log(`Player count changed: ${prevPlayers} -> ${newPlayers}`)
        }
      }
    }
  } else {
    // Lobby no longer exists - redirect to multiplayer menu
    console.log('Lobby no longer exists, redirecting...')
    router.push('/multiplayer')
  }
}
</script>

<style scoped>
.lobby-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.lobby-header {
  text-align: center;
  color: white;
  margin-bottom: 40px;
  position: relative;
}

.back-button {
  position: absolute;
  left: 0;
  top: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-5px);
}

.lobby-header h1 {
  font-size: 2.5rem;
  margin: 0 0 10px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.lobby-header p {
  font-size: 1.2rem;
  opacity: 0.9;
  margin: 0;
}

.lobby-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.players-section,
.lobby-info {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.players-section h3,
.lobby-info h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 4px solid #007bff;
}

.player-name {
  flex: 1;
  font-weight: 600;
  color: #2c3e50;
}

.host-badge {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #2c3e50;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 600;
}

.ready-status {
  font-weight: 500;
  color: #6c757d;
}

.ready-status.ready {
  color: #28a745;
}

.settings-info p {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.settings-header {
  margin-bottom: 15px;
}

.player-notice {
  background: rgba(0, 123, 255, 0.1);
  border: 1px solid rgba(0, 123, 255, 0.3);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.player-notice small {
  color: #007bff;
  font-weight: 500;
}

.settings-updated {
  animation: settingsHighlight 2s ease-in-out;
}

@keyframes settingsHighlight {
  0% {
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  }

  25% {
    background: rgba(0, 123, 255, 0.1);
    box-shadow: 0 15px 35px rgba(0, 123, 255, 0.2);
    transform: scale(1.02);
  }

  75% {
    background: rgba(0, 123, 255, 0.05);
    box-shadow: 0 15px 35px rgba(0, 123, 255, 0.1);
    transform: scale(1.01);
  }

  100% {
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
    transform: scale(1);
  }
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9rem;
}

.form-input {
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-input.error {
  border-color: #dc3545;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

.form-input.disabled {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.form-hint {
  font-size: 0.8rem;
  color: #6c757d;
  margin: 0;
}

.form-hint.error {
  color: #dc3545;
  font-weight: 500;
}

.settings-input {
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.settings-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.settings-select {
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.settings-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.settings-select:hover {
  border-color: #ced4da;
}

.settings-message {
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  margin-top: 10px;
}

.settings-message.success {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.3);
}

.settings-message.error {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.lobby-actions {
  text-align: center;
}

.action-btn {
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.action-btn.primary {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.action-btn.secondary {
  background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);
  color: white;
}

.action-btn.secondary.ready {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.action-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .lobby-view {
    padding: 10px;
  }

  .lobby-header h1 {
    font-size: 2rem;
  }

  .back-button {
    position: static;
    margin-bottom: 20px;
    width: fit-content;
  }

  .players-section,
  .lobby-info {
    padding: 20px;
  }

  .player-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .form-group {
    gap: 6px;
  }

  .settings-input,
  .settings-select {
    padding: 10px;
    font-size: 0.9rem;
  }
}
</style>
