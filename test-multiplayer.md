# Multiplayer Lobby Test Instructions

## Problem

Players joining the lobby don't see themselves in the list until they ready up, and the host doesn't see them either. Additionally, when settings update because of polling, the player list resets and players disappear.

## Root Cause Found

The issue was in the **lobbyService** methods (`updateGameSettings`, `updatePlayerReady`, `startGame`) which were using stale `this.currentLobby` references instead of getting fresh data from localStorage before making updates. This caused player data to be lost when lobby operations occurred.

## Fix Applied

1. **Fixed stale lobby references in lobbyService**:

   - `updateGameSettings()` now gets fresh lobby data before updating settings
   - `updatePlayerReady()` now gets fresh lobby data before updating ready status
   - `startGame()` now gets fresh lobby data before starting the game
   - `submitGuess()` now gets fresh lobby data before submitting guesses
   - `updateGameState()` now gets fresh lobby data before updating game state
   - Added debug logging to track player counts during updates

2. **Fixed game start propagation**: Added lobby status monitoring to both host and non-host polling functions to detect when the game starts and automatically navigate all players to the game view

3. **Implemented real multiplayer gameplay**:

   - **Track Loading**: Host loads random tracks from the configured YouTube playlist using YouTube Data API
   - **Audio Playback**: Integrated YouTube audio player for real track playback with precise timing
   - **Smart Guess Checking**: Implemented intelligent guess matching with partial word matching and artist recognition
   - **Real-time Updates**: Game state polling ensures all players see updates immediately
   - **Scoring System**: Points calculated based on attempt number (fewer attempts = higher score)
   - **Round Progression**: Host can progress through multiple rounds, players wait for host

4. **Improved host polling**: The host now always updates the player list during polling instead of only when changes are detected

5. **Immediate polling**: Both host and non-host players now do an immediate poll when the lobby view mounts

6. **Faster initial polling**: Reduced polling interval to 1 second for more responsive updates

7. **Timing fix**: Added small delay in onMounted to ensure localStorage operations complete

8. **Selective updates**: Both host and non-host polling now update only specific parts of the lobby data (players or settings) instead of replacing the entire object, preventing player list resets

## Test Steps

### Test 1: Host sees joining players

1. Open browser tab 1
2. Go to http://localhost:5173
3. Click "Multiplayer"
4. Click "Create New Lobby"
5. Enter name "Host" and create lobby
6. Note the lobby code

### Test 2: Player joins and is visible

1. Open browser tab 2 (or incognito)
2. Go to http://localhost:5173
3. Click "Multiplayer"
4. Click "Join Lobby"
5. Enter the lobby code from step 1
6. Enter name "Player1" and join
7. **Check**: Player1 should appear in the lobby immediately
8. **Check**: Host should see Player1 in the player list

### Test 3: Player sees themselves

1. In tab 2 (Player1), verify you see yourself in the player list
2. Verify you see the host in the player list
3. Click "Ready Up"
4. **Check**: Both tabs should show Player1 as ready

### Test 4: Multiple players

1. Open browser tab 3
2. Repeat join process with name "Player2"
3. **Check**: All three tabs should show all three players

### Test 5: Game Start Functionality

1. In the host tab (tab 1), ensure the "Start Game" button is disabled initially
2. Have Player1 (tab 2) click "Ready Up"
3. Have Player2 (tab 3) click "Ready Up"
4. **Check**: Host should see both players as ready
5. **Check**: The "Start Game" button should now be enabled for the host
6. Host clicks "Start Game"
7. **Check**: Host should navigate to the game view (`/lobby/[code]/game`)
8. **Check**: Player1 and Player2 should automatically navigate to the game view as well
9. **Check**: All players should see the multiplayer game interface

### Test 6: Multiplayer Gameplay

1. **Initial Game State**: All players should see "Get Ready!" screen
2. **Host Controls**: Only the host should see the "Start Round 1" button
3. **Start Round**: Host clicks "Start Round 1"
4. **Track Loading**:
   - A random track should be loaded from the configured playlist
   - All players should see the clip controls and guess interface
   - The track info should be hidden initially
5. **Audio Playback**:
   - Players can click "Play 1s" to hear a 1-second clip
   - Audio should play for exactly 1 second then stop
   - Players can stop playback early if needed
6. **Guessing**:
   - Players can type guesses and submit them
   - Players can click "Skip" to move to the next clip length without guessing
   - Each player has their own clip progression (1s, 2s, 4s, 7s, 11s, 16s)
   - Incorrect guesses and skips only affect the individual player's clip length
   - Correct guesses should reveal the track info and show "Won!" status
7. **Scoring**:
   - Players should see their attempt counts and scores update
   - Correct guesses on earlier attempts should give higher scores
8. **Round Progression**:
   - After all attempts or a correct guess, the track should be revealed
   - Host should see "Next Round" button
   - Non-host players should see "Waiting for host..." message
9. **Next Rounds**: Host can progress through all configured rounds
10. **Tournament End**: After final round, host can end the tournament

## Expected Results

- ✅ Players appear immediately when joining
- ✅ Host sees all players without needing to wait
- ✅ Players see themselves in the list
- ✅ Ready status updates work correctly
- ✅ Player count updates correctly
- ✅ Game starts for all players when host clicks "Start Game"
- ✅ All players navigate to the game view automatically
- ✅ Host can start rounds with real tracks from the playlist
- ✅ Audio playback works with actual YouTube tracks
- ✅ Guess checking works with intelligent matching
- ✅ Scoring system calculates points based on attempt number
- ✅ Real-time updates work during gameplay
- ✅ Round progression works for multiple rounds

## Previous Issues Fixed

- Race condition between localStorage save/load operations
- Host polling only updating on detected changes
- Initial lobby load not getting latest data
- Polling not starting immediately
- Game start not propagating to other players (FIXED: Added lobby status monitoring in polling functions)
- Skip button not working (FIXED: Modified submitGuess to accept skip parameter and handle empty guesses for skipping)
- Individual clip progression (FIXED: Each player now has their own clip duration based on their attempts, skipping doesn't affect other players)
