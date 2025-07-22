<template>
  <div class="home">
    <h1 style="text-align: center;">Xenoblade Heardle</h1>

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
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import HeardleGame from '@/components/HeardleGame.vue'
import YouTubeAudioPlayer from '@/components/YouTubeAudioPlayer.vue'
import { useAudioPlayerStore } from '@/stores/audioPlayerStore'

const audioStore = useAudioPlayerStore()

onMounted(() => {
  // Load playlist when home mounts (if not already loaded)
  if (!audioStore.hasPlaylist) {
    audioStore.loadPlaylistFromYouTube()
  }
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px 0;
}

.home h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.single-player-section {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  padding: 2rem;
}

.single-player-section h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.single-player-section p {
  color: #6c757d;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}
</style>
