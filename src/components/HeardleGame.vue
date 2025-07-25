<template>
  <div class="heardle-game">
    <!-- Game Header -->
    <div class="game-header">
      <div class="game-header">
        <!-- Tournament Progress (if in tournament mode) -->
        <div v-if="heardleStore.isTournamentMode && heardleStore.tournamentConfig" class="tournament-info">
          <h2>🏆 {{ heardleStore.tournamentConfig.tournamentName }}</h2>
          <div class="tournament-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${heardleStore.tournamentProgress?.percentage || 0}%` }">
              </div>
            </div>
            <div class="progress-text">
              Round {{ heardleStore.currentRound }} of {{ heardleStore.tournamentConfig.totalRounds }}
            </div>
          </div>
          <div class="tournament-stats">
            <div class="tournament-stat">
              <span class="stat-label">Player:</span>
              <span class="stat-value">{{ heardleStore.tournamentConfig.playerName }}</span>
            </div>
            <div class="tournament-stat">
              <span class="stat-label">Tournament Score:</span>
              <span class="stat-value">{{ heardleStore.tournamentScore }}</span>
            </div>
            <div class="tournament-stat">
              <span class="stat-label">Wins:</span>
              <span class="stat-value">{{ heardleStore.tournamentWins }}/{{ heardleStore.roundResults.length }}</span>
            </div>
          </div>
        </div>

        <!-- Regular Game Header (if not in tournament mode) -->
        <h2 v-else>🎵 Heardle Game</h2>

        <div class="game-stats">
          <div class="stat">
            <span class="stat-label">Attempt:</span>
            <span class="stat-value">{{ heardleStore.currentAttemptNumber }}/{{ heardleStore.maxAttempts }}</span>
          </div>
          <div class="stat" v-if="heardleStore.score > 0">
            <span class="stat-label">Score:</span>
            <span class="stat-value">{{ heardleStore.score }}</span>
          </div>
        </div>
      </div>

      <!-- Game Status -->
      <div v-if="!heardleStore.currentTrack" class="game-status">
        <div class="single-player-status">
          <p>Ready to start a new game?</p>

          <button @click="startRandomGame" class="start-btn"
            :disabled="!audioStore.hasPlaylist || !audioStore.isPlayerReady">
            🎲 Start Random Game
          </button>
          <p v-if="!audioStore.hasPlaylist" class="no-playlist">
            No playlist loaded. Please wait for tracks to load.
          </p>
          <p v-else-if="!audioStore.isPlayerReady" class="no-playlist">
            Audio player initializing...
          </p>
        </div>
      </div> <!-- Active Game -->
      <div v-else class="active-game">
        <!-- Clip Duration Display -->
        <div class="clip-info">
          <div class="clip-duration">
            <span class="duration-label">Current clip length:</span>
            <span class="duration-value">{{ heardleStore.currentClipDuration }}s</span>
          </div>
          <div class="attempts-display">
            <div v-for="(duration, index) in heardleStore.HEARDLE_CLIP_DURATIONS" :key="index" class="attempt-dot"
              :class="{
                'completed': index < heardleStore.attempts.length,
                'current': index === heardleStore.attempts.length && !heardleStore.isGameOver,
                'correct': index < heardleStore.attempts.length && heardleStore.attempts[index]?.isCorrect,
                'skipped': index < heardleStore.attempts.length && heardleStore.attempts[index]?.guess === ''
              }">
              {{ duration }}s
            </div>
          </div>
        </div>

        <!-- Play Controls -->
        <div class="play-controls">
          <button @click="playClip" :disabled="heardleStore.isPlaying || heardleStore.isGameOver" class="play-clip-btn">
            <span v-if="heardleStore.isPlaying">🔄 Playing...</span>
            <span v-else>▶️ Play {{ heardleStore.currentClipDuration }}s</span>
          </button>

          <button v-if="heardleStore.isPlaying" @click="stopClip" class="stop-clip-btn">
            ⏹️ Stop
          </button>
        </div>

        <!-- Volume Control -->
        <div class="volume-control">
          <div class="volume-container">
            <button @click="audioStore.toggleMute()" class="volume-btn" :title="audioStore.isMuted ? 'Unmute' : 'Mute'">
              <span v-if="audioStore.isMuted">🔇</span>
              <span v-else-if="audioStore.volume === 0">🔈</span>
              <span v-else-if="audioStore.volume < 50">🔉</span>
              <span v-else>🔊</span>
            </button>
            <input type="range" min="0" max="100" v-model="audioStore.volume" @input="updateVolume"
              class="volume-slider" :disabled="audioStore.isMuted" />
            <span class="volume-display">{{ audioStore.volume }}%</span>
          </div>
        </div>

        <!-- Guess Input -->
        <div v-if="!heardleStore.isGameOver" class="guess-section">
          <SmartGuessInput v-model="currentGuess" @submit="submitGuess" :disabled="!heardleStore.canMakeGuess"
            placeholder="Type to search for a song or artist..." submit-text="Guess" />

          <div class="action-buttons">
            <button @click="skipAttempt" :disabled="!heardleStore.canMakeGuess" class="skip-btn">
              Skip (+{{ heardleStore.HEARDLE_CLIP_DURATIONS[heardleStore.attempts.length + 1] || 'reveal' }}s)
            </button>

            <button @click="giveUp" class="give-up-btn">
              Give Up
            </button>
          </div>
        </div>

        <!-- Previous Attempts -->
        <div v-if="heardleStore.attempts.length > 0" class="attempts-history">
          <h4>Previous Attempts:</h4>
          <div class="attempts-list">
            <div v-for="(attempt, index) in heardleStore.attempts" :key="index" class="attempt-item"
              :class="{ 'correct': attempt.isCorrect, 'skipped': attempt.guess === '' }">
              <span class="attempt-number">{{ index + 1 }}.</span>
              <span class="attempt-guess">
                {{ attempt.guess || 'Skipped' }}
              </span>
              <span class="attempt-result">
                {{ attempt.isCorrect ? '✅' : attempt.guess === '' ? '⏭️' : '❌' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Game Over / Answer Reveal -->
        <div v-if="heardleStore.isGameOver || heardleStore.showAnswer" class="game-result">
          <div class="result-header">
            <h3 v-if="heardleStore.hasWon" class="win-message">
              🎉 Congratulations! You got it!
            </h3>
            <h3 v-else class="lose-message">
              😔 Better luck next time!
            </h3>
          </div>

          <div class="answer-reveal">
            <div class="track-info">
              <h4 class="track-title">{{ heardleStore.currentTrack?.title }}</h4>
              <p v-if="heardleStore.currentTrack?.artist" class="track-artist">
                by {{ heardleStore.currentTrack.artist }}
              </p>
            </div>

            <div class="final-score" v-if="heardleStore.hasWon">
              <span class="score-label">Final Score:</span>
              <span class="score-value">{{ heardleStore.score }} points</span>
              <span class="score-multiplier">({{ heardleStore.currentScoreMultiplier }}x multiplier)</span>
            </div>
          </div>

          <div class="end-game-actions">
            <button @click="playFullSong" class="play-full-btn">
              🎵 Play Full Song
            </button>

            <!-- Tournament Actions -->
            <div v-if="heardleStore.isTournamentMode" class="tournament-actions">
              <button
                v-if="!heardleStore.isTournamentComplete && heardleStore.currentRound < (heardleStore.tournamentConfig?.totalRounds || 0)"
                @click="nextTournamentRound" class="next-round-btn">
                ⏭️ Next Round ({{ heardleStore.currentRound + 1 }}/{{ heardleStore.tournamentConfig?.totalRounds }})
              </button>
              <button
                v-else-if="heardleStore.isTournamentComplete || heardleStore.currentRound >= (heardleStore.tournamentConfig?.totalRounds || 0)"
                @click="completeTournament" class="tournament-complete-btn">
                🏆 View Tournament Results
              </button>
            </div>

            <!-- Non-Tournament Actions -->
            <div v-else class="single-game-actions">
              <button @click="startRandomGame" class="new-game-btn">
                🎲 New Random Game
              </button>
            </div>
          </div>

          <!-- YouTube Video Player -->
          <div v-if="showVideoPlayer && heardleStore.currentTrack" class="video-player-section">
            <div class="video-info">
              <h4 class="video-title">{{ heardleStore.currentTrack.title }}</h4>
              <p v-if="heardleStore.currentTrack.artist" class="video-artist">by {{ heardleStore.currentTrack.artist }}
              </p>
            </div>
            <div class="video-wrapper">
              <iframe
                :src="`https://www.youtube.com/embed/${heardleStore.currentTrack.videoId}?autoplay=1&controls=1&rel=0&modestbranding=1`"
                frameborder="0" allowfullscreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                class="youtube-iframe">
              </iframe>
            </div>
          </div>
        </div>
      </div>

      <!-- Game Statistics -->
      <div v-if="heardleStore.gameStats.totalGames > 0" class="game-statistics">
        <h4>📊 Your Statistics</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">{{ heardleStore.gameStats.totalGames }}</span>
            <span class="stat-description">Games Played</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ heardleStore.gameStats.winRate }}%</span>
            <span class="stat-description">Win Rate</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ heardleStore.gameStats.averageScore }}</span>
            <span class="stat-description">Avg Score</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useHeardleStore } from '@/stores/heardleStore'
