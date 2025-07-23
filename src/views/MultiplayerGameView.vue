<template>
    <div class="multiplayer-game-view">
        <div v-if="!gameState" class="loading-screen">
            <div class="loading-content">
                <h2>Loading Game...</h2>
                <p>Initializing multiplayer session...</p>
            </div>
        </div>

        <div v-else class="game-container">
            <!-- Game Header -->
            <div class="game-header">
                <h1>🏆 {{ gameSettings?.tournamentName || 'Multiplayer Tournament' }}</h1>
                <div class="round-info">
                    <span class="round-counter">Round {{ gameState.currentRound }} of {{ gameSettings?.totalRounds || 5
                    }}</span>
                    <span class="lobby-code">Lobby: {{ lobbyCode }}</span>
                </div>
            </div>

            <!-- Players Status -->
            <div class="players-status">
                <h3>Players Status</h3>
                <div class="players-grid">
                    <div v-for="player in players" :key="player.id" class="player-status">
                        <div class="player-info">
                            <span class="player-name">{{ player.name }}</span>
                            <span v-if="player.isHost" class="host-badge">Host</span>
                        </div>
                        <div class="player-progress">
                            <span class="attempts">{{ getPlayerAttempts(player.id) }}/{{ gameState.maxAttempts }}</span>
                            <span class="score">{{ getPlayerScore(player.id) }} pts</span>
                            <span v-if="hasPlayerWon(player.id)" class="won">🎉 Won!</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Game State: Waiting for round to start -->
            <div v-if="!gameState.isRoundActive && !gameState.currentTrack" class="waiting-for-round">
                <div class="waiting-content">
                    <h2>🎵 Get Ready!</h2>
                    <p v-if="isHost">As the host, you'll control when each round starts.</p>
                    <p v-else>Waiting for the host to start the next round...</p>

                    <button v-if="isHost" @click="startRound" class="start-round-btn" :disabled="isStartingRound">
                        {{ isStartingRound ? 'Starting...' : `🚀 Start Round ${gameState.currentRound}` }}
                    </button>
                </div>
            </div>

            <!-- Active Game Round -->
            <div v-else-if="gameState.currentTrack" class="active-round">
                <!-- Track Info (hidden until round ends) -->
                <div v-if="showTrackInfo" class="track-reveal">
                    <h3>🎵 The song was:</h3>
                    <div class="track-info">
                        <h4>{{ gameState.currentTrack.title }}</h4>
                        <p v-if="gameState.currentTrack.artist">by {{ gameState.currentTrack.artist }}</p>
                    </div>
                </div>

                <!-- Clip Controls -->
                <div v-else class="clip-controls">
                    <div class="clip-info">
                        <div class="clip-duration">
                            <span class="duration-label">Current clip:</span>
                            <span class="duration-value">{{ getCurrentPlayerClipDuration() }}s</span>
                        </div>
                        <div class="attempts-display">
                            <div v-for="(duration, index) in gameState.clipDurations" :key="index" class="attempt-dot"
                                :class="{
                                    'completed': index < getCurrentPlayerAttempts(),
                                    'current': index === getCurrentPlayerAttempts() && !hasCurrentPlayerWon(),
                                    'correct': index < getCurrentPlayerAttempts() && isCurrentPlayerAttemptCorrect(index)
                                }">
                                {{ duration }}s
                            </div>
                        </div>
                    </div>

                    <div class="play-controls">
                        <button @click="playClip" :disabled="isPlaying" class="play-btn">
                            {{ isPlaying ? '🔄 Playing...' : `▶️ Play ${getCurrentPlayerClipDuration()}s` }}
                        </button>
                        <button v-if="isPlaying" @click="stopClip" class="stop-btn">
                            ⏹️ Stop
                        </button>
                    </div>
                </div>

                <!-- Hidden YouTube Audio Player -->
                <div class="hidden-audio-player">
                    <YouTubeAudioPlayer />
                </div>

                <!-- Guess Section -->
                <div v-if="!hasCurrentPlayerWon() && !showTrackInfo" class="guess-section">
                    <SmartGuessInput v-model="currentGuess" @submit="submitGuess"
                        :disabled="isSubmittingGuess || hasCurrentPlayerWon()" placeholder="Type your guess..."
                        submit-text="Submit Guess" />

                    <div class="guess-actions">
                        <button @click="skipAttempt" :disabled="isSubmittingGuess" class="skip-btn">
                            Skip (+{{ getNextClipDuration() }}s)
                        </button>
                    </div>
                </div>

                <!-- Round Results -->
                <div v-if="showTrackInfo" class="round-results">
                    <div class="round-scores">
                        <h4>Round {{ gameState.currentRound }} Results:</h4>
                        <div class="results-list">
                            <div v-for="player in players" :key="player.id" class="result-item">
                                <span class="player-name">{{ player.name }}</span>
                                <span class="attempts">{{ getPlayerAttempts(player.id) }} attempts</span>
                                <span class="round-score">+{{ getPlayerRoundScore(player.id) }} pts</span>
                                <span class="total-score">{{ getPlayerScore(player.id) }} total</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="isHost" class="round-actions">
                        <button v-if="gameState.currentRound < (gameSettings?.totalRounds || 5)" @click="nextRound"
                            class="next-round-btn">
                            ⏭️ Next Round ({{ gameState.currentRound + 1 }}/{{ gameSettings?.totalRounds || 5 }})
                        </button>
                        <button v-else @click="endTournament" class="end-tournament-btn">
                            🏆 End Tournament
                        </button>
                    </div>
                    <div v-else class="waiting-host">
                        <p v-if="gameState.currentRound < (gameSettings?.totalRounds || 5)">
                            Waiting for host to start next round...
                        </p>
                        <p v-else>Waiting for host to end the tournament...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { lobbyService, type LobbyData } from '@/services/lobbyService'
