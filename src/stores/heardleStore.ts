import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAudioPlayerStore, type Track } from './audioPlayerStore'

export interface HeardleAttempt {
  guess: string
  isCorrect: boolean
  clipDuration: number
}

export interface HeardleGameState {
  currentTrack: Track | null
  attempts: HeardleAttempt[]
  isGameOver: boolean
  hasWon: boolean
  score: number
  startTime: number
}

export interface TournamentConfig {
  playerName: string
  tournamentName: string
  totalRounds: number
}

export interface RoundResult {
  track: Track
  attempts: HeardleAttempt[]
  hasWon: boolean
  score: number
  roundTime: number
}

// Classic Heardle clip durations in seconds
const HEARDLE_CLIP_DURATIONS = [1, 2, 4, 7, 11, 16]

export const useHeardleStore = defineStore('heardle', () => {
  // State
  const currentTrack = ref<Track | null>(null)
  const attempts = ref<HeardleAttempt[]>([])
  const isGameOver = ref(false)
  const hasWon = ref(false)
  const score = ref(0)
  const startTime = ref(0)
  const isPlaying = ref(false)
  const currentClipDuration = ref(HEARDLE_CLIP_DURATIONS[0])
  const showAnswer = ref(false)
  const gameHistory = ref<HeardleGameState[]>([])
  const clipTimer = ref<number | null>(null)
  const clipInterval = ref<number | null>(null)

  // Tournament state
  const isTournamentMode = ref(false)
  const tournamentConfig = ref<TournamentConfig | null>(null)
  const currentRound = ref(0)
  const roundResults = ref<RoundResult[]>([])
  const tournamentScore = ref(0)
  const isTournamentComplete = ref(false)
  const usedTrackIds = ref<Set<string>>(new Set())
  const currentRoundCompleted = ref(false)

  // Get audio player store
  const audioStore = useAudioPlayerStore()

  // Getters
  const currentAttemptNumber = computed(() => attempts.value.length + 1)
  const maxAttempts = computed(() => HEARDLE_CLIP_DURATIONS.length)
  const canMakeGuess = computed(
    () => !isGameOver.value && currentAttemptNumber.value <= maxAttempts.value,
  )
  const remainingAttempts = computed(() => Math.max(0, maxAttempts.value - attempts.value.length))
  const currentScoreMultiplier = computed(() =>
    Math.max(1, maxAttempts.value - attempts.value.length + 1),
  )

  // Tournament getters
  const tournamentProgress = computed(() => {
    if (!isTournamentMode.value || !tournamentConfig.value) return null
    return {
      current: currentRound.value,
      total: tournamentConfig.value.totalRounds,
      percentage: (currentRound.value / tournamentConfig.value.totalRounds) * 100,
    }
  })

  const tournamentWins = computed(() => roundResults.value.filter((r) => r.hasWon).length)
  const tournamentAverageScore = computed(() => {
    if (roundResults.value.length === 0) return 0
    return Math.round(
      roundResults.value.reduce((sum, r) => sum + r.score, 0) / roundResults.value.length,
    )
  })

  const gameStats = computed(() => {
    const totalGames = gameHistory.value.length
    const wins = gameHistory.value.filter((game) => game.hasWon).length
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0
    const averageScore =
      totalGames > 0
        ? Math.round(gameHistory.value.reduce((sum, game) => sum + game.score, 0) / totalGames)
        : 0

    return {
      totalGames,
      wins,
      winRate,
      averageScore,
    }
  })

  // Actions
  const startNewGame = async (track: Track) => {
    // Save previous game to appropriate storage if it exists
    if (currentTrack.value) {
      if (isTournamentMode.value) {
        console.log('startNewGame: Previous game found in tournament mode - calling completeRound')
        // In tournament mode, save to round results
        completeRound()
      } else {
        // In regular mode, save to game history
        saveGameToHistory()
      }
    }

    // Clear any active timers
    if (clipTimer.value) {
      clearTimeout(clipTimer.value)
      clipTimer.value = null
    }
    if (clipInterval.value) {
      clearInterval(clipInterval.value)
      clipInterval.value = null
    }

    // Enable Heardle mode to prevent auto-advancement
    audioStore.setHeardleMode(true)

    // Reset game state
    currentTrack.value = track
    attempts.value = []
    isGameOver.value = false
    hasWon.value = false
    score.value = 0
    startTime.value = Date.now()
    isPlaying.value = false
    currentClipDuration.value = HEARDLE_CLIP_DURATIONS[0]
    showAnswer.value = false
    currentRoundCompleted.value = false // Reset round completion flag

    // Load the track in the audio player
    try {
      await audioStore.loadTrack(track)

      // Double-check that the track actually loaded
      if (!audioStore.hasTrack || !audioStore.currentTrack) {
        throw new Error('Track loading appeared to succeed but hasTrack is false')
      }
    } catch (error) {
      console.error('heardleStore: Failed to load track:', error)
      console.error('heardleStore: Game cannot start without loaded track')
      // Reset our state since the track didn't load
      currentTrack.value = null
      return // Don't continue if track loading failed
    }

    // Ensure the player is paused after loading (important for Heardle mode)
    await audioStore.pause()
  }

  const playClip = async () => {
    if (!currentTrack.value || !audioStore.player) {
      return
    }

    try {
      // Clear any existing timers
      if (clipTimer.value) {
        clearTimeout(clipTimer.value)
        clipTimer.value = null
      }
      if (clipInterval.value) {
        clearInterval(clipInterval.value)
        clipInterval.value = null
      }

      // First, make sure we're at the beginning
      await audioStore.seekTo(0)

      // Small delay to ensure seeking is complete
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Start playing using audioStore method
      await audioStore.play()
      isPlaying.value = true

      // Simple timeout approach - just stop after the specified duration
      clipTimer.value = window.setTimeout(async () => {
        await audioStore.pause()
        isPlaying.value = false
        clipTimer.value = null
      }, currentClipDuration.value * 1000)
    } catch (error) {
      console.error('Error playing clip:', error)
      isPlaying.value = false
    }
  }

  const stopClip = async () => {
    if (!audioStore.player) return

    try {
      // Clear both timer and interval if they exist
      if (clipTimer.value) {
        clearTimeout(clipTimer.value)
        clipTimer.value = null
      }
      if (clipInterval.value) {
        clearInterval(clipInterval.value)
        clipInterval.value = null
      }

      // Pause using audioStore method
      await audioStore.pause()
      isPlaying.value = false
    } catch (error) {
      console.error('Error stopping clip:', error)
    }
  }

  const makeGuess = (guess: string) => {
    if (!canMakeGuess.value || !currentTrack.value) return false

    const normalizedGuess = guess.toLowerCase().trim()
    const normalizedTitle = currentTrack.value.title.toLowerCase().trim()
    const normalizedArtist = currentTrack.value.artist?.toLowerCase().trim() || ''

    // Check if guess matches title or artist
    // More flexible matching for better user experience
    const isCorrect =
      normalizedGuess === normalizedTitle ||
      normalizedGuess === normalizedArtist ||
      (normalizedTitle.includes(normalizedGuess) && normalizedGuess.length > 3) ||
      (normalizedArtist.includes(normalizedGuess) && normalizedGuess.length > 3)

    const attempt: HeardleAttempt = {
      guess,
      isCorrect,
      clipDuration: currentClipDuration.value,
    }

    attempts.value.push(attempt)

    if (isCorrect) {
      // Player won! Score based on how quickly they guessed
      hasWon.value = true
      isGameOver.value = true
      // Higher score for guessing earlier: 6 points for 1st attempt, 5 for 2nd, etc.
      score.value = (maxAttempts.value - attempts.value.length + 1) * 100
      showAnswer.value = true

      console.log('Player won the round!')

      // Handle tournament round completion
      if (isTournamentMode.value) {
        console.log('Tournament mode - calling completeRound for WIN')
        completeRound()
      }
    } else if (attempts.value.length >= maxAttempts.value) {
      // No more attempts, game over
      isGameOver.value = true
      showAnswer.value = true

      console.log('Player lost the round (no more attempts)')

      // Handle tournament round completion
      if (isTournamentMode.value) {
        console.log('Tournament mode - calling completeRound for LOSS')
        completeRound()
      }
    } else {
      // Move to next clip duration
      const nextIndex = attempts.value.length
      if (nextIndex < HEARDLE_CLIP_DURATIONS.length) {
        currentClipDuration.value = HEARDLE_CLIP_DURATIONS[nextIndex]
      }
    }

    return isCorrect
  }

  const skipGuess = () => {
    if (!canMakeGuess.value) return

    const attempt: HeardleAttempt = {
      guess: '', // Empty guess for skip
      isCorrect: false,
      clipDuration: currentClipDuration.value,
    }

    attempts.value.push(attempt)

    if (attempts.value.length >= maxAttempts.value) {
      // No more attempts, game over
      isGameOver.value = true
      showAnswer.value = true

      console.log('Player skipped all attempts - game over')

      // Handle tournament round completion
      if (isTournamentMode.value) {
        console.log('Tournament mode - calling completeRound for SKIP LOSS')
        completeRound()
      }
    } else {
      // Move to next clip duration
      const nextIndex = attempts.value.length
      if (nextIndex < HEARDLE_CLIP_DURATIONS.length) {
        currentClipDuration.value = HEARDLE_CLIP_DURATIONS[nextIndex]
      }
    }
  }

  const revealAnswer = () => {
    showAnswer.value = true
    isGameOver.value = true

    // Handle tournament round completion if giving up
    if (isTournamentMode.value && !hasWon.value) {
      console.log('revealAnswer called in tournament mode - completing round')
      completeRound()
    }
  }

  const playFullSong = async () => {
    if (!currentTrack.value || !audioStore.player) return

    try {
      // Clear any active timers since we're playing the full song
      if (clipTimer.value) {
        clearTimeout(clipTimer.value)
        clipTimer.value = null
      }
      if (clipInterval.value) {
        clearInterval(clipInterval.value)
        clipInterval.value = null
      }

      // Disable Heardle mode so the song can play normally
      audioStore.setHeardleMode(false)

      isPlaying.value = false // Reset Heardle playing state

      await audioStore.seekTo(0)
      await audioStore.play()
    } catch (error) {
      console.error('Error playing full song:', error)
    }
  }

  const saveGameToHistory = () => {
    if (!currentTrack.value) return

    const gameState: HeardleGameState = {
      currentTrack: { ...currentTrack.value },
      attempts: [...attempts.value],
      isGameOver: isGameOver.value,
      hasWon: hasWon.value,
      score: score.value,
      startTime: startTime.value,
    }

    gameHistory.value.push(gameState)

    // Keep only last 100 games
    if (gameHistory.value.length > 100) {
      gameHistory.value = gameHistory.value.slice(-100)
    }
  }

  // Tournament functions
  const startTournament = (config: TournamentConfig) => {
    isTournamentMode.value = true
    tournamentConfig.value = config
    currentRound.value = 0
    roundResults.value = []
    tournamentScore.value = 0
    isTournamentComplete.value = false
    usedTrackIds.value.clear()
    currentRoundCompleted.value = false

    // Start the first round
    startNextRound()
  }

  const startNextRound = async () => {
    if (!isTournamentMode.value || !tournamentConfig.value) return

    console.log('startNextRound called:', {
      currentRound: currentRound.value,
      totalRounds: tournamentConfig.value.totalRounds,
    })

    // Check if tournament is complete
    if (currentRound.value >= tournamentConfig.value.totalRounds) {
      console.log('Tournament already complete in startNextRound')
      completeTournament()
      return
    }

    // Get a random track that hasn't been used
    const availableTracks = audioStore.playlist.filter((track) => !usedTrackIds.value.has(track.id))

    if (availableTracks.length === 0) {
      console.warn('No more available tracks for tournament')
      completeTournament()
      return
    }

    const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)]
    usedTrackIds.value.add(randomTrack.id)

    currentRound.value++
    await startNewGame(randomTrack)
  }

  const completeRound = () => {
    console.log('completeRound called with state:', {
      isTournamentMode: isTournamentMode.value,
      hasCurrentTrack: !!currentTrack.value,
      alreadyCompleted: currentRoundCompleted.value,
      currentRound: currentRound.value,
      totalRounds: tournamentConfig.value?.totalRounds,
      hasWon: hasWon.value,
      currentTrack: currentTrack.value?.title,
    })

    if (!isTournamentMode.value || !currentTrack.value) {
      console.log('completeRound: skipping - not in tournament mode or no current track')
      return
    }

    if (currentRoundCompleted.value) {
      console.log('completeRound: skipping - round already completed')
      return
    }

    console.log('completeRound: proceeding to save round result')

    // Mark this round as completed to prevent duplicate calls
    currentRoundCompleted.value = true

    // Save round result
    const roundResult: RoundResult = {
      track: { ...currentTrack.value },
      attempts: [...attempts.value],
      hasWon: hasWon.value,
      score: score.value,
      roundTime: Date.now() - startTime.value,
    }

    roundResults.value.push(roundResult)
    tournamentScore.value += score.value

    console.log('Round result saved:', roundResult)
    console.log('Total round results so far:', roundResults.value.length)

    // Check if this was the last round
    if (currentRound.value >= (tournamentConfig.value?.totalRounds || 0)) {
      console.log('Tournament complete - calling completeTournament()')
      completeTournament()
    }
  }

  const completeTournament = () => {
    isTournamentComplete.value = true
    isGameOver.value = true
    console.log('Tournament completed!', {
      rounds: roundResults.value.length,
      totalScore: tournamentScore.value,
      wins: tournamentWins.value,
      averageScore: tournamentAverageScore.value,
    })
  }

  const resetTournament = () => {
    isTournamentMode.value = false
    tournamentConfig.value = null
    currentRound.value = 0
    roundResults.value = []
    tournamentScore.value = 0
    isTournamentComplete.value = false
    usedTrackIds.value.clear()
    currentRoundCompleted.value = false

    // Also reset the current game state
    resetGame()
  }

  const resetGame = () => {
    // Save current game to history
    if (currentTrack.value) {
      saveGameToHistory()
    }

    // Clear any active timers
    if (clipTimer.value) {
      clearTimeout(clipTimer.value)
      clipTimer.value = null
    }
    if (clipInterval.value) {
      clearInterval(clipInterval.value)
      clipInterval.value = null
    }

    currentTrack.value = null
    attempts.value = []
    isGameOver.value = false
    hasWon.value = false
    score.value = 0
    startTime.value = 0
    isPlaying.value = false
    currentClipDuration.value = HEARDLE_CLIP_DURATIONS[0]
    showAnswer.value = false

    // Reset tournament state
    isTournamentMode.value = false
    tournamentConfig.value = null
    currentRound.value = 0
    roundResults.value = []
    tournamentScore.value = 0
    isTournamentComplete.value = false
    usedTrackIds.value.clear()
  }

  const getRandomTrackFromPlaylist = (): Track | null => {
    if (audioStore.playlist.length === 0) return null

    const randomIndex = Math.floor(Math.random() * audioStore.playlist.length)
    const track = audioStore.playlist[randomIndex]
    return track
  }

  const startRandomGame = async () => {
    const randomTrack = getRandomTrackFromPlaylist()
    if (randomTrack) {
      await startNewGame(randomTrack)
    } else {
      console.error(
        'No tracks available in playlist - playlist length:',
        audioStore.playlist.length,
      )
    }
  }

  return {
    // State
    currentTrack,
    attempts,
    isGameOver,
    hasWon,
    score,
    startTime,
    isPlaying,
    currentClipDuration,
    showAnswer,
    gameHistory,

    // Tournament state
    isTournamentMode,
    tournamentConfig,
    currentRound,
    roundResults,
    tournamentScore,
    isTournamentComplete,

    // Getters
    currentAttemptNumber,
    maxAttempts,
    canMakeGuess,
    remainingAttempts,
    currentScoreMultiplier,
    gameStats,
    tournamentProgress,
    tournamentWins,
    tournamentAverageScore,

    // Actions
    startNewGame,
    playClip,
    stopClip,
    makeGuess,
    skipGuess,
    revealAnswer,
    playFullSong,
    resetGame,
    getRandomTrackFromPlaylist,
    startRandomGame,
    saveGameToHistory,

    // Tournament actions
    startTournament,
    startNextRound,
    completeRound,
    completeTournament,
    resetTournament,

    // Constants
    HEARDLE_CLIP_DURATIONS,
  }
})
