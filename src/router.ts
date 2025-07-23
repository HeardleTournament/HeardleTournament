import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/HomeVue.vue'
import GameView from './views/GameView.vue'
import ConfigView from './views/ConfigView.vue'
import TournamentResults from './views/TournamentResults.vue'
import MultiplayerMenu from './views/MultiplayerMenu.vue'
import FirebaseLobbyView from './views/FirebaseLobbyView.vue'
import MultiplayerGameView from './views/MultiplayerGameView.vue'
import MultiplayerResultsView from './views/MultiplayerResultsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/config',
      name: 'config',
      component: ConfigView,
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
    },
    {
      path: '/results',
      name: 'results',
      component: TournamentResults,
    },
    {
      path: '/multiplayer',
      name: 'multiplayer',
      component: MultiplayerMenu,
    },
    {
      path: '/lobby/:lobbyCode',
      name: 'lobby',
      component: FirebaseLobbyView,
    },
    {
      path: '/lobby/:lobbyCode/game',
      name: 'multiplayer-game',
      component: MultiplayerGameView,
    },
    {
      path: '/lobby/:lobbyCode/results',
      name: 'multiplayer-results',
      component: MultiplayerResultsView,
    },
  ],
})

// Global navigation guard to clean up multiplayer state when leaving multiplayer routes
router.beforeEach((to, from) => {
  // Check if we're leaving multiplayer routes for non-multiplayer routes
  const isLeavingMultiplayer =
    (from.path.includes('/multiplayer') || from.path.includes('/lobby/')) &&
    !to.path.includes('/multiplayer') &&
    !to.path.includes('/lobby/')

  if (isLeavingMultiplayer) {
    // Import and clean up lobby service
    import('@/services/lobbyService').then(({ lobbyService }) => {
      console.log('Leaving multiplayer routes - cleaning up lobby state')
      lobbyService.leaveLobby()
    })
  }
})

export default router
