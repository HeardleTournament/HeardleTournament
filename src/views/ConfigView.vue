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

        <!-- Predefined Playlists -->
        <div class="form-group">
          <div class="predefined-playlists">
            <button type="button" class="predefined-toggle" @click="showPredefined = !showPredefined">
              {{ showPredefined ? '▼' : '▶' }} Or choose from predefined playlists
            </button>

            <div v-if="showPredefined" class="predefined-menu">
              <div class="predefined-item" v-for="playlist in predefinedPlaylists" :key="playlist.id">
                <button type="button" class="predefined-btn" @click="selectPredefinedPlaylist(playlist)"
                  :class="{ 'selected': playlistUrl === playlist.url }">
                  <div class="playlist-info">
                    <h4>{{ playlist.name }}</h4>
                    <p>{{ playlist.description }}</p>
                    <span class="playlist-meta">{{ playlist.songCount }} songs • {{ playlist.genre }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Number of Songs -->
        <div class="form-group">
          <label for="songCount">Number of Songs</label>
          <input type="number" id="songCount" v-model.number="songCount"
            :disabled="!playlistUrl || playlistUrl.trim() === ''" :min="1" :max="maxSongs"
            placeholder="Enter number of songs" class="form-input"
            :class="{ 'disabled': !playlistUrl || playlistUrl.trim() === '' }" />
          <p class="form-hint" v-if="!playlistUrl || playlistUrl.trim() === ''">
            Please select a playlist first
          </p>
          <p class="form-hint" v-else-if="maxSongs > 0">
            Choose between 1 and {{ maxSongs }} songs (playlist size)
          </p>
          <p class="form-hint" v-else>
            How many songs will be played in this tournament
          </p>
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
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getXenobladePlaylistUrl } from '@/utils/env'

const router = useRouter()

// Interface for predefined playlists
interface PredefinedPlaylist {
  id: string
  name: string
  description: string
  url: string
  songCount: string
  genre: string
}

// Form data
const playerName = ref('')
const tournamentName = ref('')
const playlistUrl = ref('')
const songCount = ref<number>(10)
const maxSongs = ref<number>(0)

// Predefined playlists state
const showPredefined = ref(false)

// Predefined playlists data
const predefinedPlaylists = ref<PredefinedPlaylist[]>([
  {
    id: 'xenoblade',
    name: 'Xenoblade Chronicles',
    description: 'Epic orchestral soundtrack from the Xenoblade Chronicles series',
    url: getXenobladePlaylistUrl(),
    songCount: '50+',
    genre: 'Video Game OST'
  }
])

const selectPredefinedPlaylist = (playlist: PredefinedPlaylist) => {
  playlistUrl.value = playlist.url
  showPredefined.value = false

  // Set estimated max songs based on the playlist
  if (playlist.id === 'xenoblade') {
    maxSongs.value = 50 // Estimated for Xenoblade playlist
  } else {
    maxSongs.value = 25 // Default estimate for other playlists
  }

  // Reset song count to a reasonable default if it exceeds max
  if (songCount.value > maxSongs.value) {
    songCount.value = Math.min(10, maxSongs.value)
  }
}

// Watch for manual playlist URL changes
watch(playlistUrl, (newUrl) => {
  if (newUrl && newUrl.trim() !== '') {
    // For manual URLs, we can't know the exact size, so set a reasonable default
    maxSongs.value = 100 // Conservative estimate for manual playlists
  } else {
    maxSongs.value = 0
    songCount.value = 10
  }
})

const returnToMenu = () => {
  router.push('/')
}

const startGame = () => {
  // Validate song count
  if (songCount.value < 1) {
    alert('Number of songs must be at least 1')
    return
  }

  if (maxSongs.value > 0 && songCount.value > maxSongs.value) {
    alert(`Number of songs cannot exceed ${maxSongs.value} (playlist size)`)
    return
  }

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
      songCount: songCount.value.toString()
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

.form-input.disabled,
.form-input:disabled {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
  border-color: #dee2e6;
}

.form-input.disabled:focus,
.form-input:disabled:focus {
  border-color: #dee2e6;
  box-shadow: none;
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

.predefined-playlists {
  margin-top: 1rem;
}

.predefined-toggle {
  background: none;
  border: none;
  color: #667eea;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 8px 0;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.predefined-toggle:hover {
  color: #5a6fd8;
}

.predefined-menu {
  margin-top: 1rem;
  border: 2px solid #e0e6ed;
  border-radius: 10px;
  background: #f8f9fa;
  max-height: 300px;
  overflow-y: auto;
}

.predefined-item {
  border-bottom: 1px solid #e0e6ed;
}

.predefined-item:last-child {
  border-bottom: none;
}

.predefined-btn {
  width: 100%;
  background: none;
  border: none;
  padding: 1rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
  display: block;
}

.predefined-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.predefined-btn.selected {
  background: rgba(102, 126, 234, 0.2);
  border-left: 4px solid #667eea;
}

.playlist-info h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1rem;
  font-weight: 600;
}

.playlist-info p {
  margin: 0 0 0.5rem 0;
  color: #6c757d;
  font-size: 0.85rem;
  line-height: 1.4;
}

.playlist-meta {
  font-size: 0.75rem;
  color: #adb5bd;
  font-weight: 500;
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