import SmartGuessInput from '@/components/SmartGuessInput.vue'
import YouTubeAudioPlayer from '@/components/YouTubeAudioPlayer.vue'
import { useAudioPlayerStore } from '@/stores/audioPlayerStore'
import { extractYouTubePlaylistId, fetchPlaylistVideos } from '@/utils/youtube'
import { getYouTubeApiKey } from '@/utils/env'

const router = useRouter()
const route = useRoute()
const audioStore = useAudioPlayerStore()

// Reactive state
const lobbyData = ref<LobbyData | null>(null)
const currentGuess = ref('')
const isPlaying = ref(false)
const isSubmittingGuess = ref(false)
const isStartingRound = ref(false)
const showTrackInfo = ref(false)
const gamePollingInterval = ref<number | null>(null)

// Computed properties
const lobbyCode = computed(() => route.params.lobbyCode as string)
const gameState = computed(() => lobbyData.value?.gameState)
const gameSettings = computed(() => lobbyData.value?.gameSettings)
const players = computed(() => lobbyData.value ? Object.values(lobbyData.value.players) : [])
const isHost = computed(() => {
    const currentPlayerId = lobbyService.getCurrentPlayerId()
    return lobbyData.value?.hostId === currentPlayerId
})

// Game state helpers
const getCurrentPlayerAttempts = () => {
    const currentPlayerId = lobbyService.getCurrentPlayerId()
    if (!currentPlayerId || !gameState.value) return 0
    return gameState.value.playerGuesses[currentPlayerId]?.attempts.length || 0
}

const getCurrentPlayerClipDuration = () => {
    const attempts = getCurrentPlayerAttempts()
    if (!gameState.value) return 1
    return gameState.value.clipDurations[attempts] || gameState.value.clipDurations[gameState.value.clipDurations.length - 1] || 16
}

const hasCurrentPlayerWon = () => {
    const currentPlayerId = lobbyService.getCurrentPlayerId()
    if (!currentPlayerId || !gameState.value) return false
    return gameState.value.playerGuesses[currentPlayerId]?.hasWon || false
}

const isCurrentPlayerAttemptCorrect = (attemptIndex: number) => {
    const currentPlayerId = lobbyService.getCurrentPlayerId()
    if (!currentPlayerId || !gameState.value) return false
    const attempts = gameState.value.playerGuesses[currentPlayerId]?.attempts || []
    return attempts[attemptIndex]?.isCorrect || false
}

const getPlayerAttempts = (playerId: string) => {
    if (!gameState.value) return 0
    return gameState.value.playerGuesses[playerId]?.attempts.length || 0
}

const hasPlayerWon = (playerId: string) => {
    if (!gameState.value) return false
    return gameState.value.playerGuesses[playerId]?.hasWon || false
}

const getPlayerScore = (playerId: string) => {
    if (!gameState.value) return 0
    return gameState.value.playerGuesses[playerId]?.totalScore || 0
}

