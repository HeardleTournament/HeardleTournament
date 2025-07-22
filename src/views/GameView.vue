<template>
    <div class="game-view">
        <!-- Return to Menu Button -->
        <div class="menu-button-container">
            <button class="return-menu-btn" @click="returnToMenu">
                ← Return to Menu
            </button>
        </div>

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
import { useRouter } from 'vue-router'
import HeardleGame from '@/components/HeardleGame.vue'
import YouTubeAudioPlayer from '@/components/YouTubeAudioPlayer.vue'
import { useAudioPlayerStore } from '@/stores/audioPlayerStore'

const router = useRouter()
const audioStore = useAudioPlayerStore()

const returnToMenu = () => {
    router.push('/')
}

onMounted(() => {
    // Load playlist when game mounts (if not already loaded)
    if (!audioStore.hasPlaylist) {
        audioStore.loadPlaylistFromYouTube()
    }
})
</script>

<style scoped>
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
