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
                <div class="settings-info">
                    <p><strong>Tournament:</strong> {{ gameSettings?.tournamentName || 'Multiplayer Game' }}</p>
                    <p><strong>Rounds:</strong> {{ gameSettings?.totalRounds || 5 }}</p>
                    <p><strong>Status:</strong> Waiting for players</p>
                </div>
            </div>

            <div class="lobby-actions">
                <button v-if="isHost" class="action-btn primary" disabled>
                    🚀 Start Game (Coming Soon)
                </button>
                <button v-else class="action-btn secondary" disabled>
                    ✅ Ready Up (Coming Soon)
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { lobbyService, type LobbyData, type PlayerData } from '@/services/lobbyService'

const router = useRouter()
const route = useRoute()
const lobbyData = ref<LobbyData | null>(null)

const lobbyCode = computed(() => route.params.lobbyCode as string)
const players = computed(() => lobbyData.value ? Object.values(lobbyData.value.players) : [])
const playerCount = computed(() => players.value.length)
const maxPlayers = computed(() => lobbyData.value?.maxPlayers || 8)
const gameSettings = computed(() => lobbyData.value?.gameSettings)
const isHost = computed(() => {
    const currentPlayerId = lobbyService.getCurrentPlayerId()
    return lobbyData.value?.hostId === currentPlayerId
})

onMounted(() => {
    // Get current lobby data
    const currentLobby = lobbyService.getCurrentLobby()
    if (currentLobby && currentLobby.id === lobbyCode.value) {
        lobbyData.value = currentLobby
    } else {
        // Redirect if no valid lobby data
        router.push('/multiplayer')
    }
})

onUnmounted(() => {
    // Clean up any listeners when leaving
})

const leaveLobby = async () => {
    await lobbyService.leaveLobby()
    router.push('/multiplayer')
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
}
</style>