const getPlayerRoundScore = (playerId: string) => {
    if (!gameState.value) return 0
    return gameState.value.playerGuesses[playerId]?.roundScore || 0
}

const getNextClipDuration = () => {
    if (!gameState.value) return '16'
    const nextIndex = getCurrentPlayerAttempts()
    return gameState.value.clipDurations[nextIndex + 1] || 'reveal'
}

// Game actions
const startRound = async () => {
    if (!isHost.value || isStartingRound.value) return

    isStartingRound.value = true

    try {
        // Load tracks from the playlist
        const playlistUrl = gameSettings.value?.playlistUrl
        if (!playlistUrl) {
            console.error('No playlist URL configured')
            return
        }

        const playlistId = extractYouTubePlaylistId(playlistUrl)
        if (!playlistId) {
            console.error('Invalid playlist URL')
            return
        }

        const apiKey = getYouTubeApiKey()
        if (!apiKey) {
            console.error('YouTube API key not configured')
            return
        }

        // Fetch playlist videos
        const playlistItems = await fetchPlaylistVideos(playlistId, apiKey)
        if (playlistItems.length === 0) {
            console.error('Playlist is empty or could not be loaded')
            return
        }

        // Select a random track
        const randomIndex = Math.floor(Math.random() * playlistItems.length)
        const selectedVideo = playlistItems[randomIndex]

        const trackData = {
            id: selectedVideo.videoId,
            title: selectedVideo.title,
            artist: extractArtistFromTitle(selectedVideo.title),
            youtubeId: selectedVideo.videoId
        }

        const result = await lobbyService.updateGameState({
            currentTrack: trackData,
            isRoundActive: true,
            roundStartTime: Date.now(),
            roundEndTime: null
        })

        if (result.success) {
            // Refresh lobby data
            refreshLobbyData()
            showTrackInfo.value = false
        }
    } catch (error) {
        console.error('Failed to start round:', error)
    } finally {
        isStartingRound.value = false
    }
}

