// Firebase-based lobby service for multiplayer functionality
import { database } from '@/config/firebase'
import { ref, set, get, onValue, remove, update, child } from 'firebase/database'

export interface MultiplayerGameState {
  currentRound: number
  currentTrack: {
    id: string
    title: string
    artist?: string
    youtubeId: string
  } | null
  currentAttempt: number
  maxAttempts: number
  clipDurations: number[]
  currentClipDuration: number
  isRoundActive: boolean
  roundStartTime: number
  roundEndTime: number | null
  usedTracks: string[] // Track IDs that have been used
  playersReady: { [playerId: string]: boolean }
  playerGuesses: {
    [playerId: string]: {
      attempts: { guess: string; isCorrect: boolean; timestamp: number }[]
      hasWon: boolean
      hasLost: boolean
      roundScore: number
      totalScore: number
      roundsWon: number
    }
  }
}

export interface PlayerData {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  joinedAt: number
}

export interface LobbyData {
  id: string
  hostId: string
  hostName: string
  players: { [playerId: string]: PlayerData }
  gameSettings: {
    totalRounds: number
    playlistUrl: string
    tournamentName: string
  }
  status: 'waiting' | 'playing' | 'finished'
  createdAt: number
  maxPlayers: number
  gameState?: MultiplayerGameState
}

class FirebaseLobbyService {
  private currentLobby: LobbyData | null = null
  private currentPlayerId: string | null = null
  private lobbyListeners: { [path: string]: () => void } = {}

  constructor() {
    // Generate a unique player ID for this session
    this.currentPlayerId = this.generatePlayerId()
    console.log('Firebase Lobby Service initialized with player ID:', this.currentPlayerId)
  }

