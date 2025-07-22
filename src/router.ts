import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/HomeVue.vue'
import GameView from './views/GameView.vue'
import ConfigView from './views/ConfigView.vue'
import TournamentResults from './views/TournamentResults.vue'

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
  ],
})

export default router
