<template>
  <div class="config-view">
    <!-- Return to Menu Button -->
    <div class="menu-button-container">
      <button class="return-menu-btn" @click="returnToMenu">
        ← Back to Menu
      </button>
    </div>

    <h1 style="text-align: center;">Tournament Configuration</h1>

    <div class="config-container">
      <h2>Setup Your Game</h2>

      <form class="config-form" @submit.prevent="startGame">
        <!-- Player Name -->
        <div class="form-group">
          <label for="playerName">Player Name</label>
          <input type="text" id="playerName" v-model="playerName" placeholder="Enter your name" class="form-input" />
        </div>

        <!-- Tournament Name -->
        <div class="form-group">
          <label for="tournamentName">Tournament Name</label>
          <input type="text" id="tournamentName" v-model="tournamentName" placeholder="Name your tournament"
            class="form-input" />
        </div>

        <!-- YouTube Playlist -->
        <div class="form-group">
          <label for="playlistUrl">YouTube Playlist URL</label>
          <input type="url" id="playlistUrl" v-model="playlistUrl"
            placeholder="https://www.youtube.com/playlist?list=..." class="form-input" />
          <p class="form-hint">
            ⚠️ Make sure your playlist is set to <strong>Public</strong> or <strong>Unlisted</strong> (not Private)
          </p>
        </div>

        <!-- Number of Songs -->
        <div class="form-group">
          <label for="songCount">Number of Songs</label>
          <select id="songCount" v-model="songCount" class="form-select">
            <option value="5">5 Songs</option>
            <option value="10">10 Songs</option>
            <option value="15">15 Songs</option>
            <option value="20">20 Songs</option>
            <option value="25">25 Songs</option>
          </select>
          <p class="form-hint">How many songs will be played in this tournament</p>
        </div>

        <!-- Start Game Button -->
        <div class="form-actions">
          <button type="submit" class="start-game-btn">
            🎵 Start Tournament
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Form data
const playerName = ref('')
const tournamentName = ref('')
const playlistUrl = ref('')
const songCount = ref('10')

const returnToMenu = () => {
  router.push('/')
}

const startGame = () => {
  // For now, just navigate to the game
  // Later this will pass the configuration parameters
  console.log('Starting game with config:', {
    playerName: playerName.value,
    tournamentName: tournamentName.value,
    playlistUrl: playlistUrl.value,
    songCount: songCount.value
  })

  // Pass configuration as query parameters
  router.push({
    path: '/game',
    query: {
      playerName: playerName.value,
      tournamentName: tournamentName.value,
      playlistUrl: playlistUrl.value,
      songCount: songCount.value
    }
  })
}
</script>

<style scoped>
.config-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
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

.config-view h1 {
  color: #2c3e50;
  margin-bottom: 3rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 2.5rem;
  text-align: center;
}

.config-container {
  max-width: 600px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.config-container h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
  font-size: 1.5rem;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1rem;
}

.form-input,
.form-select {
  padding: 12px 16px;
  border: 2px solid #e0e6ed;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
  font-size: 0.85rem;
  color: #6c757d;
  margin: 0;
  font-style: italic;
}

.form-hint strong {
  color: #2c3e50;
}

.form-actions {
  margin-top: 1rem;
  text-align: center;
}

.start-game-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 15px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(40, 167, 69, 0.3);
  min-width: 200px;
}

.start-game-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
  background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
}

.start-game-btn:active {
  transform: translateY(0);
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

  .config-view h1 {
    font-size: 2rem;
    margin-bottom: 2rem;
  }

  .config-container {
    margin: 0 10px;
    padding: 1.5rem;
  }

  .form-input,
  .form-select {
    padding: 10px 12px;
    font-size: 0.9rem;
  }

  .start-game-btn {
    padding: 12px 24px;
    font-size: 1rem;
    min-width: 180px;
  }
}
</style>
