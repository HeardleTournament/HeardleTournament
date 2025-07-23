import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/HomeVue.vue'
import GameView from './views/GameView.vue'
import ConfigView from './views/ConfigView.vue'
import TournamentResults from './views/TournamentResults.vue'
import MultiplayerMenu from './views/MultiplayerMenu.vue'
import LobbyView from './views/LobbyView.vue'
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
      component: LobbyView,
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

export default router