import { useAudioPlayerStore } from '@/stores/audioPlayerStore'
import SmartGuessInput from './SmartGuessInput.vue'

const router = useRouter()
const heardleStore = useHeardleStore()
const audioStore = useAudioPlayerStore()

const currentGuess = ref('')
const showVideoPlayer = ref(false)

onMounted(() => {

})

onBeforeUnmount(() => {

})

const playClip = async () => {
  // Prime the player for autoplay if user hasn't interacted yet
  if (!audioStore.userInteracted) {

    await audioStore.primePlayerForAutoplay()
  }

  await heardleStore.playClip()
}

const stopClip = async () => {
  await heardleStore.stopClip()
}

const updateVolume = () => {
  audioStore.setVolume(audioStore.volume)
}

const submitGuess = (guess?: string) => {
  const guessToSubmit = guess || currentGuess.value.trim()
  if (!guessToSubmit) return

  heardleStore.makeGuess(guessToSubmit)
  currentGuess.value = ''
}

const skipAttempt = () => {
  heardleStore.skipGuess()
}

const giveUp = () => {
  heardleStore.revealAnswer()
}

const startRandomGame = async () => {
  showVideoPlayer.value = false
  await heardleStore.startRandomGame()
  currentGuess.value = ''
}

const playFullSong = async () => {
  // Stop the audio player to avoid double playback
  await audioStore.pause()

  // Show the video player (iframe will autoplay)
  showVideoPlayer.value = true
}

