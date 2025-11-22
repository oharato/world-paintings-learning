<script setup lang="ts">
import AppButton from '../components/AppButton.vue';
import LanguageSelector from '../components/LanguageSelector.vue';
import { useTranslation } from '../composables/useTranslation';

const { t } = useTranslation();
</script>

<template>
  <div class="container mx-auto p-4 text-center">
    <div class="flex justify-end mb-4">
      <LanguageSelector />
    </div>

    <h1 class="text-4xl font-bold my-8">{{ t.home.title }}</h1>
    
    <!-- 名画クイズセクション -->
    <div class="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
      <h2 class="text-2xl font-bold mb-2 text-purple-800">🎨 NEW! 名画クイズ</h2>
      <p class="text-sm text-gray-700 mb-4">有名な絵画の作者とタイトルを当てよう！</p>
      <router-link to="/painting-quiz" class="block w-full max-w-sm mx-auto">
        <AppButton variant="purple" full-width>
          名画クイズに挑戦
        </AppButton>
      </router-link>
    </div>

    <div class="space-y-4">
      <router-link to="/quiz" class="block w-full max-w-sm mx-auto">
        <AppButton variant="primary" full-width>
          {{ t.home.startQuiz }}
        </AppButton>
      </router-link>
      <router-link to="/study" class="block w-full max-w-sm mx-auto">
        <AppButton variant="success" full-width>
          {{ t.home.study }}
        </AppButton>
      </router-link>
      <router-link to="/ranking" class="block w-full max-w-sm mx-auto">
        <AppButton variant="purple" full-width>
          {{ t.home.viewRanking }}
        </AppButton>
      </router-link>
    </div>
  </div>
</template>
