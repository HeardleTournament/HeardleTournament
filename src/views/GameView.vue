<template>
  <div class="game-view">
    <!-- Return Home Button -->
    <div class="menu-button-container">
      <button class="return-menu-btn" @click="showReturnHomeModal = true">
        ← Return Home
      </button>
    </div>
    <!-- Return Home Button -->
    <div class="menu-button-container">
      <button class="return-menu-btn" @click="showReturnHomeModal = true">
        ← Return Home
      </button>
    </div>

    <h1 style="text-align: center;">Heardle Tournament</h1>

    <!-- Single Player Mode -->
    <div class="single-player-section">
      <!-- Heardle Game Interface -->
      <HeardleGame />
    </div>

    <!-- Hidden audio player for Heardle functionality -->
    <!-- Always render to ensure consistent initialization -->
    <div style="display: none;">
      <YouTubeAudioPlayer />
    </div>
  </div>
  <!-- Return Home Confirmation Modal -->
    <div v-if="showReturnHomeModal" class="modal-overlay" @click="showReturnHomeModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Return to Home?</h3>
          <button @click="showReturnHomeModal = false" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to return to the home screen? Your current game will be lost.</p>
        </div>
        <div class="modal-actions">
          <button @click="showReturnHomeModal = false" class="modal-btn cancel">Cancel</button>
          <button @click="confirmReturnHome" class="modal-btn confirm">Yes, Return Home</button>
        </div>
      </div>
    </div>
</template>


<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import HeardleGame from '@/components/HeardleGame.vue'
import YouTubeAudioPlayer from '@/components/YouTubeAudioPlayer.vue'
import { useAudioPlayerStore } from '@/stores/audioPlayerStore'
import { useHeardleStore } from '@/stores/heardleStore'

const router = useRouter()
const route = useRoute()
const audioStore = useAudioPlayerStore()
const heardleStore = useHeardleStore()


const showReturnHomeModal = ref(false)
const confirmReturnHome = () => {
  heardleStore.resetGame()
  router.push('/')
}

onMounted(async () => {
  // Get configuration from query parameters
  const playlistUrl = route.query.playlistUrl as string
  const playerName = route.query.playerName as string
  const tournamentName = route.query.tournamentName as string
  const songCount = route.query.songCount as string

  console.log('Game started with config:', {
    playerName,
    tournamentName,
    playlistUrl,
    songCount
  })

  try {
    // Load custom playlist if provided, otherwise use default
    if (playlistUrl && playlistUrl.trim() !== '') {
      console.log('Loading custom playlist:', playlistUrl)
      await audioStore.loadCustomPlaylistFromYouTube(playlistUrl)
    } else if (!audioStore.hasPlaylist) {
      console.log('Loading default playlist')
      await audioStore.loadPlaylistFromYouTube()
    }

    // Start tournament if configuration is provided
    if (playerName && tournamentName && songCount) {
      const tournamentConfig = {
        playerName: playerName.trim(),
        tournamentName: tournamentName.trim(),
        totalRounds: parseInt(songCount) || 10
      }

      console.log('Starting tournament:', tournamentConfig)
      heardleStore.startTournament(tournamentConfig)
    } else {
      // Start a single random game if no tournament config
      console.log('Starting single random game')
      heardleStore.startRandomGame()
    }
  } catch (error) {
    console.error('Error loading playlist:', error)
    // Fallback to default playlist if custom playlist fails
    if (playlistUrl && !audioStore.hasPlaylist) {
      console.log('Falling back to default playlist')
      try {
        await audioStore.loadPlaylistFromYouTube()
        // Still try to start tournament/game after fallback
        if (playerName && tournamentName && songCount) {
          const tournamentConfig = {
            playerName: playerName.trim(),
            tournamentName: tournamentName.trim(),
            totalRounds: parseInt(songCount) || 10
          }
          heardleStore.startTournament(tournamentConfig)
        } else {
          heardleStore.startRandomGame()
        }
      } catch (fallbackError) {
        console.error('Error loading fallback playlist:', fallbackError)
      }
    }
  }
})
</script>

<style scoped>
/* Modal Styles */
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
.game-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px 0;
}

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

.game-view h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.single-player-section {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 15px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .menu-button-container {
    position: relative;
    top: 0;
    left: 0;
    text-align: center;
    margin-bottom: 20px;
  }

  .return-menu-btn {
    font-size: 12px;
    padding: 8px 16px;
  }
}
</style>