// Tournament methods
const nextTournamentRound = async () => {
  showVideoPlayer.value = false
  currentGuess.value = ''
  await heardleStore.startNextRound()
}

const completeTournament = () => {
  console.log('completeTournament called, current tournament state:', {
    isTournamentMode: heardleStore.isTournamentMode,
    isTournamentComplete: heardleStore.isTournamentComplete,
    currentRound: heardleStore.currentRound,
    totalRounds: heardleStore.tournamentConfig?.totalRounds,
    roundResults: heardleStore.roundResults.length
  })

  // Complete the tournament in the store
  heardleStore.completeTournament()

  console.log('After completeTournament, state:', {
    isTournamentComplete: heardleStore.isTournamentComplete,
    roundResults: heardleStore.roundResults.length
  })

  // Add a small delay to ensure state is updated before navigation
  setTimeout(() => {
    router.push('/results')
  }, 100)
}
</script>

<style scoped>
.heardle-game {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.game-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.game-header h2 {
  margin: 0 0 15px 0;
  font-size: 2em;
}

.game-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.9em;
  opacity: 0.8;
}

.stat-value {
  font-size: 1.2em;
  font-weight: bold;
}

.game-status {
  text-align: center;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.start-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background 0.2s;
}

.start-btn:hover:not(:disabled) {
  background: #218838;
}

.start-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.no-playlist {
  color: #6c757d;
  font-style: italic;
  margin-top: 10px;
}

