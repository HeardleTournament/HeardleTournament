<template>
    <div class="multiplayer-game-view">
        <!-- Return Home Button (always visible when game is loaded) -->
        <div class="menu-button-container">
            <button class="return-menu-btn" @click="showReturnHomeModal = true">
                ← Return Home
            </button>
        </div>
        <div v-if="!gameState" class="loading-screen">
            <div class="loading-content">
                <h2>Loading Game...</h2>
                <p>Initializing multiplayer session...</p>
            </div>
        </div>

        <div v-else class="game-container">
        <!-- Return Home Confirmation Modal -->
        <div v-if="showReturnHomeModal" class="modal-overlay" @click="showReturnHomeModal = false">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3>⚠️ Return to Home?</h3>
                    <button @click="showReturnHomeModal = false" class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to return to the home screen? Your current multiplayer game will be lost.</p>
                </div>
                <div class="modal-actions">
                    <button @click="showReturnHomeModal = false" class="modal-btn cancel">Cancel</button>
                    <button @click="confirmReturnHome" class="modal-btn confirm">Yes, Return Home</button>
                </div>
            </div>
        </div>
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
                            <span v-else-if="hasPlayerLost(player.id)" class="completed">✅ Complete</span>
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
                                    'current': index === getCurrentPlayerAttempts() && !hasCurrentPlayerWon() && !hasCurrentPlayerFinishedRound(),
                                    'correct': index < getCurrentPlayerAttempts() && isCurrentPlayerAttemptCorrect(index),
                                    'finished': hasCurrentPlayerFinishedRound() && index === getCurrentPlayerAttempts() - 1
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
                <div v-if="!hasCurrentPlayerWon() && !hasCurrentPlayerFinishedRound() && !showTrackInfo"
                    class="guess-section">
                    <SmartGuessInput v-model="currentGuess" @submit="submitGuess"
                        :disabled="isSubmittingGuess || hasCurrentPlayerWon() || hasCurrentPlayerFinishedRound()"
                        placeholder="Type song title or artist..." submit-text="Submit Guess" />

                    <div class="guess-actions">
                        <button @click="skipAttempt" :disabled="isSubmittingGuess || hasCurrentPlayerFinishedRound()"
                            class="skip-btn">
                            Skip (+{{ getNextClipDuration() }}s)
                        </button>
                        <button @click="giveUp" :disabled="isSubmittingGuess || hasCurrentPlayerFinishedRound()"
                            class="give-up-btn">
                            Give Up
                        </button>
                    </div>
                </div>


                <!-- Player Round Completed Message -->
                <div v-if="hasCurrentPlayerFinishedRound() && !hasCurrentPlayerWon() && !showTrackInfo"
                    class="round-completed-section">
                    <div class="completed-message">
                        <h3>🎵 Round Completed</h3>
                        <p>You used all {{ gameState.maxAttempts }} attempts or gave up. Better luck next round!</p>
                    </div>
                    <div v-if="areAllPlayersFinished()">
                        <p style="margin-top: 20px; color: #007bff; font-weight: 500;">All players have finished. Showing results...</p>
                    </div>
                    <div v-else class="waiting-host" style="margin-top: 20px;">
                        <p v-if="gameState.currentRound < (gameSettings?.totalRounds || 5)">
                            Waiting for other players to finish...
                        </p>
                        <p v-else>Waiting for other players to finish the tournament...</p>
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

        <!-- Next Round Confirmation Modal -->
        <div v-if="showNextRoundConfirmation" class="modal-overlay" @click="cancelNextRound">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3>⚠️ Players Still Playing</h3>
                    <button @click="cancelNextRound" class="modal-close">×</button>
                </div>

                <div class="modal-body">
                    <p>Some players haven't finished their current round yet:</p>

                    <div class="players-still-playing">
                        <div v-for="player in playersStillPlaying" :key="player.id" class="player-item">
                            <span class="player-name">{{ player.name }}</span>
                            <span v-if="player.isHost" class="host-badge">Host</span>
                            <span class="player-status">{{ getPlayerAttempts(player.id) }}/{{ gameState?.maxAttempts }} attempts</span>
                        </div>
                    </div>

                    <p class="confirmation-text">
                        Proceeding will end the current round for all players and reveal the answer.
                        Players who haven't finished will receive 0 points for this round.
                    </p>
                    <p class="confirmation-text">Are you sure you want to continue?</p>
                </div>

                <div class="modal-actions">
                    <button @click="cancelNextRound" class="modal-btn cancel">
                        Cancel
                    </button>
                    <button @click="proceedToNextRound" class="modal-btn confirm">
                        Yes, Next Round
                    </button>
                </div>
            </div>
        </div>

        <!-- Give Up Confirmation Modal -->
        <div v-if="showGiveUpConfirmation" class="modal-overlay" @click="cancelGiveUp">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3>❌ Give Up?</h3>
                    <button @click="cancelGiveUp" class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to give up this round?</p>
                    <p class="confirmation-text">You will receive 0 points for this round and cannot make more guesses.</p>
                </div>
                <div class="modal-actions">
                    <button @click="cancelGiveUp" class="modal-btn cancel">
                        Cancel
                    </button>
                    <button @click="confirmGiveUp" class="modal-btn confirm">
                        Yes, Give Up
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const showReturnHomeModal = ref(false)
const confirmReturnHome = () => {
    // Optionally: add multiplayer cleanup logic here
    router.push('/')
}
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { firebaseLobbyService, type LobbyData, type MultiplayerGameState } from '@/services/firebaseLobbyService'
import SmartGuessInput from '@/components/SmartGuessInput.vue'
import YouTubeAudioPlayer from '@/components/YouTubeAudioPlayer.vue'
import { useAudioPlayerStore } from '@/stores/audioPlayerStore'
import { extractYouTubePlaylistId, fetchPlaylistVideos } from '@/utils/youtube'
import { getYouTubeApiKey, getXenobladePlaylistUrl } from '@/utils/env'

