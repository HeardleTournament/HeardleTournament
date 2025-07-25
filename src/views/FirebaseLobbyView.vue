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
                        <input id="tournamentName" type="text" v-model="editableSettings.tournamentName"
                            @blur="updateSettings" placeholder="Name your tournament" class="form-input"
                            maxlength="50" />
                    </div>

                    <!-- YouTube Playlist -->
                    <div class="form-group">
                        <label for="playlistUrl">YouTube Playlist URL</label>
                        <input type="url" id="playlistUrl" v-model="editableSettings.playlistUrl" @blur="updateSettings"
                            placeholder="https://www.youtube.com/playlist?list=..." class="form-input" />
                        <p class="form-hint">
                            ⚠️ Make sure your playlist is set to <strong>Public</strong> or <strong>Unlisted</strong>
                            (not Private)
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
                                    <button type="button" class="predefined-btn"
                                        @click="selectPredefinedPlaylist(playlist.url)"
                                        :class="{ 'selected': editableSettings.playlistUrl === playlist.url }">
                                        <div class="playlist-info">
                                            <h4>{{ playlist.name }}</h4>
                                            <p>{{ playlist.description }}</p>
                                            <span class="playlist-meta">{{ playlist.songCount }} songs • {{ playlist.genre
                                                }}</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Number of Songs -->
                    <div class="form-group">
                        <label for="songCount">Number of Songs</label>
                        <input type="number" id="songCount" v-model.number="editableSettings.totalRounds"
                            @blur="updateSettings" :min="1" :max="50" placeholder="Enter number of songs"
                            class="form-input" />
                        <p class="form-hint">
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
                <button v-else class="action-btn secondary" @click="toggleReady"
                    :class="{ 'ready': isCurrentPlayerReady }">
                    {{ isCurrentPlayerReady ? '✅ Ready' : '⏳ Ready Up' }}
                </button>
            </div>
        </div>

        <!-- Connection Status -->
        <div v-if="connectionError" class="connection-error">
            <p>⚠️ Connection Error: {{ connectionError }}</p>
            <button @click="reconnect" class="reconnect-btn">Reconnect</button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { firebaseLobbyService, type LobbyData } from '@/services/firebaseLobbyService'
import { getXenobladePlaylistUrl } from '@/utils/env'
import { DEFAULT_PLAYLISTS, type PlaylistConfig, getPlaylistLabel as getPlaylistLabelFromConfig } from '@/config/playlists'

// Interface for predefined playlists (using the same interface as the config)
type PredefinedPlaylist = PlaylistConfig

const router = useRouter()
const route = useRoute()
const lobbyData = ref<LobbyData | null>(null)
const connectionError = ref<string>('')
const settingsJustUpdated = ref(false)

// Settings form data
const editableSettings = ref({
    tournamentName: '',
    totalRounds: 5,
    playlistUrl: ''
})
const settingsUpdateMessage = ref('')
const settingsUpdateType = ref<'success' | 'error'>('success')

// Predefined playlists state - now using the centralized configuration
const showPredefined = ref(false)
const predefinedPlaylists = ref<PredefinedPlaylist[]>(DEFAULT_PLAYLISTS)

// Computed properties
const lobbyCode = computed(() => route.params.lobbyCode as string)
const players = computed(() => lobbyData.value ? Object.values(lobbyData.value.players) : [])
const playerCount = computed(() => players.value.length)
const maxPlayers = computed(() => lobbyData.value?.maxPlayers || 8)
const gameSettings = computed(() => lobbyData.value?.gameSettings)

const isHost = computed(() => {
    const currentPlayerId = firebaseLobbyService.getCurrentPlayerId()
    return lobbyData.value?.hostId === currentPlayerId
})

