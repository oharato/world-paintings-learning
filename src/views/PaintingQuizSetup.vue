<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '../components/AppButton.vue';
import { usePaintingsStore } from '../store/paintings';
import { usePaintingQuizStore } from '../store/paintingQuiz';

const router = useRouter();
const quizStore = usePaintingQuizStore();
const paintingsStore = usePaintingsStore();

// localStorageからニックネームを読み込む
const NICKNAME_STORAGE_KEY = 'painting_quiz_nickname';
const savedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
const nickname = ref(savedNickname || quizStore.nickname);
const numberOfQuestions = ref(quizStore.numberOfQuestions);
const nicknameError = ref<string>('');

// 絵画データがないとクイズが始められないので、ここで読み込んでおく
onMounted(() => {
  paintingsStore.fetchPaintings();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

// キーボードショートカット: Ctrl+Enter でクイズ開始
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    startQuiz();
  }
};

// ニックネームのバリデーション
const validateNickname = (name: string): { valid: boolean; error?: string } => {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'ニックネームを入力してください' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'ニックネームは20文字以内で入力してください' };
  }

  // 危険な文字をチェック（HTMLタグ、スクリプトインジェクション対策）
  if (/<|>|&lt;|&gt;|<script|javascript:|on\w+=/i.test(trimmed)) {
    return { valid: false, error: '使用できない文字が含まれています' };
  }

  // 制御文字をチェック
  if (/[\x00-\x1F\x7F-\x9F]/.test(trimmed)) {
    return { valid: false, error: '使用できない文字が含まれています' };
  }

  return { valid: true };
};

const startQuiz = () => {
  const validation = validateNickname(nickname.value);

  if (!validation.valid) {
    nicknameError.value = validation.error || '';
    return;
  }

  // エラーをクリア
  nicknameError.value = '';

  // ニックネームをトリミングして保存
  const sanitizedNickname = nickname.value.trim();
  localStorage.setItem(NICKNAME_STORAGE_KEY, sanitizedNickname);
  quizStore.setupQuiz(sanitizedNickname, numberOfQuestions.value);
  router.push('/painting-quiz/play');
};

// ニックネーム入力時にエラーをクリア
const clearNicknameError = () => {
  if (nicknameError.value) {
    nicknameError.value = '';
  }
};
</script>

<template>
  <div class="container mx-auto p-4 max-w-lg">
    <router-link to="/" class="text-blue-500 hover:underline">ホームに戻る</router-link>
    <h2 class="text-3xl font-bold my-6 text-center">名画クイズ設定</h2>

    <form @submit.prevent="startQuiz" class="space-y-6">
      <div>
        <label for="nickname" class="block text-sm md:text-base font-semibold mb-2">ニックネーム</label>
        <input
          id="nickname"
          v-model="nickname"
          @input="clearNicknameError"
          type="text"
          placeholder="例: アート太郎"
          class="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border rounded focus:outline-none focus:ring-2"
          :class="{
            'border-red-500 ring-2 ring-red-500': nicknameError,
            'border-gray-300 focus:ring-blue-500': !nicknameError
          }"
        />
        <p v-if="nicknameError" class="mt-1 text-red-500 text-sm">{{ nicknameError }}</p>
      </div>

      <div>
        <label for="numberOfQuestions" class="block text-sm md:text-base font-semibold mb-2">問題数</label>
        <select
          id="numberOfQuestions"
          v-model.number="numberOfQuestions"
          class="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option :value="5">5問</option>
          <option :value="10">10問</option>
          <option :value="14">全問（14問）</option>
        </select>
      </div>

      <div class="text-center">
        <AppButton variant="primary" type="submit" class="w-full md:w-auto">
          クイズ開始
        </AppButton>
        <p class="mt-2 text-sm text-gray-600">Ctrl+Enter でクイズ開始</p>
      </div>
    </form>

    <div class="mt-8 p-4 bg-blue-50 rounded-lg">
      <h3 class="font-bold text-lg mb-2">クイズの遊び方</h3>
      <ul class="list-disc list-inside space-y-1 text-sm">
        <li>絵画を見て、作者とタイトルの両方を選択します</li>
        <li>両方正解で満点、片方のみ正解で半分の得点</li>
        <li>スコアは正解数と回答時間で計算されます</li>
      </ul>
    </div>
  </div>
</template>