const router = useRouter()
const route = useRoute()
const audioStore = useAudioPlayerStore()

// Navigation guard to prevent rapid navigation loops
const lastNavigationTime = ref<number>(0)
const NAVIGATION_THROTTLE_MS = 2000 // Prevent navigation calls within 2 seconds

const safeNavigate = (path: string) => {
    const now = Date.now()
    if (now - lastNavigationTime.value < NAVIGATION_THROTTLE_MS) {
        console.log('Navigation throttled, ignoring call to:', path)
        return false
    }
    lastNavigationTime.value = now
    router.push(path)
    return true
}

// Reactive state
const lobbyData = ref<LobbyData | null>(null)
const currentGuess = ref('')
const isPlaying = ref(false)
const isSubmittingGuess = ref(false)
const isStartingRound = ref(false)
const showTrackInfo = ref(false)
const showNextRoundConfirmation = ref(false)
const showGiveUpConfirmation = ref(false)

import { watch } from 'vue'

// Remove watcher; move logic into handleGameStateChanges for reliability

// Computed properties
const lobbyCode = computed(() => route.params.lobbyCode as string)
const gameState = computed(() => lobbyData.value?.gameState)
const gameSettings = computed(() => lobbyData.value?.gameSettings)
const players = computed(() => lobbyData.value ? Object.values(lobbyData.value.players) : [])
const isHost = computed(() => {
    const currentPlayerId = firebaseLobbyService.getCurrentPlayerId()
    return lobbyData.value?.hostId === currentPlayerId
})
const playersStillPlaying = computed(() => getPlayersStillPlaying())

// Game state helpers
const getCurrentPlayerAttempts = () => {
    const currentPlayerId = firebaseLobbyService.getCurrentPlayerId()
    if (!currentPlayerId || !gameState.value) return 0
    const playerGuess = gameState.value.playerGuesses[currentPlayerId]
    return playerGuess?.attempts?.length || 0
}