// Helper function to extract artist from video title
const extractArtistFromTitle = (title: string): string => {
    // Common patterns for artist extraction
    const patterns = [
        /^([^-]+)\s*-\s*(.+)$/,  // "Artist - Song"
        /^(.+)\s*by\s*([^(]+)/i,  // "Song by Artist"
        /^([^|]+)\s*\|\s*(.+)$/   // "Artist | Song"
    ]

    for (const pattern of patterns) {
        const match = title.match(pattern)
        if (match) {
            return match[1].trim()
        }
    }

    // If no pattern matches, return empty string
    return ''
}

const playClip = async () => {
    if (!gameState.value?.currentTrack || isPlaying.value) return

    const track = gameState.value.currentTrack
    const clipDuration = getCurrentPlayerClipDuration()

    isPlaying.value = true

    try {
        // Load the track in the audio player
        await audioStore.loadTrack({
            id: track.id,
            videoId: track.youtubeId,
            title: track.title,
            artist: track.artist
        })

        // Play for the specified duration
        audioStore.play()

        // Stop after clip duration
        setTimeout(() => {
            audioStore.pause()
            isPlaying.value = false
        }, clipDuration * 1000)

    } catch (error) {
        console.error('Failed to play clip:', error)
        isPlaying.value = false
    }
}

const stopClip = () => {
    audioStore.pause()
    isPlaying.value = false
}

const submitGuess = async (guess: string, isSkip: boolean = false) => {
    if ((!guess.trim() && !isSkip) || isSubmittingGuess.value || hasCurrentPlayerWon()) return

    isSubmittingGuess.value = true

    try {
        // Check if the guess is correct (skipped guesses are always incorrect)
        const isCorrect = isSkip ? false : checkGuessCorrectness(guess, gameState.value?.currentTrack)

        const result = await lobbyService.submitGuess(guess || '[SKIPPED]', isCorrect)

        if (result.success) {
            currentGuess.value = ''
            refreshLobbyData()

            // If correct, show celebration
            if (isCorrect) {
                showTrackInfo.value = true
            } else {
                // Check if this player has reached maximum attempts
                const currentAttempts = getCurrentPlayerAttempts()
                if (currentAttempts >= (gameState.value?.clipDurations.length || 6)) {
                    // Max attempts reached for this player, but don't reveal answer yet
                    // Other players might still be playing
                }
            }
        }
    } catch (error) {
        console.error('Failed to submit guess:', error)
    } finally {
        isSubmittingGuess.value = false
    }
}

// Helper function to check if a guess is correct
const checkGuessCorrectness = (guess: string, track: { title: string; artist?: string } | null | undefined): boolean => {
    if (!track || !guess.trim()) return false

    const normalizeString = (str: string): string => {
        return str.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim()
    }

    const normalizedGuess = normalizeString(guess)
    const normalizedTitle = normalizeString(track.title)
    const normalizedArtist = track.artist ? normalizeString(track.artist) : ''

    // Check for exact title match
    if (normalizedTitle.includes(normalizedGuess) || normalizedGuess.includes(normalizedTitle)) {
        return true
    }

    // Check for artist match if artist is available
    if (normalizedArtist && (normalizedArtist.includes(normalizedGuess) || normalizedGuess.includes(normalizedArtist))) {
        return true
    }

    // Check for partial word matches (at least 70% of words match)
    const guessWords = normalizedGuess.split(' ').filter(word => word.length > 2)
    const titleWords = normalizedTitle.split(' ').filter(word => word.length > 2)

    if (guessWords.length > 0 && titleWords.length > 0) {
        const matchingWords = guessWords.filter(guessWord =>
            titleWords.some(titleWord =>
                titleWord.includes(guessWord) || guessWord.includes(titleWord)
            )
        )

        const matchRatio = matchingWords.length / Math.min(guessWords.length, titleWords.length)
        return matchRatio >= 0.7
    }

    return false
}

const skipAttempt = async () => {
    await submitGuess('', true) // Empty guess with skip flag = skip
}

const nextRound = async () => {
    if (!isHost.value) return

    try {
        const nextRoundNumber = (gameState.value?.currentRound || 1) + 1

        // Reset for next round
        const updatedPlayerGuesses = { ...gameState.value?.playerGuesses }
        Object.keys(updatedPlayerGuesses).forEach(playerId => {
            updatedPlayerGuesses[playerId] = {
                ...updatedPlayerGuesses[playerId],
                attempts: [],
                hasWon: false,
                roundScore: 0
            }
        })

        const result = await lobbyService.updateGameState({
            currentRound: nextRoundNumber,
            currentTrack: null,
            isRoundActive: false,
            roundStartTime: 0,
            roundEndTime: null,
            playerGuesses: updatedPlayerGuesses
        })

        if (result.success) {
            showTrackInfo.value = false
            refreshLobbyData()
        }
    } catch (error) {
        console.error('Failed to start next round:', error)
    }
}

const endTournament = async () => {
    if (!isHost.value) return

    try {
        const result = await lobbyService.updateGameState({
            isRoundActive: false
        })

        if (result.success) {
            // Navigate to tournament results
            router.push(`/lobby/${lobbyCode.value}/results`)
        }
    } catch (error) {
        console.error('Failed to end tournament:', error)
    }
}

// Data management
const refreshLobbyData = () => {
    const freshLobby = lobbyService.getLobby(lobbyCode.value)
    if (freshLobby) {
        lobbyData.value = freshLobby
    }
}

const pollGameUpdates = () => {
    refreshLobbyData()
}

// Lifecycle
onMounted(() => {
    // Get initial lobby data
    refreshLobbyData()

    if (!lobbyData.value || lobbyData.value.status !== 'playing') {
        // Redirect back to lobby if game not active
        router.push(`/lobby/${lobbyCode.value}`)
        return
    }

    // Start polling for game updates
    gamePollingInterval.value = setInterval(pollGameUpdates, 1000) // More frequent for game
})

onUnmounted(() => {
    if (gamePollingInterval.value) {
        clearInterval(gamePollingInterval.value)
    }
})
</script>

<style scoped>
.multiplayer-game-view {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
}

.loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
}

.loading-content {
    text-align: center;
    color: white;
}

.loading-content h2 {
    font-size: 2rem;
    margin-bottom: 10px;
}

.game-container {
    max-width: 1000px;
    margin: 0 auto;
}

.game-header {
    text-align: center;
    color: white;
    margin-bottom: 30px;
}

