<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '../components/AppButton.vue';
import { usePaintingQuizStore } from '../store/paintingQuiz';

const router = useRouter();
const quizStore = usePaintingQuizStore();

onMounted(() => {
  if (quizStore.endTime === 0) {
    // クイズが終了していないのにこの画面に来た場合はリダイレクト
    router.push('/painting-quiz');
    return;
  }
});

const goToHome = () => {
  router.push('/');
};

const retryQuiz = () => {
  router.push('/painting-quiz');
};
</script>

<template>
  <div class="container mx-auto p-4 max-w-4xl text-center">
    <h2 class="text-4xl font-bold my-8">結果発表</h2>

    <!-- 結果表示 -->
    <div class="mb-8 p-6 bg-blue-50 border border-blue-300 rounded-lg">
      <div class="space-y-3">
        <div class="flex justify-center items-center">
          <span class="w-32 md:w-40 text-right pr-4 text-lg md:text-xl font-mono">正解数:</span>
          <span class="text-2xl md:text-3xl font-bold">{{ quizStore.correctAnswers }} / {{ quizStore.questions.length }} 問</span>
        </div>
        <div class="flex justify-center items-center">
          <span class="w-32 md:w-40 text-right pr-4 text-lg md:text-xl font-mono">タイム:</span>
          <span class="text-2xl md:text-3xl font-bold">{{ quizStore.totalTime.toFixed(1) }} 秒</span>
        </div>
        <div class="flex justify-center items-center">
          <span class="w-32 md:w-40 text-right pr-4 text-lg md:text-xl font-mono">スコア:</span>
          <span class="text-2xl md:text-3xl font-bold text-blue-600">{{ quizStore.finalScore }} pt</span>
        </div>
      </div>
    </div>

    <!-- 回答詳細 -->
    <div class="text-left mb-8">
      <h3 class="text-2xl font-bold mb-4">回答詳細</h3>
      <div class="space-y-4">
        <div
          v-for="(record, index) in quizStore.answerHistory"
          :key="index"
          class="p-4 border rounded-lg"
          :class="{
            'bg-green-50 border-green-300': record.isFullyCorrect,
            'bg-yellow-50 border-yellow-300': !record.isFullyCorrect && (record.isArtistCorrect || record.isTitleCorrect),
            'bg-red-50 border-red-300': !record.isArtistCorrect && !record.isTitleCorrect
          }"
        >
          <div class="flex flex-col md:flex-row md:items-center gap-4">
            <!-- 絵画画像 -->
            <img
              :src="record.question.correctAnswer.image_url"
              :alt="record.question.correctAnswer.name"
              class="w-32 h-24 object-cover rounded"
            />
            
            <!-- 回答内容 -->
            <div class="flex-1 space-y-2">
              <div class="font-bold text-lg">問題 {{ index + 1 }}</div>
              
              <!-- 作者 -->
              <div class="flex items-start gap-2">
                <span class="font-semibold w-20">作者:</span>
                <div class="flex-1">
                  <div :class="{ 'text-green-600': record.isArtistCorrect, 'text-red-600': !record.isArtistCorrect }">
                    {{ record.isArtistCorrect ? '✓' : '✗' }} {{ record.selectedArtist }}
                  </div>
                  <div v-if="!record.isArtistCorrect" class="text-sm text-gray-600">
                    正解: {{ record.question.correctAnswer.artist }}
                  </div>
                </div>
              </div>
              
              <!-- タイトル -->
              <div class="flex items-start gap-2">
                <span class="font-semibold w-20">タイトル:</span>
                <div class="flex-1">
                  <div :class="{ 'text-green-600': record.isTitleCorrect, 'text-red-600': !record.isTitleCorrect }">
                    {{ record.isTitleCorrect ? '✓' : '✗' }} {{ record.selectedTitle }}
                  </div>
                  <div v-if="!record.isTitleCorrect" class="text-sm text-gray-600">
                    正解: {{ record.question.correctAnswer.name }}
                  </div>
                </div>
              </div>
              
              <!-- 詳細情報 -->
              <div class="text-sm text-gray-600">
                {{ record.question.correctAnswer.year }} | {{ record.question.correctAnswer.medium }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- アクションボタン -->
    <div class="flex flex-col md:flex-row gap-4 justify-center">
      <AppButton variant="primary" @click="retryQuiz">
        もう一度挑戦
      </AppButton>
      <AppButton variant="secondary" @click="goToHome">
        ホームに戻る
      </AppButton>
    </div>
  </div>
</template>
