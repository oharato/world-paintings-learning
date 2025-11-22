<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { usePaintingsStore } from '../store/paintings';
import { usePaintingQuizStore } from '../store/paintingQuiz';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ErrorMessage from '../components/ErrorMessage.vue';
import AppButton from '../components/AppButton.vue';

const router = useRouter();
const quizStore = usePaintingQuizStore();
const paintingsStore = usePaintingsStore();

const elapsedTime = ref(0);
let timer: number;

// 選択状態
const selectedArtist = ref<string | null>(null);
const selectedTitle = ref<string | null>(null);

// 画像読み込み状態
const imageLoaded = ref(false);

const onImageLoad = () => {
  imageLoaded.value = true;
};

// 次の問題の画像をプリロード
const preloadNextQuestion = () => {
  const nextIndex = quizStore.currentQuestionIndex + 1;
  if (nextIndex >= quizStore.questions.length) return;

  const nextQuestion = quizStore.questions[nextIndex];
  if (!nextQuestion) return;

  const img = new Image();
  img.src = nextQuestion.correctAnswer.image_url;
};

// 問題が変わったら状態をリセット
watch(
  () => quizStore.currentQuestionIndex,
  () => {
    selectedArtist.value = null;
    selectedTitle.value = null;
    imageLoaded.value = false;

    // 画像が読み込まれたら次の問題をプリロード
    watch(
      imageLoaded,
      (loaded) => {
        if (loaded) {
          preloadNextQuestion();
        }
      },
      { once: true }
    );
  }
);

onMounted(async () => {
  if (paintingsStore.paintings.length === 0 && !paintingsStore.loading) {
    await paintingsStore.fetchPaintings();
  }

  if (paintingsStore.error) {
    return;
  }

  if (quizStore.questions.length === 0) {
    router.push('/painting-quiz');
    return;
  }

  quizStore.startQuiz();
  timer = setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - quizStore.startTime) / 1000);
  }, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

watch(
  () => quizStore.endTime,
  (newEndTime) => {
    if (newEndTime > 0) {
      clearInterval(timer);
      router.push('/painting-quiz/result');
    }
  }
);

const handleSubmit = () => {
  if (!selectedArtist.value || !selectedTitle.value || !imageLoaded.value) {
    return;
  }

  quizStore.answerQuestion(selectedArtist.value, selectedTitle.value);
};

const canSubmit = () => {
  return selectedArtist.value && selectedTitle.value && imageLoaded.value;
};
</script>

<template>
  <div class="container mx-auto p-4 max-w-5xl">
    <LoadingSpinner 
      v-if="paintingsStore.loading" 
      full-screen 
    />

    <ErrorMessage
      v-else-if="paintingsStore.error"
      :message="`読み込みエラー: ${paintingsStore.error}`"
      retryable
      @retry="paintingsStore.fetchPaintings(true)"
    />

    <div v-else-if="quizStore.currentQuestion">
      <div class="flex justify-between items-center mb-6">
        <div class="text-xl font-bold">
          問題 {{ quizStore.currentQuestionIndex + 1 }} / {{ quizStore.questions.length }}
        </div>
        <div class="text-xl font-bold">
          経過時間: {{ elapsedTime }}秒
        </div>
      </div>

      <!-- 絵画表示 -->
      <div class="text-center p-8 border-2 border-gray-300 rounded-lg shadow-lg bg-gray-100 min-h-[400px] flex items-center justify-center relative">
        <!-- ローディングスピナー -->
        <div v-if="!imageLoaded" class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
          <LoadingSpinner message="" />
        </div>
        
        <img
          :src="quizStore.currentQuestion.correctAnswer.image_url"
          :alt="'絵画'"
          class="max-h-96 max-w-full object-contain"
          loading="eager"
          fetchpriority="high"
          @load="onImageLoad"
          @error="onImageLoad"
        />
      </div>

      <!-- 選択肢グリッド: 左列=アーティスト、右列=タイトル -->
      <div class="mt-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 左列: アーティスト選択肢 -->
          <div>
            <h3 class="text-lg font-bold mb-3 text-center">作者を選択</h3>
            <div class="space-y-3">
              <button
                v-for="artist in quizStore.currentQuestion.artistOptions"
                :key="artist"
                @click="selectedArtist = artist"
                :disabled="!imageLoaded"
                class="w-full p-4 border-2 rounded-lg focus:outline-none bg-gray-50 transition-all text-left"
                :class="{
                  'border-blue-500 ring-2 ring-blue-500 bg-blue-50': selectedArtist === artist && imageLoaded,
                  'border-gray-300 hover:bg-gray-100': selectedArtist !== artist && imageLoaded,
                  'opacity-50 cursor-not-allowed': !imageLoaded
                }"
              >
                <span class="text-lg">{{ artist }}</span>
              </button>
            </div>
          </div>

          <!-- 右列: タイトル選択肢 -->
          <div>
            <h3 class="text-lg font-bold mb-3 text-center">タイトルを選択</h3>
            <div class="space-y-3">
              <button
                v-for="title in quizStore.currentQuestion.titleOptions"
                :key="title"
                @click="selectedTitle = title"
                :disabled="!imageLoaded"
                class="w-full p-4 border-2 rounded-lg focus:outline-none bg-gray-50 transition-all text-left"
                :class="{
                  'border-green-500 ring-2 ring-green-500 bg-green-50': selectedTitle === title && imageLoaded,
                  'border-gray-300 hover:bg-gray-100': selectedTitle !== title && imageLoaded,
                  'opacity-50 cursor-not-allowed': !imageLoaded
                }"
              >
                <span class="text-lg">{{ title }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 回答ボタン -->
        <div class="mt-8 text-center">
          <AppButton
            variant="primary"
            @click="handleSubmit"
            :disabled="!canSubmit()"
            class="px-8 py-3 text-lg"
          >
            回答する
          </AppButton>
          <p v-if="!selectedArtist || !selectedTitle" class="mt-2 text-sm text-gray-600">
            作者とタイトルの両方を選択してください
          </p>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center py-10">
      <p>クイズデータがありません</p>
      <AppButton variant="primary" @click="router.push('/painting-quiz')" class="mt-4">
        クイズ設定に戻る
      </AppButton>
    </div>
  </div>
</template>
