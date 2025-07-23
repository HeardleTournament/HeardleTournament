// Lobby service for multiplayer functionality
// Uses localStorage for demo purposes (works locally only)

interface MultiplayerGameState {
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
  playersReady: { [playerId: string]: boolean }
  playerGuesses: {
    [playerId: string]: {
      attempts: { guess: string; isCorrect: boolean; timestamp: number }[]
      hasWon: boolean
      roundScore: number
      totalScore: number
    }
  }
}

interface LobbyData {
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

interface PlayerData {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  joinedAt: number
}

class LobbyService {
  private currentLobby: LobbyData | null = null
  private currentPlayerId: string | null = null
  private lobbies: Map<string, LobbyData> = new Map()

  constructor() {
    // Generate a unique player ID for this session
    this.currentPlayerId = this.generatePlayerId()
    // Load lobbies from localStorage for demo purposes
    this.loadLobbiesFromStorage()
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

  private loadLobbiesFromStorage(): void {
    try {
      const stored = localStorage.getItem('heardle_lobbies')
      if (stored) {
        const lobbiesData = JSON.parse(stored)
        this.lobbies = new Map(Object.entries(lobbiesData))
        console.log('Loaded lobbies from storage:', Array.from(this.lobbies.keys()))
        // Clean up old lobbies (older than 1 hour)
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        let cleanedCount = 0
        for (const [code, lobby] of this.lobbies.entries()) {
          if (lobby.createdAt < oneHourAgo) {
            this.lobbies.delete(code)
            cleanedCount++
          }
        }
        if (cleanedCount > 0) {
          console.log(`Cleaned up ${cleanedCount} old lobbies`)
          this.saveLobbiesStorage()
        }
      }
    } catch {
      console.warn('Could not load lobbies from storage')
    }
  }

  private saveLobbiesStorage(): void {
    try {
      const lobbiesObj = Object.fromEntries(this.lobbies.entries())
      localStorage.setItem('heardle_lobbies', JSON.stringify(lobbiesObj))
      console.log('Saved lobbies to storage:', Array.from(this.lobbies.keys()))
    } catch {
      console.warn('Could not save lobbies to storage')
    }
  }

  // Force reload lobbies from storage (for joining lobbies created in other sessions)
  private reloadLobbiesFromStorage(): void {
    this.loadLobbiesFromStorage()
  }

  async createLobby(
    hostName: string,
  ): Promise<{ success: boolean; lobbyCode?: string; error?: string }> {
    try {
      // Simulate network delay for realism
      await new Promise((resolve) => setTimeout(resolve, 1000))

      let lobbyCode = this.generateLobbyCode()

      // Check if lobby code already exists
      while (this.lobbies.has(lobbyCode)) {
        lobbyCode = this.generateLobbyCode()
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

      this.lobbies.set(lobbyCode, lobbyData)
      this.saveLobbiesStorage()
      this.currentLobby = lobbyData

      return { success: true, lobbyCode }
    } catch {
      return { success: false, error: 'Failed to create lobby' }
    }
  }

  async joinLobby(
    lobbyCode: string,
    playerName: string,
  ): Promise<{ success: boolean; lobby?: LobbyData; error?: string }> {
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Reload lobbies from storage to get the latest data (in case lobby was created in another session)
      this.reloadLobbiesFromStorage()
      console.log('Attempting to join lobby:', lobbyCode)
      console.log('Available lobbies:', Array.from(this.lobbies.keys()))

      // Check if the lobby exists
      const lobby = this.lobbies.get(lobbyCode)
      if (!lobby) {
        console.log('Lobby not found in available lobbies')
        return { success: false, error: 'Lobby not found' }
      }

      console.log('Found lobby:', lobby)

      if (lobby.status !== 'waiting') {
        return { success: false, error: 'Game already in progress' }
      }

      if (Object.keys(lobby.players).length >= lobby.maxPlayers) {
        return { success: false, error: 'Lobby is full' }
      }

      // Add player to lobby
      const playerData: PlayerData = {
        id: this.currentPlayerId!,
        name: playerName,
        isHost: false,
        isReady: false,
        joinedAt: Date.now(),
      }

      lobby.players[this.currentPlayerId!] = playerData
      this.lobbies.set(lobbyCode, lobby)
      this.saveLobbiesStorage()
      this.currentLobby = lobby

      console.log('Successfully joined lobby')
      return { success: true, lobby }
    } catch {
      return { success: false, error: 'Failed to join lobby' }
    }
  }

  async leaveLobby(): Promise<void> {
    if (!this.currentLobby || !this.currentPlayerId) return

    try {
      const lobby = this.currentLobby

      // Remove player from lobby
      delete lobby.players[this.currentPlayerId]

      // If host is leaving or no players left, delete the entire lobby
      if (lobby.hostId === this.currentPlayerId || Object.keys(lobby.players).length === 0) {
        this.lobbies.delete(lobby.id)
      } else {
        // Update lobby
        this.lobbies.set(lobby.id, lobby)
      }

      this.saveLobbiesStorage()
      this.currentLobby = null
    } catch {
      console.error('Error leaving lobby')
    }
  }

  getCurrentLobby(): LobbyData | null {
    return this.currentLobby
  }

  // Refresh current lobby data from storage (for real-time updates)
  refreshCurrentLobby(): LobbyData | null {
    if (this.currentLobby) {
      const freshData = this.getLobby(this.currentLobby.id)
      if (freshData) {
        this.currentLobby = freshData
      }
      return freshData
    }
    return null
  }

  getCurrentPlayerId(): string | null {
    return this.currentPlayerId
  }

  // Get lobby by code (for joining)
  getLobby(lobbyCode: string): LobbyData | null {
    // Reload from storage to get latest data
    this.reloadLobbiesFromStorage()
    return this.lobbies.get(lobbyCode) || null
  }

  // Get all available lobbies (for debugging)
  getAllLobbies(): LobbyData[] {
    this.reloadLobbiesFromStorage()
    return Array.from(this.lobbies.values())
  }

  // Debug method to check what lobbies exist
  debugLobbies(): void {
    this.reloadLobbiesFromStorage()
    console.log('Current lobbies in storage:')
    for (const [code, lobby] of this.lobbies.entries()) {
      console.log(
        `- ${code}: ${lobby.hostName}'s lobby (${Object.keys(lobby.players).length} players)`,
      )
    }
  }

  // Update lobby data (for real-time updates simulation)
  updateLobby(lobbyData: LobbyData): void {
    this.lobbies.set(lobbyData.id, lobbyData)
    this.saveLobbiesStorage()
    if (this.currentLobby?.id === lobbyData.id) {
      this.currentLobby = lobbyData
    }
  }

  // Update game settings (host only)
  async updateGameSettings(settings: {
    totalRounds?: number
    tournamentName?: string
    playlistUrl?: string
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.currentLobby || !this.currentPlayerId) {
      return { success: false, error: 'No active lobby' }
    }

    // Check if current player is host
    if (this.currentLobby.hostId !== this.currentPlayerId) {
      return { success: false, error: 'Only host can change settings' }
    }

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Get fresh lobby data from storage to ensure we have the latest player list
      const freshLobby = this.getLobby(this.currentLobby.id)
      if (!freshLobby) {
        return { success: false, error: 'Lobby not found' }
      }

      console.log('updateGameSettings - players before update:', Object.keys(freshLobby.players))

      const updatedSettings = {
        ...freshLobby.gameSettings,
        ...settings,
      }

      // Update the fresh lobby data and save it
      freshLobby.gameSettings = updatedSettings
      this.currentLobby = freshLobby
      this.lobbies.set(freshLobby.id, freshLobby)
      this.saveLobbiesStorage()

      console.log('updateGameSettings - players after update:', Object.keys(freshLobby.players))
      console.log('Host updated game settings:', updatedSettings)

      return { success: true }
    } catch {
      return { success: false, error: 'Failed to update settings' }
    }
  }