  private generatePlayerId(): string {
    return 'player_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  private generateLobbyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private cleanupOldLobbies(): void {
    // Clean up lobbies older than 2 hours
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    const lobbiesRef = ref(database, 'lobbies')

    get(lobbiesRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const lobbies = snapshot.val()
          const updates: { [key: string]: null } = {}

          Object.keys(lobbies).forEach((lobbyId) => {
            const lobby = lobbies[lobbyId]
            if (lobby.createdAt < twoHoursAgo) {
              updates[`lobbies/${lobbyId}`] = null
            }
          })

          if (Object.keys(updates).length > 0) {
            update(ref(database), updates)
            console.log(`Cleaned up ${Object.keys(updates).length} old lobbies`)
          }
        }
      })
      .catch((error) => {
        console.warn('Could not clean up old lobbies:', error)
      })
  }

  async createLobby(
    hostName: string,
  ): Promise<{ success: boolean; lobbyCode?: string; error?: string }> {
    try {
      // Clean up old lobbies first
      this.cleanupOldLobbies()

      let lobbyCode = this.generateLobbyCode()
      const lobbiesRef = ref(database, 'lobbies')

      // Check if lobby code already exists
      let codeExists = true
      while (codeExists) {
        const lobbyRef = child(lobbiesRef, lobbyCode)
        const snapshot = await get(lobbyRef)
        if (!snapshot.exists()) {
          codeExists = false
        } else {
          lobbyCode = this.generateLobbyCode()
        }
      }

      const lobbyData: LobbyData = {
        id: lobbyCode,
        hostId: this.currentPlayerId!,
        hostName: hostName,
        players: {
          [this.currentPlayerId!]: {
            id: this.currentPlayerId!,
            name: hostName,
            isHost: true,
            isReady: false,
            joinedAt: Date.now(),
          },
        },
        gameSettings: {
          totalRounds: 5,
          playlistUrl: '',
          tournamentName: `${hostName}'s Tournament`,
        },
        status: 'waiting',
        createdAt: Date.now(),
        maxPlayers: 8,
      }

      // Save lobby to Firebase
      const lobbyRef = ref(database, `lobbies/${lobbyCode}`)
      await set(lobbyRef, lobbyData)

      this.currentLobby = lobbyData
      console.log('Lobby created successfully:', lobbyCode)

      return { success: true, lobbyCode }
    } catch (error) {
      console.error('Error creating lobby:', error)
      return { success: false, error: 'Failed to create lobby' }
    }
  }

  async joinLobby(
    lobbyCode: string,
    playerName: string,
  ): Promise<{ success: boolean; lobby?: LobbyData; error?: string }> {
    try {
      console.log('Attempting to join lobby:', lobbyCode)

      const lobbyRef = ref(database, `lobbies/${lobbyCode}`)
      const snapshot = await get(lobbyRef)

      if (!snapshot.exists()) {
        console.log('Lobby not found:', lobbyCode)
        return { success: false, error: 'Lobby not found' }
      }

      const lobby: LobbyData = snapshot.val()
      console.log('Found lobby:', lobby)

      if (lobby.status !== 'waiting') {
        return { success: false, error: 'Game already in progress' }
      }

      if (Object.keys(lobby.players).length >= lobby.maxPlayers) {
        return { success: false, error: 'Lobby is full' }
      }

      // Check if player is already in the lobby
      if (lobby.players[this.currentPlayerId!]) {
        console.log('Player already in lobby, rejoining')
        this.currentLobby = lobby
        return { success: true, lobby }
      }

      // Add player to lobby
      const playerData: PlayerData = {
        id: this.currentPlayerId!,
        name: playerName,
        isHost: false,
        isReady: false,
        joinedAt: Date.now(),
      }

      const playerRef = ref(database, `lobbies/${lobbyCode}/players/${this.currentPlayerId}`)
      await set(playerRef, playerData)

      lobby.players[this.currentPlayerId!] = playerData
      this.currentLobby = lobby

      console.log('Successfully joined lobby')
      return { success: true, lobby }
    } catch (error) {
      console.error('Error joining lobby:', error)
      return { success: false, error: 'Failed to join lobby' }
    }
  }

  async leaveLobby(): Promise<void> {
    if (!this.currentLobby || !this.currentPlayerId) return

    try {
      const lobbyCode = this.currentLobby.id
      const lobbyRef = ref(database, `lobbies/${lobbyCode}`)

      // Remove player from lobby
      const playerRef = ref(database, `lobbies/${lobbyCode}/players/${this.currentPlayerId}`)
      await remove(playerRef)

      // If host is leaving, delete the entire lobby
      if (this.currentLobby.hostId === this.currentPlayerId) {
        await remove(lobbyRef)
        console.log('Host left, lobby deleted')
      } else {
        // Check if lobby is empty and delete if so
        const snapshot = await get(ref(database, `lobbies/${lobbyCode}/players`))
        if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
          await remove(lobbyRef)
          console.log('Last player left, lobby deleted')
        }
      }

      // Remove all listeners
      this.removeAllListeners()
      this.currentLobby = null
    } catch (error) {
      console.error('Error leaving lobby:', error)
    }
  }

  // Set up real-time listeners for lobby updates
  listenToLobby(lobbyCode: string, callback: (lobby: LobbyData | null) => void): void {
    const lobbyRef = ref(database, `lobbies/${lobbyCode}`)

    const unsubscribe = onValue(
      lobbyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const lobby: LobbyData = snapshot.val()
          this.currentLobby = lobby
          callback(lobby)
        } else {
          // Lobby was deleted
          callback(null)
        }
      },
      (error) => {
        console.error('Error listening to lobby:', error)
        callback(null)
      },
    )

    this.lobbyListeners[`lobby_${lobbyCode}`] = unsubscribe
  }

  // Update lobby settings (host only)
  async updateLobbySettings(settings: Partial<LobbyData['gameSettings']>): Promise<boolean> {
    if (!this.currentLobby || this.currentLobby.hostId !== this.currentPlayerId) {
      return false
    }

    try {
      const settingsRef = ref(database, `lobbies/${this.currentLobby.id}/gameSettings`)
      await update(settingsRef, settings)
      return true
    } catch (error) {
      console.error('Error updating lobby settings:', error)
      return false
    }
  }

  // Update player ready status
  async setPlayerReady(isReady: boolean): Promise<boolean> {
    if (!this.currentLobby || !this.currentPlayerId) {
      return false
    }

    try {
      const playerRef = ref(
        database,
        `lobbies/${this.currentLobby.id}/players/${this.currentPlayerId}/isReady`,
      )
      await set(playerRef, isReady)
      return true
    } catch (error) {
      console.error('Error setting player ready:', error)
      return false
    }
  }

  // Start game (host only)
  async startGame(): Promise<boolean> {
    if (!this.currentLobby || this.currentLobby.hostId !== this.currentPlayerId) {
      return false
    }

    try {
      const updates: { [key: string]: unknown } = {}
      updates[`lobbies/${this.currentLobby.id}/status`] = 'playing'

      // Initialize game state
      const initialGameState: MultiplayerGameState = {
        currentRound: 1,
        currentTrack: null,
        currentAttempt: 0,
        maxAttempts: 6,
        clipDurations: [1, 2, 4, 7, 11, 16],
        currentClipDuration: 1,
        isRoundActive: false,
        roundStartTime: 0,
        roundEndTime: null,
        usedTracks: [],
        playersReady: {},
        playerGuesses: {},
      }

      // Initialize player guesses for all players
      Object.keys(this.currentLobby.players).forEach((playerId) => {
        initialGameState.playerGuesses[playerId] = {
          attempts: [],
          hasWon: false,
          hasLost: false,
          roundScore: 0,
          totalScore: 0,
          roundsWon: 0,
        }
      })

      updates[`lobbies/${this.currentLobby.id}/gameState`] = initialGameState

      await update(ref(database), updates)
      return true
    } catch (error) {
      console.error('Error starting game:', error)
      return false
    }
  }

  // Update game state (host only)
  async updateGameState(
    gameStateUpdate: Partial<MultiplayerGameState>,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentLobby || this.currentLobby.hostId !== this.currentPlayerId) {
      return { success: false, error: 'Only host can update game state' }
    }

    try {
      const gameStateRef = ref(database, `lobbies/${this.currentLobby.id}/gameState`)
      await update(gameStateRef, gameStateUpdate)
      return { success: true }
    } catch (error) {
      console.error('Error updating game state:', error)
      return { success: false, error: 'Failed to update game state' }
    }
  }

  // Submit a guess for the current player
  async submitGuess(
    guess: string,
    isCorrect: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentLobby || !this.currentPlayerId) {
      return { success: false, error: 'No active lobby or player ID' }
    }

    try {
      const timestamp = Date.now()
      const attempt = { guess, isCorrect, timestamp }

      // Get current game state
      const gameStateRef = ref(database, `lobbies/${this.currentLobby.id}/gameState`)
      const snapshot = await get(gameStateRef)

      if (!snapshot.exists()) {
        return { success: false, error: 'Game state not found' }
      }

      const gameState = snapshot.val() as MultiplayerGameState

      // Ensure playerGuesses object exists
      if (!gameState.playerGuesses) {
        gameState.playerGuesses = {}
      }

      // Ensure this specific player's data exists
      if (!gameState.playerGuesses[this.currentPlayerId]) {
        gameState.playerGuesses[this.currentPlayerId] = {
          attempts: [],
          hasWon: false,
          hasLost: false,
          roundScore: 0,
          totalScore: 0,
          roundsWon: 0,
        }
      }

      // Get a direct reference to the player's data
      let playerGuesses = gameState.playerGuesses[this.currentPlayerId]

      // Additional safety check - if playerGuesses is still undefined, recreate it
      if (!playerGuesses) {
        console.error(
          'CRITICAL: playerGuesses is undefined after initialization! Player ID:',
          this.currentPlayerId,
        )
        console.log(
          'Available player IDs in gameState:',
          Object.keys(gameState.playerGuesses || {}),
        )
        gameState.playerGuesses[this.currentPlayerId] = {
          attempts: [],
          hasWon: false,
          hasLost: false,
          roundScore: 0,
          totalScore: 0,
          roundsWon: 0,
        }
        playerGuesses = gameState.playerGuesses[this.currentPlayerId]
      }

      // Final safety check for attempts array
      if (!playerGuesses.attempts) {
        console.warn('Attempts array is missing, recreating it')
        playerGuesses.attempts = []
      }

      // Add the new attempt
      playerGuesses.attempts.push(attempt)

      // Update player status based on guess result
      if (isCorrect) {
        playerGuesses.hasWon = true
        playerGuesses.roundScore = this.calculateRoundScore(playerGuesses.attempts.length)
        playerGuesses.totalScore += playerGuesses.roundScore
        playerGuesses.roundsWon += 1
      } else if (playerGuesses.attempts.length >= gameState.maxAttempts) {
        playerGuesses.hasLost = true
        playerGuesses.roundScore = 0
      }

      // Update the specific player's guess data
      const updates: { [key: string]: unknown } = {}
      updates[`lobbies/${this.currentLobby.id}/gameState/playerGuesses/${this.currentPlayerId}`] =
        playerGuesses

      await update(ref(database), updates)
      return { success: true }
    } catch (error) {
      console.error('Error submitting guess:', error)
      return { success: false, error: 'Failed to submit guess' }
    }
  }

  // Calculate round score based on number of attempts
  private calculateRoundScore(attemptCount: number): number {
    const maxScore = 1000
    const scorePerAttempt = Math.floor(maxScore / 6) // 6 max attempts
    return Math.max(100, maxScore - (attemptCount - 1) * scorePerAttempt)
  }

  // Finish the tournament (host only)
  async finishTournament(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentLobby || this.currentLobby.hostId !== this.currentPlayerId) {
      return { success: false, error: 'Only host can finish tournament' }
    }

    try {
      const statusRef = ref(database, `lobbies/${this.currentLobby.id}/status`)
      await set(statusRef, 'finished')
      return { success: true }
    } catch (error) {
      console.error('Error finishing tournament:', error)
      return { success: false, error: 'Failed to finish tournament' }
    }
  }

  // Listen to game state changes
  listenToGameState(
    lobbyCode: string,
    callback: (gameState: MultiplayerGameState | null) => void,
  ): void {
    const gameStateRef = ref(database, `lobbies/${lobbyCode}/gameState`)

    const unsubscribe = onValue(
      gameStateRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const gameState: MultiplayerGameState = snapshot.val()
          callback(gameState)
        } else {
          callback(null)
        }
      },
      (error) => {
        console.error('Error listening to game state:', error)
        callback(null)
      },
    )

    this.lobbyListeners[`gameState_${lobbyCode}`] = unsubscribe
  }

  getCurrentLobby(): LobbyData | null {
    return this.currentLobby
  }

  getCurrentPlayerId(): string | null {
    return this.currentPlayerId
  }

  // Remove all listeners
  removeAllListeners(): void {
    Object.values(this.lobbyListeners).forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    })
    this.lobbyListeners = {}
  }

  // Cleanup on page unload
  cleanup(): void {
    this.removeAllListeners()
    // Note: We don't automatically leave the lobby here to allow reconnection
  }
}

// Create and export a singleton instance
export const firebaseLobbyService = new FirebaseLobbyService()

// Clean up listeners when the page unloads
window.addEventListener('beforeunload', () => {
  firebaseLobbyService.cleanup()
})