const getCurrentPlayerClipDuration = () => {
    const attempts = getCurrentPlayerAttempts()
    if (!gameState.value) return 1
    return gameState.value.clipDurations[attempts] || gameState.value.clipDurations[gameState.value.clipDurations.length - 1] || 16
}

const hasCurrentPlayerWon = () => {
    const currentPlayerId = firebaseLobbyService.getCurrentPlayerId()
    if (!currentPlayerId || !gameState.value) return false
    return gameState.value.playerGuesses[currentPlayerId]?.hasWon || false
}

const hasCurrentPlayerFinishedRound = () => {
    const currentPlayerId = firebaseLobbyService.getCurrentPlayerId()
    if (!currentPlayerId || !gameState.value) return false
    return gameState.value.playerGuesses[currentPlayerId]?.hasLost || false
}

const isCurrentPlayerAttemptCorrect = (attemptIndex: number) => {
    const currentPlayerId = firebaseLobbyService.getCurrentPlayerId()
    if (!currentPlayerId || !gameState.value) return false
    const attempts = gameState.value.playerGuesses[currentPlayerId]?.attempts || []
    return attempts[attemptIndex]?.isCorrect || false
}

const getPlayerAttempts = (playerId: string) => {
    if (!gameState.value) return 0
    const playerGuess = gameState.value.playerGuesses[playerId]
    return playerGuess?.attempts?.length || 0
}

const hasPlayerWon = (playerId: string) => {
    if (!gameState.value) return false
    return gameState.value.playerGuesses[playerId]?.hasWon || false
}

const hasPlayerLost = (playerId: string) => {
    if (!gameState.value) return false
    return gameState.value.playerGuesses[playerId]?.hasLost || false
}

const getPlayerScore = (playerId: string) => {
    if (!gameState.value) return 0
    return gameState.value.playerGuesses[playerId]?.totalScore || 0
}

const getPlayerRoundScore = (playerId: string) => {
    if (!gameState.value) return 0
    return gameState.value.playerGuesses[playerId]?.roundScore || 0
}

const areAllPlayersFinished = () => {
    if (!gameState.value || !lobbyData.value) return false

    // Don't consider round finished if it's not active
    if (!gameState.value.isRoundActive) return false

    // Don't consider round finished if it just started (less than 2 seconds ago)
    const timeSinceStart = Date.now() - gameState.value.roundStartTime
    if (timeSinceStart < 2000) {
        return false
    }

    // Check if all players in the lobby have either won or lost
    const allPlayerIds = Object.keys(lobbyData.value.players)

    const result = allPlayerIds.every(playerId => {
        const playerState = gameState.value!.playerGuesses[playerId]
        // If player doesn't have game state yet, they haven't finished
        if (!playerState) return false

        // For a round that just started, if all players have empty attempts,
        // they definitely haven't finished yet
        if (timeSinceStart < 5000 && playerState.attempts.length === 0) {
            return false
        }

        // Player must have won or lost AND have at least attempted once (or reached max attempts)
        return (playerState.hasWon || playerState.hasLost) &&
            (playerState.attempts.length > 0 || playerState.hasLost)
    })

    return result
}

