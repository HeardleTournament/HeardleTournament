# Heardle Tournament

A Heardle-style music guessing game featuring songs from the Xenoblade Chronicles series.

## About

Xenoblade Heardle is a web-based music guessing game where players try to identify Xenoblade Chronicles songs from short audio clips. Players get progressively longer clips with each wrong guess or skip, with the goal of identifying the song in as few attempts as possible.

## Features

- 🎵 Single-player Heardle gameplay
- 🎮 Progressive audio clip lengths (1s → 2s → 4s → 7s → 11s → 16s)
- 🎯 Smart search with song and artist suggestions
- 📊 Statistics tracking (games played, win rate, average score)
- 🔊 Volume control with mute functionality
- 📱 Responsive design for mobile and desktop

## How to Play

1. Click "Start Random Game" to begin
2. Listen to the short audio clip
3. Type to search for the song title or artist
4. Make your guess or skip to hear more of the song
5. Try to guess the song in as few attempts as possible!

## Technical Details

Built with:

- Vue 3 + TypeScript
- Vite for build tooling
- Pinia for state management
- YouTube API for audio playback
- PicoCSS for styling

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
