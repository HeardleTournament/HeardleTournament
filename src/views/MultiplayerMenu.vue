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
                        <button class="action-button create-button" @click="createLobby" :disabled="isCreatingLobby">
                            <span class="button-icon">{{ isCreatingLobby ? '⏳' : '🚀' }}</span>
                            {{ isCreatingLobby ? 'Creating...' : 'Create New Lobby' }}
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
                            <button class="action-button join-button" @click="joinLobby"
                                :disabled="!isValidLobbyCode || isJoiningLobby">
                                <span class="button-icon">{{ isJoiningLobby ? '⏳' : '🎯' }}</span>
                                {{ isJoiningLobby ? 'Joining...' : 'Join Lobby' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Status Messages -->
        <div v-if="statusMessage" class="status-message" :class="statusType">
            <div class="message-content">
                <span class="message-icon">{{ statusType === 'success' ? '✅' : statusType === 'error' ? '❌' : 'ℹ️'
                    }}</span>
                <span class="message-text">{{ statusMessage }}</span>
            </div>
        </div>

        <!-- Player Name Modal -->
        <div v-if="showNameModal" class="modal-overlay" @click="closeNameModal">
            <div class="modal-content" @click.stop>
                <h3>{{ isCreatingLobby ? 'Create Lobby' : 'Join Lobby' }}</h3>
                <p>Enter your player name:</p>
                <input type="text" v-model="playerName" placeholder="Your name..." class="name-input" maxlength="20"
                    @keyup.enter="confirmName" />
                <div class="modal-actions">
                    <button class="modal-btn cancel" @click="closeNameModal">Cancel</button>
                    <button class="modal-btn confirm" @click="confirmName" :disabled="!playerName.trim()">
                        {{ isCreatingLobby ? 'Create' : 'Join' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { lobbyService } from '@/services/lobbyService'

const router = useRouter()
const lobbyCode = ref('')
const playerName = ref('')
const isCreatingLobby = ref(false)
const isJoiningLobby = ref(false)
const showNameModal = ref(false)
const statusMessage = ref('')
const statusType = ref<'success' | 'error' | 'info'>('info')
const pendingAction = ref<'create' | 'join'>('create')

// Computed properties
const isValidLobbyCode = computed(() => {
    return lobbyCode.value.length === 6 && /^[A-Z0-9]+$/.test(lobbyCode.value)
})

// Methods
const goHome = () => {
    router.push('/')
}

const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    statusMessage.value = message
    statusType.value = type
    setTimeout(() => {
        statusMessage.value = ''
    }, 5000)
}

const createLobby = () => {
    pendingAction.value = 'create'
    showNameModal.value = true
}

const joinLobby = () => {
    if (!isValidLobbyCode.value) return
    pendingAction.value = 'join'
    showNameModal.value = true
}

const closeNameModal = () => {
    showNameModal.value = false
    playerName.value = ''
    isCreatingLobby.value = false
    isJoiningLobby.value = false
}

const confirmName = async () => {
    if (!playerName.value.trim()) return

    showNameModal.value = false

    if (pendingAction.value === 'create') {
        await handleCreateLobby()
    } else {
        await handleJoinLobby()
    }
}

const handleCreateLobby = async () => {
    isCreatingLobby.value = true
    showStatus('Creating lobby...', 'info')

    try {
        const result = await lobbyService.createLobby(playerName.value.trim())

        if (result.success && result.lobbyCode) {
            showStatus(`Lobby created! Code: ${result.lobbyCode}`, 'success')

            // Navigate to lobby view (you'll need to create this)
            setTimeout(() => {
                router.push(`/lobby/${result.lobbyCode}`)
            }, 2000)
        } else {
            showStatus(result.error || 'Failed to create lobby', 'error')
        }
    } catch (error) {
        showStatus('Network error. Please check your connection. ', 'error')
    } finally {
        isCreatingLobby.value = false
        playerName.value = ''
    }
}

const handleJoinLobby = async () => {
    isJoiningLobby.value = true
    showStatus('Joining lobby...', 'info')

    try {
        const result = await lobbyService.joinLobby(lobbyCode.value, playerName.value.trim())

        if (result.success) {
            showStatus('Successfully joined lobby!', 'success')

            // Navigate to lobby view
            setTimeout(() => {
                router.push(`/lobby/${lobbyCode.value}`)
            }, 1500)
        } else {
            showStatus(result.error || 'Failed to join lobby', 'error')
        }
    } catch (error) {
        showStatus('Network error. Please check your connection.', 'error')
    } finally {
        isJoiningLobby.value = false
        playerName.value = ''
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

.status-message {
    max-width: 600px;
    margin: 20px auto;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
}

.status-message.success {
    background: rgba(40, 167, 69, 0.9);
    color: white;
}

.status-message.error {
    background: rgba(220, 53, 69, 0.9);
    color: white;
}

.status-message.info {
    background: rgba(0, 123, 255, 0.9);
    color: white;
}

.message-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.message-icon {
    font-size: 1.2rem;
}

.message-text {
    flex: 1;
    font-weight: 500;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
}

.modal-content {
    background: white;
    border-radius: 20px;
    padding: 30px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-50px) scale(0.9);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.modal-content h3 {
    margin: 0 0 15px 0;
    color: #2c3e50;
    text-align: center;
    font-size: 1.5rem;
}

.modal-content p {
    margin: 0 0 20px 0;
    color: #6c757d;
    text-align: center;
}

.name-input {
    width: 100%;
    padding: 15px;
    border: 2px solid #e9ecef;
    border-radius: 10px;
    font-size: 1.1rem;
    margin-bottom: 20px;
    transition: all 0.3s ease;
}

.name-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.modal-actions {
    display: flex;
    gap: 15px;
}

.modal-btn {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.modal-btn.cancel {
    background: #6c757d;
    color: white;
}

.modal-btn.cancel:hover {
    background: #5a6268;
}

.modal-btn.confirm {
    background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);
    color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 123, 255, 0.3);
}

.modal-btn.confirm:disabled {
    background: #6c757d;
    cursor: not-allowed;
    opacity: 0.6;
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
