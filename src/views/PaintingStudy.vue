<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import LazyImage from '../components/LazyImage.vue';
import { useTranslation } from '../composables/useTranslation';
import type { Painting } from '../store/paintings';
import { usePaintingsStore } from '../store/paintings';

const paintingsStore = usePaintingsStore();
const { t } = useTranslation();

const currentIndex = ref(0);
const isFlipped = ref(false);
const selectedArtist = ref('all');
const disableTransition = ref(false);
const quizMode = ref<'painting-to-info' | 'info-to-painting'>('painting-to-info');

onMounted(() => {
  paintingsStore.fetchPaintings(true);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.code === 'ArrowLeft') {
    prevPainting();
  } else if (event.code === 'ArrowRight') {
    nextPainting();
  } else if (event.code === 'Space') {
    event.preventDefault();
    isFlipped.value = !isFlipped.value;
  }
};

const availableArtists = computed(() => {
  const artists = new Set<string>();
  paintingsStore.paintings.forEach((painting) => {
    if (painting.artist) {
      artists.add(painting.artist);
    }
  });
  return Array.from(artists).sort();
});

const filteredPaintings = computed<Painting[]>(() => {
  if (selectedArtist.value === 'all') {
    return paintingsStore.paintings;
  }
  return paintingsStore.paintings.filter((painting) => painting.artist === selectedArtist.value);
});

const currentPainting = computed(() => {
  if (filteredPaintings.value.length === 0) {
    return null;
  }
  return filteredPaintings.value[currentIndex.value];
});

watch(selectedArtist, () => {
  currentIndex.value = 0;
  isFlipped.value = false;
});

watch(quizMode, () => {
  isFlipped.value = false;
});

const nextPainting = () => {
  if (filteredPaintings.value.length === 0) return;

  // Change index first, then flip the card
  if (currentIndex.value < filteredPaintings.value.length - 1) {
    currentIndex.value++;
  } else {
    currentIndex.value = 0;
  }

  if (isFlipped.value) {
    disableTransition.value = true;
    isFlipped.value = false;
    setTimeout(() => {
      disableTransition.value = false;
    }, 0);
  }
};

const prevPainting = () => {
  if (filteredPaintings.value.length === 0) return;

  // Change index first, then flip the card
  if (currentIndex.value > 0) {
    currentIndex.value--;
  } else {
    currentIndex.value = filteredPaintings.value.length - 1;
  }

  if (isFlipped.value) {
    disableTransition.value = true;
    isFlipped.value = false;
    setTimeout(() => {
      disableTransition.value = false;
    }, 0);
  }
};

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value;
};

