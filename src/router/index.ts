import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/quiz',
    name: 'QuizSetup',
    component: () => import('../views/QuizSetup.vue'),
  },
  {
    path: '/quiz/play',
    name: 'QuizPlay',
    component: () => import('../views/QuizPlay.vue'),
  },
  {
    path: '/quiz/result',
    name: 'QuizResult',
    component: () => import('../views/QuizResult.vue'),
  },
  {
    path: '/ranking',
    name: 'Ranking',
    component: () => import('../views/Ranking.vue'),
  },
  {
    path: '/study',
    name: 'Study',
    component: () => import('../views/Study.vue'),
  },
  {
    path: '/painting-quiz',
    name: 'PaintingQuizSetup',
    component: () => import('../views/PaintingQuizSetup.vue'),
  },
  {
    path: '/painting-quiz/play',
    name: 'PaintingQuizPlay',
    component: () => import('../views/PaintingQuizPlay.vue'),
  },
  {
    path: '/painting-quiz/result',
    name: 'PaintingQuizResult',
    component: () => import('../views/PaintingQuizResult.vue'),
  },
  {
    path: '/painting-study',
    name: 'PaintingStudy',
    component: () => import('../views/PaintingStudy.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