const isCurrentPlayerReady = computed(() => {
    const currentPlayerId = firebaseLobbyService.getCurrentPlayerId()
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

// Watch for settings changes from Firebase
watch(gameSettings, (newSettings) => {
    if (newSettings && isHost.value) {
        editableSettings.value = {
            tournamentName: newSettings.tournamentName || '',
            totalRounds: newSettings.totalRounds || 5,
            playlistUrl: newSettings.playlistUrl || ''
        }
    } else if (newSettings && !isHost.value) {
        // Show visual feedback when settings are updated by host
        settingsJustUpdated.value = true
        setTimeout(() => {
            settingsJustUpdated.value = false
        }, 2000)
    }
}, { immediate: true, deep: true })

// Methods
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
        const success = await firebaseLobbyService.updateLobbySettings({
            tournamentName: editableSettings.value.tournamentName,
            totalRounds: Number(editableSettings.value.totalRounds),
            playlistUrl: editableSettings.value.playlistUrl
        })

        if (success) {
            showSettingsMessage('Settings updated successfully!', 'success')
        } else {
            showSettingsMessage('Failed to update settings', 'error')
        }
    } catch (error) {
        showSettingsMessage('Error updating settings', 'error')
        console.error('Settings update error:', error)
    }
}

const toggleReady = async () => {
    const newReadyStatus = !isCurrentPlayerReady.value
    const success = await firebaseLobbyService.setPlayerReady(newReadyStatus)

    if (!success) {
        console.error('Failed to update ready status')
    }
}

const startGame = async () => {
    if (!isHost.value || !canStartGame.value) return

    try {
        const success = await firebaseLobbyService.startGame()

        if (success) {
            // Navigate to multiplayer game view
            router.push(`/lobby/${lobbyCode.value}/game`)
        } else {
            showSettingsMessage('Failed to start game', 'error')
        }
    } catch (error) {
        showSettingsMessage('Error starting game', 'error')
        console.error('Start game error:', error)
    }
}

const leaveLobby = async () => {
    try {
        await firebaseLobbyService.leaveLobby()
        router.push('/multiplayer')
    } catch (error) {
        console.error('Error leaving lobby:', error)
        router.push('/multiplayer') // Navigate anyway
    }
}

// Use the centralized playlist label function
const getPlaylistLabel = getPlaylistLabelFromConfig

const reconnect = () => {
    connectionError.value = ''
    // Re-setup the listener
    setupLobbyListener()
}

// Predefined playlist selection
const selectPredefinedPlaylist = (playlistUrl: string) => {
    editableSettings.value.playlistUrl = playlistUrl
    showPredefined.value = false
}

const setupLobbyListener = () => {
    firebaseLobbyService.listenToLobby(lobbyCode.value, (updatedLobby) => {
        if (updatedLobby) {
            lobbyData.value = updatedLobby
            connectionError.value = ''

            // Check if game started
            if (updatedLobby.status === 'playing') {
                router.push(`/lobby/${lobbyCode.value}/game`)
            } else if (updatedLobby.status === 'finished') {
                router.push(`/lobby/${lobbyCode.value}/results`)
            }
        } else {
            // Lobby was deleted or connection lost
            connectionError.value = 'Lobby was closed or connection lost'
        }
    })
}

onMounted(async () => {
    // Get current lobby data
    const currentLobby = firebaseLobbyService.getCurrentLobby()

    if (currentLobby && currentLobby.id === lobbyCode.value) {
        lobbyData.value = currentLobby
        setupLobbyListener()
    } else {
        // Try to rejoin the lobby if we have a player ID
        const currentPlayerId = firebaseLobbyService.getCurrentPlayerId()
        if (currentPlayerId) {
            // This would typically happen if user refreshed the page
            // We can't automatically rejoin without player name, so redirect to multiplayer menu
            router.push('/multiplayer')
        } else {
            router.push('/multiplayer')
        }
    }
})

onUnmounted(() => {
    firebaseLobbyService.removeAllListeners()
})

onBeforeRouteLeave(() => {
    firebaseLobbyService.removeAllListeners()
})
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
    margin-bottom: 30px;
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
    transition: background 0.3s ease;
}

.back-button:hover {
    background: rgba(255, 255, 255, 0.3);
}

