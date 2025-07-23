<template>
  <div class="tournament-results">
    <!-- Header -->
    <div class="results-header">
      <div class="trophy-container">
        <div class="trophy-icon">🏆</div>
        <h1>Tournament Complete!</h1>
        <h2 v-if="heardleStore.tournamentConfig">{{ heardleStore.tournamentConfig.tournamentName }}</h2>
      </div>
    </div>

    <!-- Main Results -->
    <div class="results-container">
      <!-- Overall Stats -->
      <div class="overall-stats">
        <h3>Final Results</h3>
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-icon">🎯</div>
            <div class="stat-content">
              <span class="stat-value">{{ heardleStore.tournamentWins }}</span>
              <span class="stat-label">Wins</span>
              <span class="stat-detail">out of {{ heardleStore.tournamentConfig?.totalRounds || 0 }}
                rounds</span>
            </div>
          </div>

          <div class="stat-card secondary">
            <div class="stat-icon">⭐</div>
            <div class="stat-content">
              <span class="stat-value">{{ heardleStore.tournamentScore }}</span>
              <span class="stat-label">Total Score</span>
              <span class="stat-detail">{{ heardleStore.tournamentAverageScore }} avg per round</span>
            </div>
          </div>

          <div class="stat-card accent">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <span class="stat-value">{{ winPercentage }}%</span>
              <span class="stat-label">Win Rate</span>
              <span class="stat-detail">{{ performanceRating }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Round-by-Round Results -->
      <div class="round-results">
        <h3>Round by Round</h3>

        <div class="rounds-list">
          <div v-for="(result, index) in heardleStore.roundResults" :key="index" class="round-item"
            :class="{ 'won': result.hasWon, 'lost': !result.hasWon }">
            <div class="round-header">
              <div class="round-number">Round {{ index + 1 }}</div>
              <div class="round-status">
                <span class="status-icon">{{ result.hasWon ? '✅' : '❌' }}</span>
                <span class="status-text">{{ result.hasWon ? 'Won' : 'Lost' }}</span>
              </div>
            </div>

            <div class="round-details">
              <div class="track-info">
                <h4 class="track-title">{{ result.track.title }}</h4>
                <p v-if="result.track.artist" class="track-artist">by {{ result.track.artist }}</p>
              </div>

              <div class="round-stats">
                <div class="round-stat">
                  <span class="stat-label">Score:</span>
                  <span class="stat-value">{{ result.score }}</span>
                </div>
                <div class="round-stat">
                  <span class="stat-label">Attempts:</span>
                  <span class="stat-value">{{ result.attempts.length }}</span>
                </div>
                <div class="round-stat">
                  <span class="stat-label">Time:</span>
                  <span class="stat-value">{{ formatTime(result.roundTime) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Player Info -->
      <div class="player-info">
        <h3>Tournament Details</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Player:</span>
            <span class="info-value">{{ heardleStore.tournamentConfig?.playerName || 'Anonymous' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Tournament:</span>
            <span class="info-value">{{ heardleStore.tournamentConfig?.tournamentName || 'Untitled Tournament' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date:</span>
            <span class="info-value">{{ currentDate }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Duration:</span>
            <span class="info-value">{{ tournamentDuration }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="results-actions">
        <button @click="newTournament" class="action-btn primary">
          🎯 New Tournament
        </button>
        <button @click="backToMenu" class="action-btn secondary">
          🏠 Back to Menu
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHeardleStore } from '@/stores/heardleStore'

const router = useRouter()
const heardleStore = useHeardleStore()

// Check if there's valid tournament data
onMounted(() => {
  console.log('TournamentResults mounted with data:', {
    isTournamentComplete: heardleStore.isTournamentComplete,
    tournamentConfig: heardleStore.tournamentConfig,
    roundResultsLength: heardleStore.roundResults.length,
    isTournamentMode: heardleStore.isTournamentMode,
    currentRound: heardleStore.currentRound,
    roundResults: heardleStore.roundResults
  })

  // More lenient check - if we have tournament config and round results, show the results
  // even if isTournamentComplete is not set correctly
  if (!heardleStore.tournamentConfig && heardleStore.roundResults.length === 0) {
    // No tournament data at all, redirect to home
    console.log('No tournament data found, redirecting to home')
    setTimeout(() => {
      router.push('/')
    }, 3000)
  } else if (heardleStore.tournamentConfig && heardleStore.roundResults.length > 0) {
    // We have data, make sure tournament is marked as complete
    if (!heardleStore.isTournamentComplete) {
      console.log('Tournament has data but not marked complete, marking as complete')
      heardleStore.completeTournament()
    }
  }
})

// Computed properties
const winPercentage = computed(() => {
  const total = heardleStore.tournamentConfig?.totalRounds || 0
  if (total === 0) return 0
  return Math.round((heardleStore.tournamentWins / total) * 100)
})

const performanceRating = computed(() => {
  const percentage = winPercentage.value
  if (percentage >= 90) return 'Excellent!'
  if (percentage >= 75) return 'Great!'
  if (percentage >= 60) return 'Good'
  if (percentage >= 40) return 'Fair'
  return 'Keep trying!'
})

const currentDate = computed(() => {
  return new Date().toLocaleDateString()
})

const tournamentDuration = computed(() => {
  if (heardleStore.roundResults.length === 0) return '0m'

  const totalTime = heardleStore.roundResults.reduce((sum, result) => sum + result.roundTime, 0)
  const minutes = Math.floor(totalTime / 60000)
  const seconds = Math.floor((totalTime % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
})

// Methods
const formatTime = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}

const newTournament = () => {
  heardleStore.resetTournament()
  router.push('/config')
}

const backToMenu = () => {
  heardleStore.resetTournament()
  router.push('/')
}
</script>

<style scoped>
.tournament-results {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.results-header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
}

.trophy-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.trophy-icon {
  font-size: 4rem;
  animation: bounce 2s infinite;
}

@keyframes bounce {

  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }

  40% {
    transform: translateY(-10px);
  }

  60% {
    transform: translateY(-5px);
  }
}

.results-header h1 {
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.results-header h2 {
  font-size: 1.5rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 400;
}

.results-container {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.overall-stats,
.round-results,
.player-info {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.overall-stats h3,
.round-results h3,
.player-info h3 {
  margin: 0 0 25px 0;
  color: #2c3e50;
  font-size: 1.5rem;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card.primary {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.stat-card.secondary {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.stat-card.accent {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
}

.stat-icon {
  font-size: 2.5rem;
  opacity: 0.9;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 1rem;
  font-weight: 500;
  opacity: 0.9;
  margin-bottom: 5px;
}

.stat-detail {
  font-size: 0.85rem;
  opacity: 0.7;
}

.rounds-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 500px;
  overflow-y: auto;
}

.round-item {
  border: 2px solid #e0e6ed;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.round-item.won {
  border-color: #28a745;
  background: linear-gradient(90deg, rgba(40, 167, 69, 0.1) 0%, transparent 100%);
}

.round-item.lost {
  border-color: #dc3545;
  background: linear-gradient(90deg, rgba(220, 53, 69, 0.1) 0%, transparent 100%);
}

.round-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e6ed;
}

.round-number {
  font-weight: 600;
  color: #2c3e50;
}

.round-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  font-size: 1.2rem;
}

.status-text {
  font-weight: 500;
}

.round-details {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  min-height: 60px;
}

.track-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 100%;
}

.track-title {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 1.1rem;
  line-height: 1.3;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.track-artist {
  margin: 0;
  color: #6c757d;
  font-size: 0.9rem;
  line-height: 1.2;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.round-stats {
  display: flex;
  gap: 20px;
  flex-shrink: 0;
}

.round-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.round-stat .stat-label {
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 2px;
}

.round-stat .stat-value {
  font-weight: 600;
  color: #2c3e50;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
}

.info-label {
  font-weight: 500;
  color: #6c757d;
}

.info-value {
  font-weight: 600;
  color: #2c3e50;
}

.results-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.action-btn {
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  min-width: 150px;
}

.action-btn.primary {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.action-btn.secondary {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  color: white;
}

.action-btn.accent {
  background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);
  color: white;
}

.action-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.action-btn:active {
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .tournament-results {
    padding: 10px;
  }

  .results-header h1 {
    font-size: 2rem;
  }

  .results-header h2 {
    font-size: 1.2rem;
  }

  .overall-stats,
  .round-results,
  .player-info {
    padding: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 20px;
  }

  .round-details {
    flex-direction: column;
    gap: 15px;
    min-height: auto;
  }

  .track-info {
    min-height: auto;
  }

  .round-stats {
    justify-content: space-around;
    width: 100%;
  }

  .results-actions {
    flex-direction: column;
    align-items: center;
  }

  .action-btn {
    min-width: 200px;
  }
}
</style>
