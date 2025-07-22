<template>
  <div class="youtube-audio-player">
    <!-- Hidden YouTube player element - must be visible for API to work -->
    <div :id="playerId" style="width: 1px; height: 1px; opacity: 0; pointer-events: none;"></div>

    <!-- Main player interface -->
    <div class="player-container">
      <!-- Track info -->
      <div v-if="audioStore.hasTrack" class="track-info">
        <h3 class="track-title">{{ audioStore.currentTrack?.title }}</h3>
        <p v-if="audioStore.currentTrack?.artist" class="track-artist">
          {{ audioStore.currentTrack.artist }}
        </p>
      </div>

      <!-- Progress bar -->
      <div class="progress-container">
        <span class="time-display">{{ formatTime(audioStore.currentTime) }}</span>
        <div class="progress-bar" @click="seekToPosition">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: audioStore.progress + '%' }"></div>
          </div>
        </div>
        <span class="time-display">{{ formatTime(audioStore.duration) }}</span>
      </div>

      <!-- Controls -->
      <div class="controls">

        <button @click="audioStore.togglePlayPause()" :disabled="!audioStore.hasTrack"
          class="control-btn play-pause-btn" :title="audioStore.isPlaying ? 'Pause' : 'Play'">
          <span v-if="audioStore.isLoading">🔄</span>
          <span v-else-if="audioStore.isPlaying">⏸️</span>
          <span v-else>▶️</span>
        </button>

        <div class="volume-container">
          <button @click="audioStore.toggleMute()" class="control-btn volume-btn"
            :title="audioStore.isMuted ? 'Unmute' : 'Mute'">
            <span v-if="audioStore.isMuted">🔇</span>
            <span v-else-if="audioStore.volume === 0">🔈</span>
            <span v-else-if="audioStore.volume < 50">🔉</span>
            <span v-else>🔊</span>
          </button>
          <input type="range" min="0" max="100" v-model="audioStore.volume" @input="updateVolume" class="volume-slider"
            :disabled="audioStore.isMuted" />
        </div>
      </div>

      <!-- Playlist -->
      <!-- <div v-if="audioStore.hasPlaylist" class="playlist">
        <div class="playlist-header">
          <h4>Playlist ({{ audioStore.playlist.length }} tracks)</h4>
          <button @click="audioStore.clearPlaylist()" class="clear-btn">
            Clear All
          </button>
        </div>
        <ul class="playlist-items">
          <li
            v-for="(track, index) in audioStore.playlist"
            :key="track.id"
            :class="{
              'playlist-item': true,
              'active': index === audioStore.currentIndex
            }"
          >
            <div class="track-info" @click="audioStore.playTrackAtIndex(index)">
              <strong>{{ track.title }}</strong>
              <span v-if="track.artist"> - {{ track.artist }}</span>
            </div>
            <button
              @click="audioStore.removeFromPlaylist(index)"
              class="remove-btn"
              title="Remove track"
            >
              ❌
            </button>
          </li>
        </ul>
      </div> -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue' //reactive
import { useAudioPlayerStore } from '@/stores/audioPlayerStore' //type Track
// import { extractYouTubeVideoId } from '@/utils/youtube'

const audioStore = useAudioPlayerStore()

// Generate unique player ID to avoid conflicts
const playerId = ref(`youtube-player-${Math.random().toString(36).substr(2, 9)}`)

// const newTrack = reactive({
//   videoUrl: '',
//   title: '',
//   artist: ''
// })

const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const seekToPosition = (event: MouseEvent) => {
  if (!audioStore.hasTrack) return

  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const clickPosition = (event.clientX - rect.left) / rect.width
  const newTime = clickPosition * audioStore.duration

  audioStore.seekTo(newTime)
}

const updateVolume = () => {
  audioStore.setVolume(audioStore.volume)
}

// const addTrack = () => {
//   if (!newTrack.videoUrl || !newTrack.title) return

//   const videoId = extractYouTubeVideoId(newTrack.videoUrl)
//   if (!videoId) {
//     alert('Invalid YouTube URL or Video ID')
//     return
//   }

//   const track: Track = {
//     id: Date.now().toString(),
//     videoId: videoId,
//     title: newTrack.title,
//     artist: newTrack.artist || undefined
//   }

//   audioStore.addToPlaylist(track)

//   // Clear form
//   newTrack.videoUrl = ''
//   newTrack.title = ''
//   newTrack.artist = ''

//   // If this is the first track, start playing it
//   if (audioStore.playlist.length === 1) {
//     audioStore.playTrackAtIndex(0)
//   }
// }

onMounted(() => {
  // Initialize the YouTube player with unique ID
  audioStore.initializePlayer(playerId.value)
  // audioStore.loadPlaylistFromYouTube()
})
</script>

<style scoped>
.youtube-audio-player {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.player-container {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.track-info {
  text-align: center;
  margin-bottom: 20px;
}

.track-title {
  margin: 0 0 5px 0;
  font-size: 1.2em;
  font-weight: bold;
}

.track-artist {
  margin: 0;
  opacity: 0.8;
  font-size: 0.9em;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.time-display {
  font-size: 0.8em;
  font-family: monospace;
  min-width: 40px;
}

.progress-bar {
  flex: 1;
  cursor: pointer;
}

.progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: white;
  transition: width 0.3s ease;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 30px;
}

.control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.2em;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-pause-btn {
  width: 60px;
  height: 60px;
  font-size: 1.5em;
}

.volume-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.volume-btn {
  width: 40px;
  height: 40px;
  font-size: 1em;
}

.volume-slider {
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
}

.add-track-form {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.add-track-form h4 {
  margin: 0 0 15px 0;
  color: white;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.9em;
  color: rgba(255, 255, 255, 0.9);
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 0.9em;
}

.form-group input:focus {
  outline: none;
  background: white;
}

.add-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.2s ease;
}

.add-btn:hover {
  background: #45a049;
}

.playlist {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.playlist-header h4 {
  margin: 0;
  color: white;
}

.clear-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
  transition: background 0.2s ease;
}

.clear-btn:hover {
  background: #da190b;
}

.playlist-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.playlist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 5px;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.2s ease;
}

.playlist-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.playlist-item.active {
  background: rgba(255, 255, 255, 0.3);
  border-left: 4px solid white;
}

.playlist-item .track-info {
  flex: 1;
  cursor: pointer;
  text-align: left;
  margin: 0;
}

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8em;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.remove-btn:hover {
  opacity: 1;
}
</style>