.active-game {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.clip-info {
  text-align: center;
  margin-bottom: 20px;
}

.clip-duration {
  margin-bottom: 15px;
}

.duration-label {
  font-size: 0.9em;
  color: #6c757d;
}

.duration-value {
  font-size: 1.3em;
  font-weight: bold;
  color: #007bff;
  margin-left: 10px;
}

.attempts-display {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.attempt-dot {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  font-weight: bold;
  border: 2px solid #dee2e6;
  background: #f8f9fa;
  transition: all 0.3s;
}

.attempt-dot.current {
  border-color: #007bff;
  background: #e7f3ff;
  color: #007bff;
}

.attempt-dot.completed {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.attempt-dot.correct {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.attempt-dot.skipped {
  background: #ffc107;
  color: #212529;
  border-color: #ffc107;
}

.play-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 30px;
}

.play-clip-btn,
.stop-clip-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.2s;
}

.play-clip-btn:hover:not(:disabled),
.stop-clip-btn:hover {
  background: #0056b3;
}

.play-clip-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.stop-clip-btn {
  background: #dc3545;
}

.stop-clip-btn:hover {
  background: #c82333;
}

.volume-control {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.volume-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.volume-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.2em;
}

.volume-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.volume-slider {
  width: 120px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.volume-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.volume-display {
  font-size: 0.9em;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  min-width: 35px;
  text-align: center;
}

.guess-section {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.skip-btn,
.give-up-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.skip-btn:hover:not(:disabled) {
  background: #5a6268;
}

.give-up-btn {
  background: #dc3545;
}

.give-up-btn:hover {
  background: #c82333;
}

.attempts-history {
  margin-bottom: 20px;
}

.attempts-history h4 {
  margin: 0 0 10px 0;
  color: #495057;
}

.attempts-list {
  background: #ffffff;
  border-radius: 6px;
  padding: 15px;
  border: 1px solid #e9ecef;
}

.attempt-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #dee2e6;
}

.attempt-item:last-child {
  border-bottom: none;
}

.attempt-number {
  font-weight: bold;
  margin-right: 10px;
  min-width: 20px;
  color: #495057;
}

.attempt-guess {
  flex: 1;
  margin-right: 10px;
  color: #2c3e50;
}

.attempt-result {
  color: #495057;
}

.attempt-item.correct .attempt-guess {
  color: #28a745;
  font-weight: bold;
}

.attempt-item.skipped .attempt-guess {
  color: #6c757d;
  font-style: italic;
}

.game-result {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.win-message {
  color: #28a745;
  margin: 0 0 20px 0;
}

.lose-message {
  color: #dc3545;
  margin: 0 0 20px 0;
}

.answer-reveal {
  margin-bottom: 20px;
}

.track-title {
  font-size: 1.3em;
  margin: 0 0 5px 0;
  color: #495057;
}

.track-artist {
  margin: 0 0 15px 0;
  color: #6c757d;
  font-style: italic;
}

.final-score {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin: 15px 0;
}

.score-value {
  font-size: 1.5em;
  font-weight: bold;
  color: #28a745;
}

.score-multiplier {
  font-size: 0.9em;
  color: #6c757d;
}

.end-game-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.tournament-actions,
.single-game-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.play-full-btn,
.new-game-btn,
.next-round-btn,
.tournament-complete-btn {
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  font-weight: 500;
  color: white;
}

.play-full-btn {
  background: #007bff;
}

.play-full-btn:hover {
  background: #0056b3;
}

.new-game-btn {
  background: #28a745;
}

.new-game-btn:hover {
  background: #218838;
}

.next-round-btn {
  background: #17a2b8;
}

.next-round-btn:hover {
  background: #138496;
}

.tournament-complete-btn {
  background: #ffc107;
  color: #212529;
}

.tournament-complete-btn:hover {
  background: #e0a800;
}

.game-statistics {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.game-statistics h4 {
  text-align: center;
  margin: 0 0 15px 0;
  color: #495057;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-number {
  display: block;
  font-size: 1.5em;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
}

.stat-description {
  font-size: 0.9em;
  color: #6c757d;
}

@media (max-width: 600px) {
  .heardle-game {
    padding: 15px;
  }

  .game-stats {
    flex-direction: column;
    gap: 15px;
  }

  .attempts-display {
    gap: 5px;
  }

  .attempt-dot {
    width: 35px;
    height: 35px;
    font-size: 0.7em;
  }

  .volume-container {
    gap: 8px;
    padding: 10px 15px;
  }

  .volume-slider {
    width: 80px;
  }

  .volume-btn {
    width: 35px;
    height: 35px;
    font-size: 1em;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .end-game-actions {
    flex-direction: column;
    align-items: center;
  }
}

/* Video player section styles */
.video-player-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid rgba(255, 255, 255, 0.2);
}

.video-info {
  text-align: center;
  margin-bottom: 20px;
}

.video-title {
  font-size: 1.4em;
  color: white;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.video-artist {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-style: italic;
}

.video-wrapper {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin: 0 auto;
  max-width: 600px;
}

.youtube-iframe {
  width: 100%;
  height: 315px;
  border: none;
}

@media (max-width: 768px) {
  .youtube-iframe {
    height: 200px;
  }
}
</style>
