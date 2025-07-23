<template>
  <div class="home">
    <h1 style="text-align: center;">Heardle Tournament</h1>

    <div class="menu-container">
      <h2>Choose Game Mode</h2>

      <div class="menu-buttons">
        <button class="menu-button singleplayer-btn" @click="goToSinglePlayer">
          <div class="button-icon">🎵</div>
          <div class="button-text">
            <h3>Single Player</h3>
            <p>Play solo and test your music knowledge</p>
          </div>
        </button>

        <button class="menu-button multiplayer-btn" @click="goToMultiplayer">
          <div class="button-icon">👥</div>
          <div class="button-text">
            <h3>Multiplayer</h3>
            <p>Play with friends online!</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToSinglePlayer = () => {
  router.push('/config')
}

const goToMultiplayer = () => {
  router.push('/multiplayer')
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.home h1 {
  color: #2c3e50;
  margin-bottom: 3rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 3rem;
}

.menu-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  max-width: 600px;
  width: 100%;
}

.menu-container h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
  font-size: 1.5rem;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.menu-button {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.menu-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.menu-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
}

.multiplayer-btn {
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
}

.button-icon {
  font-size: 2rem;
  margin-right: 1.5rem;
  min-width: 60px;
  text-align: center;
}

.button-text h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
}

.button-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .home h1 {
    font-size: 2rem;
  }

  .menu-container {
    margin: 0 10px;
  }

  .menu-button {
    padding: 1rem;
  }

  .button-icon {
    font-size: 1.5rem;
    margin-right: 1rem;
    min-width: 40px;
  }

  .button-text h3 {
    font-size: 1.1rem;
  }
}
</style>
