<template>
    <div class="smart-guess-input">
        <div class="input-container">
            <input ref="inputRef" v-model="query" @input="onInput" @keydown="handleKeydown"
                @focus="showSuggestions = true" @blur="handleBlur" :placeholder="placeholder" :disabled="disabled"
                type="text" class="guess-input" autocomplete="off" />

            <!-- Suggestions dropdown -->
            <div v-if="showSuggestions && filteredSuggestions.length > 0" class="suggestions-dropdown">
                <div v-for="(suggestion, index) in filteredSuggestions.slice(0, maxSuggestions)" :key="suggestion.id"
                    @mousedown="selectSuggestion(suggestion)" class="suggestion-item"
                    :class="{ 'highlighted': index === highlightedIndex }">
                    <div class="suggestion-title">{{ suggestion.title }}</div>
                    <div v-if="suggestion.artist" class="suggestion-artist">
                        by {{ suggestion.artist }}
                    </div>
                </div>
            </div>
        </div>

        <button @click="submitGuess" :disabled="!query.trim() || disabled" class="submit-button">
            {{ submitText }}
        </button>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useAudioPlayerStore, type Track } from '@/stores/audioPlayerStore'

interface Props {
    modelValue: string
    placeholder?: string
    disabled?: boolean
    submitText?: string
    maxSuggestions?: number
}

interface Emits {
    (e: 'update:modelValue', value: string): void
    (e: 'submit', guess: string): void
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Enter song title or artist...',
    disabled: false,
    submitText: 'Guess',
    maxSuggestions: 8
})

const emit = defineEmits<Emits>()

const audioStore = useAudioPlayerStore()
const inputRef = ref<HTMLInputElement>()

const query = ref(props.modelValue)
const showSuggestions = ref(false)
const highlightedIndex = ref(-1)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
    query.value = newValue
})

// Update parent when query changes
watch(query, (newValue) => {
    emit('update:modelValue', newValue)
})

// Filter suggestions based on query
const filteredSuggestions = computed(() => {
    if (!query.value || query.value.length < 1) {
        return []
    }

    const searchTerm = query.value.toLowerCase().trim()

    return audioStore.playlist.filter(track => {
        const titleMatch = track.title.toLowerCase().includes(searchTerm)
        const artistMatch = track.artist?.toLowerCase().includes(searchTerm) || false

        return titleMatch || artistMatch
    }).sort((a, b) => {
        // Prioritize exact matches and then by title length
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        const aArtist = a.artist?.toLowerCase() || ''
        const bArtist = b.artist?.toLowerCase() || ''

        const aExactTitle = aTitle === searchTerm
        const bExactTitle = bTitle === searchTerm
        const aExactArtist = aArtist === searchTerm
        const bExactArtist = bArtist === searchTerm

        if (aExactTitle && !bExactTitle) return -1
        if (bExactTitle && !aExactTitle) return 1
        if (aExactArtist && !bExactArtist) return -1
        if (bExactArtist && !aExactArtist) return 1

        // Then by how early the match appears in the title
        const aTitleIndex = aTitle.indexOf(searchTerm)
        const bTitleIndex = bTitle.indexOf(searchTerm)

        if (aTitleIndex !== bTitleIndex) {
            if (aTitleIndex === -1) return 1
            if (bTitleIndex === -1) return -1
            return aTitleIndex - bTitleIndex
        }

        // Finally by title length (shorter titles first)
        return a.title.length - b.title.length
    })
})

const onInput = () => {
    highlightedIndex.value = -1
    showSuggestions.value = true
}

const handleKeydown = (event: KeyboardEvent) => {
    if (!showSuggestions.value || filteredSuggestions.value.length === 0) {
        if (event.key === 'Enter') {
            submitGuess()
        }
        return
    }

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault()
            highlightedIndex.value = Math.min(
                highlightedIndex.value + 1,
                Math.min(filteredSuggestions.value.length - 1, props.maxSuggestions - 1)
            )
            break

        case 'ArrowUp':
            event.preventDefault()
            highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
            break

        case 'Enter':
            event.preventDefault()
            if (highlightedIndex.value >= 0) {
                const suggestion = filteredSuggestions.value[highlightedIndex.value]
                selectSuggestion(suggestion)
            } else {
                submitGuess()
            }
            break

        case 'Escape':
            showSuggestions.value = false
            highlightedIndex.value = -1
            inputRef.value?.blur()
            break

        case 'Tab':
            if (highlightedIndex.value >= 0) {
                event.preventDefault()
                const suggestion = filteredSuggestions.value[highlightedIndex.value]
                selectSuggestion(suggestion)
            } else {
                showSuggestions.value = false
            }
            break
    }
}

const selectSuggestion = (suggestion: Track) => {
    query.value = suggestion.title
    showSuggestions.value = false
    highlightedIndex.value = -1

    // Focus back on input for immediate submission if desired
    nextTick(() => {
        inputRef.value?.focus()
    })
}

const handleBlur = () => {
    // Delay hiding suggestions to allow for click selection
    setTimeout(() => {
        showSuggestions.value = false
        highlightedIndex.value = -1
    }, 150)
}

const submitGuess = () => {
    if (query.value.trim()) {
        emit('submit', query.value.trim())
    }
}

// Expose focus method for parent components
const focus = () => {
    inputRef.value?.focus()
}

defineExpose({
    focus
})
</script>

<style scoped>
.smart-guess-input {
    display: flex;
    gap: 10px;
    position: relative;
}

.input-container {
    flex: 1;
    position: relative;
}

.guess-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    font-size: 1em;
    transition: border-color 0.2s ease;
    background: white;
    color: #000000 !important;
}

.guess-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.guess-input:disabled {
    background: #f8f9fa;
    color: #6c757d;
    cursor: not-allowed;
}

.guess-input::placeholder {
    color: #6c757d;
    opacity: 1;
}

/* Additional specificity to ensure text color is applied */
.smart-guess-input .input-container .guess-input {
    color: #000000 !important;
}

/* Override any Pico CSS or other framework styles */
.smart-guess-input .guess-input,
.smart-guess-input input[type="text"] {
    color: #000000 !important;
    background-color: #ffffff !important;
}

/* Maximum specificity override for Pico CSS */
.smart-guess-input .input-container input.guess-input,
.smart-guess-input .input-container input[type="text"].guess-input {
    color: #000000 !important;
    background-color: #ffffff !important;
    font-weight: normal !important;
}

.suggestions-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #dee2e6;
    border-top: none;
    border-radius: 0 0 6px 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
}

.suggestion-item {
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid #f1f3f4;
    transition: background-color 0.1s ease;
}

.suggestion-item:last-child {
    border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
    background: #f8f9fa;
}

.suggestion-item.highlighted {
    background: #e7f3ff;
    border-left: 3px solid #007bff;
}

.suggestion-title {
    font-weight: 500;
    color: #212529;
    margin-bottom: 2px;
}

.suggestion-artist {
    font-size: 0.85em;
    color: #6c757d;
    font-style: italic;
}

.submit-button {
    background: #28a745;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 500;
    transition: background-color 0.2s ease;
    white-space: nowrap;
}

.submit-button:hover:not(:disabled) {
    background: #218838;
}

.submit-button:disabled {
    background: #6c757d;
    cursor: not-allowed;
}

@media (max-width: 600px) {
    .smart-guess-input {
        flex-direction: column;
    }

    .submit-button {
        align-self: stretch;
    }
}
</style>
