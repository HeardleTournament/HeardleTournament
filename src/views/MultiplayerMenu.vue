<template>
    <div class="multiplayer-menu">
        <div class="menu-header">
            <button class="back-button" @click="goHome">
                ← Back to Menu
            </button>
            <h1>Multiplayer</h1>
            <p>Connect with friends and compete in real-time!</p>
        </div>

        <div class="menu-container">
            <div class="menu-sections">
                <!-- Create Lobby Section -->
                <div class="menu-section create-section">
                    <div class="section-header">
                        <div class="section-icon">🎯</div>
                        <h2>Create Lobby</h2>
                    </div>
                    <div class="section-content">
                        <p>Host a new game and invite friends to join your lobby</p>
                        <div class="features-list">
                            <div class="feature-item">
                                <span class="feature-icon">⚙️</span>
                                <span>Customize game settings</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">👑</span>
                                <span>Host controls</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🔗</span>
                                <span>Share lobby code</span>
                            </div>
                        </div>
                        <button class="action-button create-button" @click="createLobby">
                            <span class="button-icon">🚀</span>
                            Create New Lobby
                        </button>
                    </div>
                </div>

                <!-- Join Lobby Section -->
                <div class="menu-section join-section">
                    <div class="section-header">
                        <div class="section-icon">🎮</div>
                        <h2>Join Lobby</h2>
                    </div>
                    <div class="section-content">
                        <p>Enter a lobby code to join an existing game</p>
                        <div class="features-list">
                            <div class="feature-item">
                                <span class="feature-icon">🔍</span>
                                <span>Quick join with code</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">⚡</span>
                                <span>Instant connection</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🏆</span>
                                <span>Compete with others</span>
                            </div>
                        </div>
                        <div class="join-form">
                            <input type="text" v-model="lobbyCode" placeholder="Enter lobby code..." class="lobby-input"
                                maxlength="6" @input="formatLobbyCode" />
                            <button class="action-button join-button" @click="joinLobby" :disabled="!isValidLobbyCode">
                                <span class="button-icon">🎯</span>
                                Join Lobby
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const lobbyCode = ref('')

// Computed properties
const isValidLobbyCode = computed(() => {
    return lobbyCode.value.length === 6 && /^[A-Z0-9]+$/.test(lobbyCode.value)
})

// Methods
const goHome = () => {
    router.push('/')
}

const createLobby = () => {
    // TODO: Implement lobby creation logic
    console.log('Creating lobby...')
}

const joinLobby = () => {
    if (isValidLobbyCode.value) {
        // TODO: Implement lobby joining logic
        console.log('Joining lobby with code:', lobbyCode.value)
    }
}

const formatLobbyCode = (event: Event) => {
    const target = event.target as HTMLInputElement
    let value = target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (value.length > 6) {
        value = value.substring(0, 6)
    }
    lobbyCode.value = value
}
</script>

<style scoped>
.multiplayer-menu {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
}

.menu-header {
    text-align: center;
    color: white;
    margin-bottom: 40px;
    position: relative;
}

.back-button {
    position: absolute;
    left: 0;
    top: 0;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.back-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateX(-5px);
}

.menu-header h1 {
    font-size: 3rem;
    margin: 0 0 15px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.menu-header p {
    font-size: 1.2rem;
    opacity: 0.9;
    margin: 0;
}

.menu-container {
    max-width: 1200px;
    margin: 0 auto;
}

.menu-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 30px;
}

.menu-section {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    transition: transform 0.3s ease;
}

.menu-section:hover {
    transform: translateY(-5px);
}

.section-header {
    text-align: center;
    margin-bottom: 25px;
}

.section-icon {
    font-size: 3rem;
    margin-bottom: 15px;
}

.section-header h2 {
    color: #2c3e50;
    margin: 0 0 10px 0;
    font-size: 1.8rem;
}

.section-content p {
    color: #6c757d;
    text-align: center;
    margin-bottom: 25px;
    font-size: 1.1rem;
}

.features-list {
    margin-bottom: 30px;
}

.feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    color: #2c3e50;
}

.feature-icon {
    font-size: 1.2rem;
    width: 24px;
    text-align: center;
}

.action-button {
    width: 100%;
    border: none;
    padding: 15px 25px;
    border-radius: 15px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.create-button {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
}

.join-button {
    background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);
    color: white;
}

.join-button:disabled {
    background: #6c757d;
    cursor: not-allowed;
    opacity: 0.6;
}

.action-button:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.action-button:active:not(:disabled) {
    transform: translateY(-1px);
}

.button-icon {
    font-size: 1.2rem;
}

.join-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.lobby-input {
    width: 100%;
    padding: 15px;
    border: 2px solid #e9ecef;
    border-radius: 10px;
    font-size: 1.1rem;
    text-align: center;
    letter-spacing: 2px;
    font-weight: 600;
    transition: all 0.3s ease;
}

.lobby-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.lobby-input::placeholder {
    letter-spacing: normal;
    font-weight: normal;
}

@media (max-width: 1200px) {
    .menu-sections {
        grid-template-columns: 1fr;
        max-width: 600px;
        margin: 0 auto;
    }
}

@media (max-width: 768px) {
    .multiplayer-menu {
        padding: 10px;
    }

    .menu-header h1 {
        font-size: 2.5rem;
    }

    .back-button {
        position: static;
        margin-bottom: 20px;
        width: fit-content;
    }

    .menu-section {
        padding: 20px;
    }

    .section-header h2 {
        font-size: 1.5rem;
    }

    .section-icon {
        font-size: 2.5rem;
    }
}
</style>