  // Get available playlist options for dropdown
  getPlaylistOptions(): Array<{ value: string; label: string }> {
    return [
      { value: '', label: 'Default Playlist' },
      { value: 'pop-hits', label: 'Pop Hits' },
      { value: 'rock-classics', label: 'Rock Classics' },
      { value: '80s-90s', label: '80s & 90s' },
      { value: 'indie-alternative', label: 'Indie & Alternative' },
      { value: 'hip-hop-rap', label: 'Hip-Hop & Rap' },
      { value: 'electronic-dance', label: 'Electronic & Dance' },
      { value: 'country', label: 'Country' },
      { value: 'r-b-soul', label: 'R&B & Soul' },
      { value: 'custom', label: 'Custom Playlist URL' },
    ]
  }

  // Clean up old lobbies (called periodically)
  cleanupOldLobbies(): void {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000 // 1 hour in milliseconds

    for (const [lobbyCode, lobby] of this.lobbies.entries()) {
      if (lobby.createdAt < oneHourAgo) {
        this.lobbies.delete(lobbyCode)
      }
    }
    this.saveLobbiesStorage()
  }

  // Start multiplayer game (host only)
  async startGame(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentLobby || !this.currentPlayerId) {
      return { success: false, error: 'No active lobby' }
    }

    if (this.currentLobby.hostId !== this.currentPlayerId) {
      return { success: false, error: 'Only host can start game' }
    }