.game-header h1 {
    font-size: 2.5rem;
    margin: 0 0 15px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.round-info {
    display: flex;
    justify-content: center;
    gap: 30px;
    font-size: 1.1rem;
    opacity: 0.9;
}

.players-status {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 25px;
    margin-bottom: 30px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.players-status h3 {
    margin: 0 0 20px 0;
    color: #2c3e50;
    text-align: center;
}

.players-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
}

.player-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 10px;
    border-left: 4px solid #007bff;
}

.player-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.player-name {
    font-weight: 600;
    color: #2c3e50;
}

.host-badge {
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    color: #2c3e50;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 600;
}

.player-progress {
    display: flex;
    gap: 15px;
    align-items: center;
    font-size: 0.9rem;
}

.attempts {
    color: #6c757d;
}

.score {
    color: #007bff;
    font-weight: 600;
}

.won {
    font-size: 0.8rem;
}

.waiting-for-round,
.active-round {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 30px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.waiting-content {
    text-align: center;
}

.waiting-content h2 {
    color: #2c3e50;
    margin-bottom: 15px;
}

.waiting-content p {
    color: #6c757d;
    margin-bottom: 25px;
}

.start-round-btn {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 25px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.start-round-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);
}

.start-round-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.track-reveal {
    text-align: center;
    margin-bottom: 30px;
}

.track-reveal h3 {
    color: #2c3e50;
    margin-bottom: 15px;
}

.track-info h4 {
    color: #007bff;
    font-size: 1.5rem;
    margin: 0;
}

.track-info p {
    color: #6c757d;
    margin: 5px 0 0 0;
}

.clip-controls {
    text-align: center;
    margin-bottom: 30px;
}

.clip-info {
    margin-bottom: 20px;
}

.clip-duration {
    margin-bottom: 15px;
}

.duration-label {
    color: #6c757d;
    margin-right: 10px;
}

.duration-value {
    color: #007bff;
    font-weight: 600;
    font-size: 1.1rem;
}

.attempts-display {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
}

.attempt-dot {
    padding: 8px 12px;
    border-radius: 20px;
    background: #e9ecef;
    color: #6c757d;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.3s ease;
}

.attempt-dot.current {
    background: #007bff;
    color: white;
}

.attempt-dot.completed {
    background: #6c757d;
    color: white;
}

.attempt-dot.correct {
    background: #28a745;
    color: white;
}

.play-controls {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-bottom: 20px;
}

.play-btn,
.stop-btn {
    padding: 12px 25px;
    border: none;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.play-btn {
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    color: white;
}

.stop-btn {
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    color: white;
}

.play-btn:hover:not(:disabled),
.stop-btn:hover {
    transform: translateY(-2px);
}

.play-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.guess-section {
    margin-bottom: 30px;
}

.guess-actions {
    text-align: center;
    margin-top: 15px;
}

.skip-btn {
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.skip-btn:hover:not(:disabled) {
    background: #5a6268;
    transform: translateY(-1px);
}

.skip-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.round-results {
    text-align: center;
}

.round-scores h4 {
    color: #2c3e50;
    margin-bottom: 20px;
}

.results-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 30px;
}

.result-item {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 15px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    align-items: center;
}

.result-item .player-name {
    text-align: left;
    font-weight: 600;
}

.round-score {
    color: #28a745;
    font-weight: 600;
}

.total-score {
    color: #007bff;
    font-weight: 600;
}

.round-actions {
    display: flex;
    justify-content: center;
    gap: 15px;
}

.next-round-btn,
.end-tournament-btn {
    padding: 12px 25px;
    border: none;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.next-round-btn {
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    color: white;
}

.end-tournament-btn {
    background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
    color: #212529;
}

.next-round-btn:hover,
.end-tournament-btn:hover {
    transform: translateY(-2px);
}

.waiting-host {
    color: #6c757d;
    font-style: italic;
}

.hidden-audio-player {
    position: absolute;
    top: -9999px;
    left: -9999px;
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
}

@media (max-width: 768px) {
    .game-header h1 {
        font-size: 2rem;
    }

    .round-info {
        flex-direction: column;
        gap: 10px;
    }

    .players-grid {
        grid-template-columns: 1fr;
    }

    .player-status {
        flex-direction: column;
        gap: 10px;
        text-align: center;
    }

    .attempts-display {
        gap: 5px;
    }

    .attempt-dot {
        padding: 6px 10px;
        font-size: 0.8rem;
    }

    .result-item {
        grid-template-columns: 1fr;
        text-align: center;
        gap: 8px;
    }
}
</style>
