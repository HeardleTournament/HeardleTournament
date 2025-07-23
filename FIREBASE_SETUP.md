# Firebase Setup Guide for HeardleTournament

This guide will help you set up Firebase Realtime Database for the multiplayer functionality.

## Prerequisites

- A Google account
- Node.js and npm installed
- Your HeardleTournament project

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter a project name (e.g., "heardle-tournament-multiplayer")
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Set Up Realtime Database

1. In your Firebase project console, go to "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose "Start in test mode" for now (we'll secure it later)
4. Select a location closest to your users
5. Click "Done"

## Step 3: Get Firebase Configuration

1. In your Firebase project console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click on "Web app" icon `</>`
5. Register your app with a nickname (e.g., "HeardleTournament")
6. Copy the configuration object - you'll need these values:

```javascript
const firebaseConfig = {
  apiKey: 'your-api-key',
  authDomain: 'your-project.firebaseapp.com',
  databaseURL: 'https://your-project-default-rtdb.firebaseio.com/',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '123456789',
  appId: 'your-app-id',
}
```

## Step 4: Configure Environment Variables

1. Copy the `.env.example` file to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and replace the Firebase placeholder values with your actual configuration:
   ```bash
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Step 5: Test the Setup

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to the multiplayer section
3. Try creating a lobby - you should see it appear in your Firebase Realtime Database console
4. Open another browser window/tab and try joining the lobby with the code

## Step 6: Security Rules (Production)

For production deployment, update your Firebase Realtime Database rules:

1. Go to "Realtime Database" > "Rules" in Firebase Console
2. Replace the rules with:

```json
{
  "rules": {
    "lobbies": {
      "$lobbyId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['id', 'hostId', 'hostName', 'players', 'gameSettings', 'status', 'createdAt', 'maxPlayers'])",
        "players": {
          "$playerId": {
            ".validate": "newData.hasChildren(['id', 'name', 'isHost', 'isReady', 'joinedAt'])"
          }
        }
      }
    }
  }
}
```

3. Click "Publish"

## Deployment to GitHub Pages

When deploying to GitHub Pages, you'll need to add your environment variables as GitHub Secrets:

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add each Firebase environment variable as a repository secret:

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

4. Update your GitHub Actions workflow to include these environment variables during the build process.

## Troubleshooting

### "Firebase is not configured" Error

- Check that all Firebase environment variables are set correctly
- Ensure `.env.local` file exists and has the correct values
- Restart your development server after adding environment variables

### "Permission denied" Error

- Check your Firebase Realtime Database rules
- Ensure your database is in "test mode" during development

### Lobbies Not Syncing

- Check your Firebase console to see if data is being written
- Verify your database URL is correct and includes the trailing slash
- Check browser console for any Firebase errors

### Connection Issues on GitHub Pages

- Ensure all environment variables are properly set as GitHub Secrets
- Check that your Firebase project allows your GitHub Pages domain
- Verify the build process includes the environment variables

## Need Help?

If you encounter issues:

1. Check the browser console for error messages
2. Look at the Firebase console to see if data is being written
3. Verify all environment variables are set correctly
4. Ensure your Firebase project is in the correct region