const getPlayersStillPlaying = () => {
    if (!gameState.value || !lobbyData.value) return []

    const allPlayerIds = Object.keys(lobbyData.value.players)

    return allPlayerIds.filter(playerId => {
        const playerState = gameState.value!.playerGuesses[playerId]
        // If player doesn't have game state yet, they're still playing
        if (!playerState) return true

        // If player hasn't won or lost, they're still playing
        if (!playerState.hasWon && !playerState.hasLost) return true

        // If player has no attempts yet, they're still playing
        if (playerState.attempts.length === 0 && !playerState.hasLost) return true

        return false
    }).map(playerId => lobbyData.value!.players[playerId])
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
        let playlistUrl = gameSettings.value?.playlistUrl

        // Fallback to Xenoblade playlist if no playlist URL is configured in lobby
        if (!playlistUrl) {
            playlistUrl = getXenobladePlaylistUrl()
            console.log('No playlist URL in lobby settings, using fallback:', playlistUrl)
        }

        if (!playlistUrl) {
            console.error('No playlist URL configured and no fallback available')
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

        // Get tracks that haven't been used yet
        const usedTracks = gameState.value?.usedTracks || []
        const availableTracks = playlistItems.filter(item => !usedTracks.includes(item.videoId))

        // If all tracks have been used, reset the used tracks list
        const tracksToChooseFrom = availableTracks.length > 0 ? availableTracks : playlistItems

        // Select a random track from available tracks
        const randomIndex = Math.floor(Math.random() * tracksToChooseFrom.length)
        const selectedVideo = tracksToChooseFrom[randomIndex]

        const trackData = {
            id: selectedVideo.videoId,
            title: selectedVideo.title,
            artist: extractArtistFromTitle(selectedVideo.title),
            youtubeId: selectedVideo.videoId
        }

        // Update the used tracks list
        const newUsedTracks = availableTracks.length > 0
            ? [...usedTracks, selectedVideo.videoId]  // Add to existing list
            : [selectedVideo.videoId]                 // Reset list with just this track

        const result = await firebaseLobbyService.updateGameState({
            currentTrack: trackData,
            isRoundActive: true,
            roundStartTime: Date.now(),
            roundEndTime: null,
            usedTracks: newUsedTracks
        })

        if (result.success) {
            // Refresh lobby data
            refreshLobbyData()
            showTrackInfo.value = false
        } else {
            console.error('Failed to start round:', result.error)
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

        const result = await firebaseLobbyService.submitGuess(guess || '[SKIPPED]', isCorrect)

        if (result.success) {
            currentGuess.value = ''
            refreshLobbyData()

            // If correct, show celebration
            if (isCorrect) {
                showTrackInfo.value = true
            } else {
                // Check if all players have finished (won or lost)
                if (areAllPlayersFinished()) {
                    showTrackInfo.value = true
                }
            }
        } else {
            console.error('Failed to submit guess:', result.error)
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

    const normalizedGuess = guess.toLowerCase().trim()
    const normalizedTitle = track.title.toLowerCase().trim()
    const normalizedArtist = track.artist?.toLowerCase().trim() || ''

    // Use the same validation logic as the solo game for consistency
    // Check if guess matches title or artist (exact match or contains, but must be substantial)
    const isCorrect =
        normalizedGuess === normalizedTitle ||
        normalizedGuess === normalizedArtist ||
        (normalizedTitle.includes(normalizedGuess) && normalizedGuess.length > 3) ||
        (normalizedArtist.includes(normalizedGuess) && normalizedGuess.length > 3)

    return isCorrect
}

const skipAttempt = async () => {
    await submitGuess('', true) // Empty guess with isSkip = true
}

const giveUp = () => {
    if (isSubmittingGuess.value || hasCurrentPlayerFinishedRound()) return
    showGiveUpConfirmation.value = true
}

const confirmGiveUp = async () => {
    showGiveUpConfirmation.value = false
    isSubmittingGuess.value = true
    try {
        const result = await firebaseLobbyService.giveUpRound()
        if (result.success) {
            currentGuess.value = ''
            refreshLobbyData()
            if (areAllPlayersFinished()) {
                showTrackInfo.value = true
            }
        } else {
            console.error('Failed to give up round:', result.error)
        }
    } catch (error) {
        console.error('Failed to give up round:', error)
    } finally {
        isSubmittingGuess.value = false
    }
}

const cancelGiveUp = () => {
    showGiveUpConfirmation.value = false
}

const nextRound = async () => {
    if (!isHost.value) return

    // Check if players are still playing and show confirmation if needed
    if (!areAllPlayersFinished()) {
        showNextRoundConfirmation.value = true
        return
    }

    // If all players finished, proceed directly
    await proceedToNextRound()
}

const proceedToNextRound = async () => {
    if (!isHost.value) return

    try {
        const nextRoundNumber = (gameState.value?.currentRound || 1) + 1

        // Reset for next round
        const updatedPlayerGuesses = { ...gameState.value?.playerGuesses }
        Object.keys(updatedPlayerGuesses).forEach(playerId => {
            // No need to increment roundsWon here since it's already handled
            // in firebaseLobbyService when the player makes a correct guess

            updatedPlayerGuesses[playerId] = {
                ...updatedPlayerGuesses[playerId],
                attempts: [],
                hasWon: false,
                hasLost: false,
                roundScore: 0
            }
        })

        const result = await firebaseLobbyService.updateGameState({
            currentRound: nextRoundNumber,
            currentTrack: null,
            isRoundActive: false,
            roundStartTime: 0,
            roundEndTime: null,
            playerGuesses: updatedPlayerGuesses
        })

        if (result.success) {
            showTrackInfo.value = false
            showNextRoundConfirmation.value = false
            refreshLobbyData()
        } else {
            console.error('Failed to start next round:', result.error)
        }
    } catch (error) {
        console.error('Failed to start next round:', error)
    }
}

const cancelNextRound = () => {
    showNextRoundConfirmation.value = false
}

const endTournament = async () => {
    if (!isHost.value) return

    try {
        // No need to increment roundsWon here since it should already be handled
        // when progressing through rounds in proceedToNextRound()
        const updatedPlayerGuesses = { ...gameState.value?.playerGuesses }

        // Update game state to mark tournament as complete
        const result = await firebaseLobbyService.updateGameState({
            isRoundActive: false,
            currentTrack: null,
            roundStartTime: 0,
            roundEndTime: null,
            playerGuesses: updatedPlayerGuesses
        })

        if (result.success) {
            // Update lobby status to 'finished' to prevent polling issues
            const finishResult = await firebaseLobbyService.finishTournament()

            if (finishResult.success) {
                // Navigate to tournament results
                safeNavigate(`/lobby/${lobbyCode.value}/results`)
            } else {
                console.error('Failed to finish tournament:', finishResult.error)
                // Still navigate to results even if status update fails
                safeNavigate(`/lobby/${lobbyCode.value}/results`)
            }
        } else {
            console.error('Failed to update final game state:', result.error)
            // Still try to finish tournament
            await firebaseLobbyService.finishTournament()
            safeNavigate(`/lobby/${lobbyCode.value}/results`)
        }
    } catch (error) {
        console.error('Failed to end tournament:', error)
    }
}

// Handle keyboard events for modal
const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        if (showNextRoundConfirmation.value) cancelNextRound()
        if (showGiveUpConfirmation.value) cancelGiveUp()
    }
}

// Data management
const refreshLobbyData = () => {
    // Get current lobby data from Firebase service
    const currentLobby = firebaseLobbyService.getCurrentLobby()
    if (currentLobby) {
        lobbyData.value = currentLobby
    }
}

// Set up real-time Firebase listeners
const setupRealtimeListeners = () => {
    // Listen to lobby changes (player updates, status changes)
    firebaseLobbyService.listenToLobby(lobbyCode.value, (updatedLobby) => {
        if (updatedLobby) {
            lobbyData.value = updatedLobby

            // Check if game finished
            if (updatedLobby.status === 'finished') {
                safeNavigate(`/lobby/${lobbyCode.value}/results`)
                return
            }
        } else {
            // Lobby was deleted or connection lost
            console.log('Lobby connection lost, redirecting to multiplayer menu')
            safeNavigate('/multiplayer')
        }
    })

    // Listen to game state changes (round progression, player guesses, etc.)
    firebaseLobbyService.listenToGameState(lobbyCode.value, (updatedGameState) => {
        if (updatedGameState) {
            // Capture previous track before updating
            const previousTrack = gameState.value?.currentTrack

            // Update local game state reference by updating the lobby data
            if (lobbyData.value) {
                lobbyData.value = {
                    ...lobbyData.value,
                    gameState: updatedGameState
                }
            }

            // Handle UI state synchronization for all players
            handleGameStateChanges(updatedGameState, previousTrack)
        }
    })
}

// Handle game state changes for UI synchronization
const handleGameStateChanges = (newGameState: MultiplayerGameState, previousTrack?: { id: string; title: string; artist?: string; youtubeId: string } | null) => {
    const currentTrack = newGameState.currentTrack

    // If a new round started (track changed from something to null)
    if (previousTrack && !currentTrack) {
        showTrackInfo.value = false
        currentGuess.value = ''
        isPlaying.value = false
        isSubmittingGuess.value = false
        console.log('[handleGameStateChanges] New round started, hiding track info')
    }

    // If a new track was set (round started)
    if (!previousTrack && currentTrack) {
        showTrackInfo.value = false
        currentGuess.value = ''
        isPlaying.value = false
        isSubmittingGuess.value = false
        console.log('[handleGameStateChanges] Track set, round started, hiding track info')
    }

    // If track info should be shown (all players finished or round ended)
    const allFinished = areAllPlayersFinished()
    const isRoundActiveAndStarted = newGameState.isRoundActive && newGameState.roundStartTime > 0

    // Show track info if the round is actually active and players have finished
    if (!showTrackInfo.value && currentTrack && isRoundActiveAndStarted && allFinished) {
        showTrackInfo.value = true
        console.log('[handleGameStateChanges] All players finished, showing track info/results')
    }

    // Also show track info if all players are finished and the round is no longer active (end of tournament case)
    if (!showTrackInfo.value && !currentTrack && !newGameState.isRoundActive && allFinished) {
        showTrackInfo.value = true
        console.log('[handleGameStateChanges] All players finished and round inactive (end of tournament), showing track info/results')
    }

    if (!showTrackInfo.value) {
        console.log('[handleGameStateChanges] allFinished:', allFinished, 'showTrackInfo:', showTrackInfo.value, 'currentTrack:', currentTrack, 'isRoundActiveAndStarted:', isRoundActiveAndStarted)
    }
}

// Lifecycle
onMounted(async () => {
    // Add keyboard event listener for modal
    document.addEventListener('keydown', handleKeydown)

    // Get initial lobby data
    refreshLobbyData()

    if (!lobbyData.value || lobbyData.value.status !== 'playing') {
        // Redirect back to lobby if game not active
        safeNavigate(`/lobby/${lobbyCode.value}`)
        return
    }

    // Load the playlist into audioStore for SmartGuessInput autocompletion
    await loadPlaylistForAutocompletion()

    // Set up real-time listeners for lobby and game state changes
    setupRealtimeListeners()
})

// Load playlist into audioStore for autocompletion functionality
const loadPlaylistForAutocompletion = async () => {
    let playlistUrl = gameSettings.value?.playlistUrl

    // Fallback to Xenoblade playlist if no playlist URL is configured in lobby
    if (!playlistUrl) {
        playlistUrl = getXenobladePlaylistUrl()
        console.log('Using fallback playlist for autocompletion:', playlistUrl)
    }

    if (!playlistUrl) {
        return
    }

    try {
        // Use the existing method to load the custom playlist
        await audioStore.loadCustomPlaylistFromYouTube(playlistUrl)
    } catch (error) {
        console.warn('Failed to load playlist for autocompletion:', error)
    }
}

onUnmounted(() => {
    // Clean up keyboard event listener
    document.removeEventListener('keydown', handleKeydown)

    // Clean up Firebase listeners
    firebaseLobbyService.removeAllListeners()
})

// Also clean up when leaving route (ensures cleanup even if component doesn't unmount properly)
onBeforeRouteLeave(() => {
    // Clean up Firebase listeners
    firebaseLobbyService.removeAllListeners()
    console.log('Cleaned up Firebase listeners on route leave')
})
</script>

<style scoped>
/* Modal Styles and Return Home Button (reuse from GameView.vue) */
.menu-button-container {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
}
.return-menu-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    display: flex;
    align-items: center;
    gap: 8px;
}
.return-menu-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}
.return-menu-btn:active {
    transform: translateY(0);
}
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.modal-content {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    padding: 32px 24px 24px 24px;
    min-width: 320px;
    max-width: 90vw;
    position: relative;
}
.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}
.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
}
.modal-body {
    margin-bottom: 20px;
}
.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}
.modal-btn {
    padding: 8px 18px;
    border-radius: 20px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    font-size: 15px;
}
.modal-btn.cancel {
    background: #e0e0e0;
    color: #333;
}
.modal-btn.confirm {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
}
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
    color: #28a745;
    font-weight: 600;
}

