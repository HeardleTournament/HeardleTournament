<template>
  <div class="youtube-video-player">
    <div class="video-container">
      <div class="video-info" v-if="track">
        <h4 class="video-title">{{ track.title }}</h4>
        <p v-if="track.artist" class="video-artist">by {{ track.artist }}</p>
      </div>

      <!-- YouTube video embed -->
      <div class="video-wrapper">
        <div id="youtube-video-player-display"></div>
      </div>

      <!-- Video controls -->
      <div class="video-controls">
        <button @click="togglePlayPause" class="control-btn play-pause-btn" :disabled="!isPlayerReady">
          <span v-if="isLoading">🔄</span>
          <span v-else-if="isPlaying">⏸️</span>
          <span v-else>▶️</span>
        </button>

        <div class="volume-container">
          <button @click="toggleMute" class="control-btn volume-btn">
            <span v-if="isMuted">🔇</span>
            <span v-else-if="volume === 0">🔈</span>
            <span v-else-if="volume < 50">🔉</span>
            <span v-else>🔊</span>
          </button>
          <input type="range" min="0" max="100" v-model="volume" @input="updateVolume" class="volume-slider"
            :disabled="isMuted" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import YouTubePlayer from 'youtube-player'
import type { Track } from '@/stores/audioPlayerStore'

interface Props {
  track: Track | null
  autoplay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: true
})

// Player state
const player = ref<ReturnType<typeof YouTubePlayer> | null>(null)
const isPlayerReady = ref(false)
const isPlaying = ref(false)
const isLoading = ref(false)
const volume = ref(50)
const isMuted = ref(false)

// Initialize YouTube player
const initializePlayer = async () => {
  if (!props.track?.videoId) return

  try {
    // Destroy existing player if any
    if (player.value) {
      player.value.destroy()
      player.value = null
    }

    isLoading.value = true

    // Create YouTube player with unique ID
    player.value = YouTubePlayer('youtube-video-player-display', {
      videoId: props.track.videoId,
      width: '100%',
      height: '315',
      playerVars: {
        autoplay: props.autoplay ? 1 : 0,
        controls: 1,
        rel: 0,
        fs: 1,
        modestbranding: 1,
      }
    })

    // Setup event listeners
    player.value.on('ready', () => {
      isPlayerReady.value = true
      isLoading.value = false
      if (props.autoplay) {
        player.value?.playVideo()
      }
      // Set initial volume
      player.value?.setVolume(volume.value)
    })

    player.value.on('stateChange', (event) => {
      // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
      isPlaying.value = event.data === 1
      isLoading.value = event.data === 3
    })

  } catch (error) {
    console.error('Error initializing YouTube video player:', error)
    isLoading.value = false
  }
}

// Player controls
const togglePlayPause = async () => {
  if (!player.value || !isPlayerReady.value) return

  try {
    if (isPlaying.value) {
      await player.value.pauseVideo()
    } else {
      await player.value.playVideo()
    }
  } catch (error) {
    console.error('Error toggling play/pause:', error)
  }
}

const toggleMute = async () => {
  if (!player.value || !isPlayerReady.value) return

  try {
    if (isMuted.value) {
      await player.value.unMute()
      isMuted.value = false
    } else {
      await player.value.mute()
      isMuted.value = true
    }
  } catch (error) {
    console.error('Error toggling mute:', error)
  }
}

const updateVolume = async () => {
  if (!player.value || !isPlayerReady.value) return

  try {
    await player.value.setVolume(volume.value)
  } catch (error) {
    console.error('Error updating volume:', error)
  }
}

// Cleanup method to destroy the player
const destroyPlayer = () => {
  if (player.value) {
    player.value.destroy()
    player.value = null
    isPlayerReady.value = false
    isPlaying.value = false
    isLoading.value = false
  }
}

// Expose methods to parent component
defineExpose({
  destroyPlayer
})

// Watch for track changes
watch(() => props.track, (newTrack) => {
  if (newTrack?.videoId) {
    // Only initialize/load when the component becomes visible with a track
    initializePlayer()
  }
}, { immediate: false }) // Changed to false to prevent auto-initialization

// Lifecycle
onMounted(() => {
  // Don't initialize on mount, wait for track to be set
})

onBeforeUnmount(() => {
  if (player.value) {
    player.value.destroy()
    player.value = null
  }
})
</script>

<style scoped>
.youtube-video-player {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-top: 20px;
}

.video-container {
  max-width: 600px;
  margin: 0 auto;
}

.video-info {
  text-align: center;
  margin-bottom: 20px;
}

.video-title {
  font-size: 1.4em;
  color: #2c3e50;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.video-artist {
  color: #6c757d;
  margin: 0;
  font-style: italic;
}

.video-wrapper {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
}

.video-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.control-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2em;
  color: white;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.control-btn:active:not(:disabled) {
  transform: translateY(0);
}

.play-pause-btn {
  width: 60px;
  height: 60px;
  font-size: 1.4em;
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
  width: 100px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.volume-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive design */
@media (max-width: 768px) {
  .video-container {
    padding: 0 10px;
  }

  .video-controls {
    flex-wrap: wrap;
    gap: 15px;
  }

  .volume-container {
    flex: 1;
    justify-content: center;
  }

  .volume-slider {
    width: 80px;
  }
}
</style>
