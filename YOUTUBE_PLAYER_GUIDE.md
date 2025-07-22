# YouTube Audio Player for Vue.js

This project includes a complete YouTube audio player component built with Vue 3, TypeScript, and Pinia.

## Features

- 🎵 **Audio-only playback** - YouTube videos play as audio only (hidden video)
- 📱 **Responsive design** - Works on all screen sizes
- 🎛️ **Full controls** - Play, pause, skip, volume, mute, seek
- 📋 **Playlist management** - Add, remove, and navigate through tracks
- 🎨 **Beautiful UI** - Gradient background with glassmorphism effects
- 📊 **Progress tracking** - Visual progress bar with time display
- 🔄 **Auto-advance** - Automatically plays next track when current ends

## How to Use

### Adding Tracks

1. **YouTube URL or Video ID**: You can add tracks using either:

   - Full YouTube URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Short URL: `https://youtu.be/dQw4w9WgXcQ`
   - Just the Video ID: `dQw4w9WgXcQ`

2. **Track Information**:

   - **Title** (required): The name of the song/track
   - **Artist** (optional): The artist or composer name

3. Click "Add Track" to add it to your playlist

### Player Controls

- **Play/Pause**: Click the center button to toggle playback
- **Previous/Next**: Navigate through your playlist
- **Volume**: Use the slider to adjust volume or click the speaker icon to mute
- **Seek**: Click anywhere on the progress bar to jump to that position
- **Remove tracks**: Click the ❌ button next to any track in the playlist

### Example Video IDs for Testing

Here are some popular music video IDs you can try:

- **Rick Astley - Never Gonna Give You Up**: `dQw4w9WgXcQ`
- **Queen - Bohemian Rhapsody**: `fJ9rUzIMcZQ`
- **The Beatles - Here Comes The Sun**: `KQetemT1sWc`

## Technical Details

### Store (Pinia)

The audio player uses a Pinia store (`audioPlayerStore.ts`) to manage:

- Player state (playing, loading, volume, etc.)
- Current track information
- Playlist management
- YouTube player instance

### Component Structure

The main component (`YouTubeAudioPlayer.vue`) includes:

- Hidden YouTube iframe for audio playback
- Control interface with play/pause, skip, volume controls
- Progress bar with seeking capability
- Add track form
- Playlist display with track management

### YouTube Integration

- Uses the `youtube-player` npm package for YouTube API integration
- Automatically extracts video IDs from various YouTube URL formats
- Handles player events (state changes, ready events, etc.)
- Configured for audio-only playback (hidden video)

## Browser Requirements

- Modern browsers that support the YouTube IFrame API
- JavaScript enabled
- No special permissions required (works in any web context)

## Notes

- The player requires an internet connection to load YouTube content
- Some videos may be blocked due to YouTube's embedding restrictions
- The component automatically handles different YouTube URL formats
- Player state persists during the session but resets on page reload

Enjoy your music! 🎵
