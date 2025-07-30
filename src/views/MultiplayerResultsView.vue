<template>
    <div class="multiplayer-results-view">
        <div class="results-container">
            <div class="results-header">
                <h1>🏆 Tournament Complete!</h1>
                <h2>{{ gameSettings?.tournamentName || 'Multiplayer Tournament' }}</h2>
                <p class="tournament-summary">{{ gameSettings?.totalRounds || 5 }} rounds completed</p>
            </div>

            <div class="final-standings">
                <h3>🥇 Final Standings</h3>
                <div class="standings-list">
                    <div v-for="(player, index) in sortedPlayers" :key="player.id" class="standing-item" :class="{
                        'first-place': index === 0,
                        'second-place': index === 1,
                        'third-place': index === 2
                    }">
                        <div class="position">
                            <span class="rank">{{ index + 1 }}</span>
                            <span class="medal">{{ getMedal(index) }}</span>
                        </div>
                        <div class="player-details">
                            <span class="player-name">{{ player.name }}</span>
                            <span v-if="player.isHost" class="host-badge">Host</span>
                        </div>
                        <div class="player-stats">
                            <div class="stat">
                                <span class="stat-label">Total Score:</span>
                                <span class="stat-value">{{ getPlayerTotalScore(player.id) }}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Rounds Won:</span>
                                <span class="stat-value">{{ getPlayerWins(player.id) }}/{{ gameSettings?.totalRounds ||
                                    5 }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button @click="backToLobby" class="action-btn secondary">
                    ← Back to Lobby
                </button>
                <button @click="backToMenu" class="action-btn primary">
                    🏠 Main Menu
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { firebaseLobbyService, type LobbyData } from '@/services/firebaseLobbyService'

const router = useRouter()
const route = useRoute()

// Reactive state
const lobbyData = ref<LobbyData | null>(null)

// Computed properties
const lobbyCode = computed(() => route.params.lobbyCode as string)
const gameState = computed(() => lobbyData.value?.gameState)
const gameSettings = computed(() => lobbyData.value?.gameSettings)
const players = computed(() => lobbyData.value ? Object.values(lobbyData.value.players) : [])

const sortedPlayers = computed(() => {
    return [...players.value].sort((a, b) => {
        const scoreA = getPlayerTotalScore(a.id)
        const scoreB = getPlayerTotalScore(b.id)
        return scoreB - scoreA // Descending order (highest score first)
    })
})

// Helper functions
const getPlayerTotalScore = (playerId: string): number => {
    if (!gameState.value) return 0
    return gameState.value.playerGuesses[playerId]?.totalScore || 0
}

const getPlayerWins = (playerId: string): number => {
    if (!gameState.value) return 0
    return gameState.value.playerGuesses[playerId]?.roundsWon || 0
}

const getMedal = (position: number): string => {
    switch (position) {
        case 0: return '🥇'
        case 1: return '🥈'
        case 2: return '🥉'
        default: return ''
    }
}

// Actions
const backToLobby = async () => {
    // If the current user is the host, reset the lobby to allow a new tournament
    const currentPlayerId = firebaseLobbyService.getCurrentPlayerId()
    const isCurrentUserHost = lobbyData.value?.hostId === currentPlayerId

    if (isCurrentUserHost) {
        // Reset the lobby for a new tournament
        const result = await firebaseLobbyService.resetLobby()
        if (!result.success) {
            console.error('Failed to reset lobby:', result.error)
        }
        // Wait a moment to ensure lobby is reset before navigating
        setTimeout(() => {
            router.push(`/lobby/${lobbyCode.value}`)
        }, 300)
    } else {
        // Non-host players just navigate back
        router.push(`/lobby/${lobbyCode.value}`)
    }
}

const backToMenu = () => {
    router.push('/multiplayer')
}

// Lifecycle
// Listen to lobby changes and redirect appropriately
onMounted(() => {
    firebaseLobbyService.listenToLobby(lobbyCode.value, (updatedLobby) => {
        if (updatedLobby) {
            lobbyData.value = updatedLobby
            if (updatedLobby.status === 'waiting') {
                // Lobby has been reset, go to lobby
                router.push(`/lobby/${lobbyCode.value}`)
            } else if (updatedLobby.status === 'playing') {
                // Game is still active, redirect to game view
                router.push(`/lobby/${lobbyCode.value}/game`)
            } else if (updatedLobby.status !== 'finished') {
                // Any other status, go to lobby
                router.push(`/lobby/${lobbyCode.value}`)
            }
        } else {
            // Lobby was deleted or not found
            router.push('/multiplayer')
        }
    })
})
onUnmounted(() => {
    firebaseLobbyService.removeAllListeners && firebaseLobbyService.removeAllListeners()
})
</script>

<style scoped>
.multiplayer-results-view {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.results-container {
    max-width: 800px;
    width: 100%;
}

.results-header {
    text-align: center;
    color: white;
    margin-bottom: 40px;
}

.results-header h1 {
    font-size: 3rem;
    margin: 0 0 15px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.results-header h2 {
    font-size: 2rem;
    margin: 0 0 10px 0;
    opacity: 0.9;
}

.tournament-summary {
    font-size: 1.2rem;
    opacity: 0.8;
    margin: 0;
}

.final-standings {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
}

.final-standings h3 {
    text-align: center;
    color: #2c3e50;
    font-size: 1.8rem;
    margin: 0 0 30px 0;
}

.standings-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.standing-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 20px;
    align-items: center;
    padding: 20px;
    border-radius: 15px;
    background: #f8f9fa;
    border-left: 5px solid #dee2e6;
    transition: all 0.3s ease;
}

.standing-item.first-place {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border-left-color: #ffd700;
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
}

.standing-item.second-place {
    background: linear-gradient(135deg, #e2e3e5 0%, #d1d3d4 100%);
    border-left-color: #c0c0c0;
    box-shadow: 0 5px 15px rgba(192, 192, 192, 0.3);
}

.standing-item.third-place {
    background: linear-gradient(135deg, #f8d7da 0%, #f1b0b7 100%);
    border-left-color: #cd7f32;
    box-shadow: 0 5px 15px rgba(205, 127, 50, 0.3);
}

.position {
    display: flex;
    align-items: center;
    gap: 10px;
}

.rank {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2c3e50;
    min-width: 30px;
    text-align: center;
}

.medal {
    font-size: 1.8rem;
}

.player-details {
    display: flex;
    align-items: center;
    gap: 10px;
}

.player-name {
    font-size: 1.3rem;
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

.player-stats {
    display: flex;
    flex-direction: column;
    gap: 5px;
    text-align: right;
}

.stat {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    min-width: 150px;
}

.stat-label {
    color: #6c757d;
    font-size: 0.9rem;
}

.stat-value {
    color: #007bff;
    font-weight: 600;
    font-size: 0.9rem;
}

.actions {
    display: flex;
    justify-content: center;
    gap: 20px;
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
    min-width: 180px;
}

.action-btn.primary {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
}

.action-btn.secondary {
    background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
    color: white;
}

.action-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
    .results-header h1 {
        font-size: 2.5rem;
    }

    .results-header h2 {
        font-size: 1.5rem;
    }

    .final-standings {
        padding: 20px;
    }

    .standing-item {
        grid-template-columns: auto 1fr;
        gap: 15px;
    }

    .player-stats {
        grid-column: 1 / -1;
        margin-top: 10px;
        text-align: left;
    }

    .stat {
        flex-direction: column;
        gap: 2px;
    }

    .actions {
        flex-direction: column;
        align-items: center;
    }

    .action-btn {
        width: 100%;
        max-width: 300px;
    }
}
</style>
