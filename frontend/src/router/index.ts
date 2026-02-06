import { createRouter, createWebHistory } from 'vue-router'
import Lobby from '@/views/Lobby.vue'
import Room from '@/views/Room.vue'

const routes = [
  {
    path: '/',
    name: 'Lobby',
    component: Lobby
  },
  {
    path: '/room/:id',
    name: 'Room',
    component: Room
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router