.lobby-content {
    max-width: 1000px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
}

.players-section,
.lobby-info {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 25px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.players-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.player-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 8px;
}

.player-name {
    font-weight: 600;
    color: #2d3748;
}

.host-badge {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.ready-status {
    font-size: 0.9rem;
    color: #e53e3e;
    font-weight: 500;
}

.ready-status.ready {
    color: #38a169;
}

.settings-info {
    background: #f7fafc;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.3s ease;
}

.settings-info.settings-updated {
    background: #e6fffa;
    border: 2px solid #38b2ac;
    transform: scale(1.02);
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #2d3748;
}

.form-input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
}

.form-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
    margin-top: 8px;
    font-size: 0.875rem;
    color: #718096;
}

.settings-message {
    padding: 12px;
    border-radius: 8px;
    margin-top: 15px;
    font-weight: 500;
}

.settings-message.success {
    background: #c6f6d5;
    color: #22543d;
    border: 1px solid #9ae6b4;
}

.settings-message.error {
    background: #fed7d7;
    color: #742a2a;
    border: 1px solid #fc8181;
}

.lobby-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: center;
    margin-top: 20px;
}

.action-btn {
    padding: 15px 30px;
    border: none;
    border-radius: 25px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 200px;
}

.action-btn.primary {
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    color: white;
}

.action-btn.primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(72, 187, 120, 0.3);
}

.action-btn.primary:disabled {
    background: #a0aec0;
    cursor: not-allowed;
}

.action-btn.secondary {
    background: #e2e8f0;
    color: #2d3748;
}

.action-btn.secondary:hover {
    background: #cbd5e0;
}

.action-btn.secondary.ready {
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    color: white;
}

.connection-error {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #fed7d7;
    color: #742a2a;
    padding: 15px 20px;
    border-radius: 8px;
    border: 1px solid #fc8181;
    display: flex;
    align-items: center;
    gap: 15px;
}

.reconnect-btn {
    background: #e53e3e;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
}

.reconnect-btn:hover {
    background: #c53030;
}

/* Predefined Playlist Styles - Matching ConfigView */
.predefined-playlists {
    margin-top: 1rem;
}

.predefined-toggle {
    background: none;
    border: none;
    color: #667eea;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 8px 0;
    transition: color 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.predefined-toggle:hover {
    color: #5a6fd8;
}

.predefined-menu {
    margin-top: 1rem;
    border: 2px solid #e0e6ed;
    border-radius: 10px;
    background: #f8f9fa;
    max-height: 300px;
    overflow-y: auto;
}

.predefined-item {
    border-bottom: 1px solid #e0e6ed;
}

.predefined-item:last-child {
    border-bottom: none;
}

.lobby-view .predefined-btn {
    width: 100%;
    background: none !important;
    border: none !important;
    padding: 1rem !important;
    text-align: left;
    cursor: pointer;
    transition: all 0.3s ease;
    display: block;
    color: inherit !important;
    box-shadow: none !important;
    border-radius: 0 !important;
}

.lobby-view .predefined-btn:hover {
    background: rgba(102, 126, 234, 0.1) !important;
    color: inherit !important;
}

.lobby-view .predefined-btn.selected {
    background: rgba(102, 126, 234, 0.2) !important;
    border-left: 4px solid #667eea !important;
    color: inherit !important;
}

.playlist-info h4 {
    margin: 0 0 0.5rem 0;
    color: #2c3e50;
    font-size: 1rem;
    font-weight: 600;
}

.playlist-info p {
    margin: 0 0 0.5rem 0;
    color: #6c757d;
    font-size: 0.85rem;
    line-height: 1.4;
}

.playlist-meta {
    font-size: 0.75rem;
    color: #adb5bd;
    font-weight: 500;
}

@media (max-width: 768px) {
    .lobby-content {
        grid-template-columns: 1fr;
        gap: 20px;
    }

    .lobby-header h1 {
        font-size: 1.5rem;
        margin: 0 60px;
    }
}
</style>