    try {
      // Get fresh lobby data from storage to ensure we have the latest player list
      const freshLobby = this.getLobby(this.currentLobby.id)
      if (!freshLobby) {
        return { success: false, error: 'Lobby not found' }
      }

      // Check if all players are ready
      const allReady = Object.values(freshLobby.players).every(
        (player) => player.isReady || player.isHost,
      )
      if (!allReady) {
        return { success: false, error: 'Not all players are ready' }
      }

      // Initialize game state
      const gameState: MultiplayerGameState = {
        currentRound: 1,
        currentTrack: null,
        currentAttempt: 0,
        maxAttempts: 6,
        clipDurations: [1, 2, 4, 7, 11, 16],
        currentClipDuration: 1,
        isRoundActive: false,
        roundStartTime: 0,
        roundEndTime: null,
        playersReady: {},
        playerGuesses: {},
      }

      // Initialize player states
      Object.keys(freshLobby.players).forEach((playerId) => {
        gameState.playersReady[playerId] = false
        gameState.playerGuesses[playerId] = {
          attempts: [],
          hasWon: false,
          roundScore: 0,
          totalScore: 0,
        }
      })

      freshLobby.status = 'playing'
      freshLobby.gameState = gameState
      this.currentLobby = freshLobby
      this.lobbies.set(freshLobby.id, freshLobby)
      this.saveLobbiesStorage()

      return { success: true }
    } catch {
      return { success: false, error: 'Failed to start game' }
    }
  }

  // Update player ready status for game
  async updatePlayerReady(isReady: boolean): Promise<{ success: boolean; error?: string }> {
    if (!this.currentLobby || !this.currentPlayerId) {
      return { success: false, error: 'No active lobby' }
    }

    try {
      // Get fresh lobby data from storage to ensure we have the latest player list
      const freshLobby = this.getLobby(this.currentLobby.id)
      if (!freshLobby) {
        return { success: false, error: 'Lobby not found' }
      }

      if (freshLobby.players[this.currentPlayerId]) {
        freshLobby.players[this.currentPlayerId].isReady = isReady
        this.currentLobby = freshLobby
        this.lobbies.set(freshLobby.id, freshLobby)
        this.saveLobbiesStorage()
        return { success: true }
      }
      return { success: false, error: 'Player not found' }
    } catch {
      return { success: false, error: 'Failed to update ready status' }
    }
  }

  // Submit player guess
  async submitGuess(
    guess: string,
    isCorrect: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentLobby || !this.currentPlayerId || !this.currentLobby.gameState) {
      return { success: false, error: 'No active game' }
    }

    try {
      const gameState = this.currentLobby.gameState
      const playerState = gameState.playerGuesses[this.currentPlayerId]

      if (!playerState) {
        return { success: false, error: 'Player not found in game' }
      }

      // Add the attempt
      playerState.attempts.push({
        guess,
        isCorrect,
        timestamp: Date.now(),
      })

      if (isCorrect) {
        playerState.hasWon = true
        // Calculate score based on attempt number
        const attemptNumber = playerState.attempts.length
        const baseScore = 1000
        const multiplier = Math.max(1, 7 - attemptNumber) // Higher score for fewer attempts
        playerState.roundScore = baseScore * multiplier
        playerState.totalScore += playerState.roundScore
      }

      this.lobbies.set(this.currentLobby.id, this.currentLobby)
      this.saveLobbiesStorage()

      return { success: true }
    } catch {
      return { success: false, error: 'Failed to submit guess' }
    }
  }

  // Update game state (host only)
  async updateGameState(
    updates: Partial<MultiplayerGameState>,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentLobby || !this.currentPlayerId || !this.currentLobby.gameState) {
      return { success: false, error: 'No active game' }
    }

    if (this.currentLobby.hostId !== this.currentPlayerId) {
      return { success: false, error: 'Only host can update game state' }
    }

    try {
      Object.assign(this.currentLobby.gameState, updates)
      this.lobbies.set(this.currentLobby.id, this.currentLobby)
      this.saveLobbiesStorage()
      return { success: true }
    } catch {
      return { success: false, error: 'Failed to update game state' }
    }
  }
}

export const lobbyService = new LobbyService()
export type { LobbyData, PlayerData, MultiplayerGameState }
