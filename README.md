# HeardleTournament

A music guessing game tournament platform built with Vue.js, featuring YouTube playlist integration and multiplayer support.

## Features

- 🎵 **Music Guessing Game** - Test your music knowledge with customizable playlists
- 🏆 **Tournament Mode** - Compete in structured tournaments with multiple rounds
- 👥 **Multiplayer Support** - Play with friends in real-time lobbies
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎼 **Custom Playlists** - Use any public YouTube playlist
- 🎯 **Default Playlists** - Curated playlists ready to play

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/RobinCouture/HeardleTournament.git
   cd HeardleTournament
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```
3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your API keys (see [SETUP.md](SETUP.md) for details)
4. **Start development server**

   ```bash
   npm run dev
   ```

## Adding Default Playlists

The application now features an easy-to-use playlist configuration system. You can add new default playlists directly in the code without needing GitHub secrets!

**Simply edit `src/config/playlists.ts`** and add your playlist to the `DEFAULT_PLAYLISTS` array:

```typescript
{
  id: 'my-playlist',
  name: 'My Awesome Playlist',
  description: 'Description of the playlist',
  url: 'https://www.youtube.com/playlist?list=YOUR_PLAYLIST_ID',
  songCount: '50+',
  genre: 'Your Genre',
  estimatedSongs: 50
}
```

## Technologies Used

- **Vue 3** with Composition API
- **TypeScript** for type safety
- **Vite** for fast development and building
- **Pinia** for state management
- **Firebase** for real-time multiplayer
- **YouTube Data API** for playlist integration

## Requirements

- Node.js 18+
- YouTube Data API key
- Firebase project (for multiplayer features)

## License

This project is open source and available under the [MIT License](LICENSE).