.lost,
.completed {
    font-size: 0.8rem;
    color: #6c757d;
    font-weight: 600;
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

.attempt-dot.lost {
    background: #dc3545;
    color: white;
}

.attempt-dot.finished {
    background: #6c757d;
    color: white;
    opacity: 0.8;
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

.player-lost-section,
.round-completed-section {
    margin-bottom: 30px;
    text-align: center;
}

.lost-message,
.completed-message {
    background: rgba(108, 117, 125, 0.1);
    border: 2px solid rgba(108, 117, 125, 0.3);
    border-radius: 15px;
    padding: 20px;
    color: #495057;
}

.lost-message h3,
.completed-message h3 {
    color: #6c757d;
    margin: 0 0 10px 0;
    font-size: 1.5rem;
}

.lost-message p,
.completed-message p {
    margin: 5px 0;
    font-size: 1rem;
}

.guess-actions {
    text-align: center;
    margin-top: 15px;
    display: flex;
    gap: 15px;
    justify-content: center;
}

.skip-btn,
.give-up-btn {
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
}

.skip-btn {
    background: #6c757d;
}

.skip-btn:hover:not(:disabled) {
    background: #5a6268;
    transform: translateY(-1px);
}

.skip-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.give-up-btn {
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
}

.give-up-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.give-up-btn:disabled {
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

    .guess-actions {
        flex-direction: column;
        gap: 10px;
    }

    .skip-btn,
    .give-up-btn {
        width: 100%;
    }
}

/* Next Round Confirmation Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
}

.modal-content {
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.modal-header {
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
    padding: 20px 25px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f1f1f1;
}

.modal-header h3 {
    margin: 0;
    color: #721c24;
    font-size: 1.3rem;
    font-weight: 600;
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #721c24;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
}

.modal-close:hover {
    background: rgba(114, 28, 36, 0.1);
}

.modal-body {
    padding: 25px;
}

.modal-body p {
    margin: 0 0 20px 0;
    color: #495057;
    line-height: 1.5;
}

.confirmation-text {
    font-weight: 500;
    color: #dc3545;
    margin-top: 20px !important;
}

.players-still-playing {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 15px;
    margin: 15px 0;
    border-left: 4px solid #ffc107;
}

.player-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #e9ecef;
}

.player-item:last-child {
    border-bottom: none;
}

.player-item .player-name {
    font-weight: 600;
    color: #2c3e50;
    flex: 1;
}

.player-item .host-badge {
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    color: #856404;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 600;
}

.player-item .player-status {
    color: #6c757d;
    font-size: 0.9rem;
}

.modal-actions {
    padding: 20px 25px;
    background: #f8f9fa;
    display: flex;
    gap: 15px;
    justify-content: flex-end;
}

.modal-btn {
    padding: 12px 25px;
    border: none;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 120px;
}

.modal-btn.cancel {
    background: #6c757d;
    color: white;
}

.modal-btn.cancel:hover {
    background: #5a6268;
    transform: translateY(-1px);
}

.modal-btn.confirm {
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    color: white;
}

.modal-btn.confirm:hover {
    background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
}
</style>