const goToPainting = (index: number) => {
  isFlipped.value = false;
  currentIndex.value = index;
};
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <div class="container mx-auto p-4 flex-shrink-0">
      <div class="w-full max-w-2xl mx-auto">
        <router-link to="/" class="text-blue-500 hover:underline">{{ t.common.backToHome }}</router-link>
        <h2 class="text-3xl font-bold my-6 text-center">🎨 名画学習モード</h2>

        <!-- 設定エリア -->
        <div class="mb-4 flex justify-between items-center gap-4">
          <!-- クイズ形式選択 -->
          <div>
            <label for="quizMode" class="mr-2">クイズ形式:</label>
            <select
              id="quizMode"
              v-model="quizMode"
              class="p-2 border rounded-md"
            >
              <option value="painting-to-info">絵画 → 情報</option>
              <option value="info-to-painting">情報 → 絵画</option>
            </select>
          </div>

          <!-- 画家選択ドロップダウン -->
          <div>
            <label for="studyArtist" class="mr-2">画家:</label>
            <select
              id="studyArtist"
              v-model="selectedArtist"
              class="p-2 border rounded-md"
            >
              <option value="all">すべて</option>
              <option v-for="artist in availableArtists" :key="artist" :value="artist">
                {{ artist }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-if="paintingsStore.loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p>{{ t.ranking.loading }}</p>
      </div>
    </div>

    <div v-else-if="paintingsStore.error" class="flex-1 flex items-center justify-center">
      <div class="text-center text-red-500">
        <p>{{ paintingsStore.error }}</p>
        <button @click="paintingsStore.fetchPaintings(true)" class="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
          {{ t.quizSetup.error }}
        </button>
      </div>
    </div>

    <div v-else-if="currentPainting" class="flex-1 flex flex-col overflow-hidden">
      <div class="w-full max-w-2xl mx-auto flex-shrink-0 px-4">
        <div class="perspective-1000">
          <div 
            class="relative w-full h-96 transform-style-3d"
            :class="[
              { 'rotate-y-180': isFlipped },
              disableTransition ? '' : 'transition-transform duration-700'
            ]"
          >
            <!-- Card Front -->
            <div class="absolute w-full h-full backface-hidden border-2 border-gray-300 rounded-lg shadow-lg p-8 bg-gray-100 cursor-pointer"
                 @click="toggleFlip">
              <!-- 絵画 → 情報モード：絵画を表示 -->
              <div v-if="quizMode === 'painting-to-info'" class="w-full h-full flex items-center justify-center">
                <LazyImage
                  :src="currentPainting.image_url"
                  :alt="currentPainting.name"
                  :eager="true"
                  class="max-w-full max-h-full object-contain"
                />
              </div>
              <!-- 情報 → 絵画モード：情報を表示 -->
              <div v-else class="w-full h-full flex flex-col justify-center overflow-y-auto">
                <h3 class="text-2xl font-bold mb-4 text-center">{{ currentPainting.name }}</h3>
                <div class="space-y-2 text-left">
                  <p><strong>画家:</strong> {{ currentPainting.artist }}</p>
                  <p><strong>制作年:</strong> {{ currentPainting.year }}</p>
                  <p><strong>技法:</strong> {{ currentPainting.medium }}</p>
                  <p><strong>文化圏:</strong> {{ currentPainting.culture }}</p>
                  <p class="text-sm text-gray-600 mt-4">{{ currentPainting.description }}</p>
                </div>
              </div>
            </div>
            
            <!-- Card Back -->
            <div class="absolute w-full h-full backface-hidden rotate-y-180 border-2 border-gray-300 rounded-lg shadow-lg p-6 bg-gray-100 cursor-pointer"
                 @click="toggleFlip">
              <!-- 絵画 → 情報モード：情報を表示 -->
              <div v-if="quizMode === 'painting-to-info'" class="w-full h-full flex flex-col justify-center overflow-y-auto">
                <h3 class="text-2xl font-bold mb-4 text-center">{{ currentPainting.name }}</h3>
                <div class="space-y-2 text-left">
                  <p><strong>画家:</strong> {{ currentPainting.artist }}</p>
                  <p><strong>制作年:</strong> {{ currentPainting.year }}</p>
                  <p><strong>技法:</strong> {{ currentPainting.medium }}</p>
                  <p><strong>文化圏:</strong> {{ currentPainting.culture }}</p>
                  <p class="text-sm text-gray-600 mt-4">{{ currentPainting.description }}</p>
                </div>
              </div>
              <!-- 情報 → 絵画モード：絵画を表示 -->
              <div v-else class="w-full h-full flex items-center justify-center">
                <LazyImage
                  :src="currentPainting.image_url"
                  :alt="currentPainting.name"
                  :eager="true"
                  class="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="w-full max-w-2xl mx-auto px-4 flex-shrink-0">
        <div class="flex justify-between items-center mb-4 mt-4">
          <button 
            @click="prevPainting" 
            class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            aria-label="前の絵画へ"
          >
            {{ t.study.prev }}
          </button>
          <span class="text-lg font-semibold">
            {{ currentIndex + 1 }} / {{ filteredPaintings.length }}
          </span>
          <button 
            @click="nextPainting" 
            class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            aria-label="次の絵画へ"
          >
            {{ t.study.next }}
          </button>
        </div>
        <p class="text-sm text-gray-500 text-center mt-2">
          {{ t.study.keyboardHint }}
        </p>
      </div>

      <div class="flex-1 overflow-y-auto px-4 mt-4 pb-4">
        <div class="w-full max-w-2xl mx-auto grid gap-2"
             :class="quizMode === 'painting-to-info' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3'">
          <div
            v-for="(painting, index) in filteredPaintings"
            :key="painting.id"
            @click="goToPainting(index)"
            :class="{
              'border-4 border-purple-500': index === currentIndex,
              'border-4 border-transparent': index !== currentIndex,
            }"
            class="cursor-pointer rounded overflow-hidden hover:shadow-lg transition-shadow bg-gray-100 flex items-center justify-center p-1 box-border"
          >
            <LazyImage
              v-if="quizMode === 'painting-to-info'"
              :src="painting.image_url"
              :alt="painting.name"
              :eager="index === currentIndex"
              class="w-full h-full object-contain aspect-square"
            />
            <div
              v-else
              class="text-xs sm:text-sm font-medium text-center px-2 py-4"
            >
              <p class="font-bold">{{ painting.name }}</p>
              <p class="text-gray-600">{{ painting.artist }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <p class="text-gray-500">{{ t.ranking.noData }}</p>
    </div>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}

.transform-style-3d {
  transform-style: preserve-3d;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

.backface-hidden {
  backface-visibility: hidden;
}
</style>
