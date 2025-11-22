import { defineStore } from 'pinia';

// 絵画データの型定義
export interface Painting {
  id: string;
  name: string;
  artist: string;
  year: string;
  medium: string;
  image_url: string;
  description: string;
  culture: string;
}

export type Language = 'ja' | 'en';

// localStorageから言語設定を読み込む
function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'ja'; // SSR対応
  const saved = localStorage.getItem('language');
  return saved === 'en' || saved === 'ja' ? saved : 'ja';
}

export const usePaintingsStore = defineStore('paintings', {
  state: () => ({
    paintings: [] as Painting[],
    loading: false,
    error: null as string | null,
    currentLanguage: getInitialLanguage(), // localStorageから読み込み
  }),
  actions: {
    async fetchPaintings(forceReload: boolean = false) {
      if (this.paintings.length > 0 && !forceReload) {
        return; // 既に読み込み済みの場合は何もしない (強制リロードでない場合)
      }
      this.loading = true;
      this.error = null;
      try {
        const filename = `paintings.${this.currentLanguage}.json`;
        const response = await fetch(`/${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch paintings data for ${this.currentLanguage}`);
        }
        const data = await response.json();
        this.paintings = data;
      } catch (e: any) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    setLanguage(lang: Language) {
      if (this.currentLanguage !== lang) {
        this.currentLanguage = lang;
        // localStorageに保存
        if (typeof window !== 'undefined') {
          localStorage.setItem('language', lang);
        }
        this.fetchPaintings(true); // 言語が変わったら強制的に再読み込み
      }
    },
  },
  getters: {
    getPaintingById: (state) => (id: string) => {
      return state.paintings.find((painting) => painting.id === id);
    },
    // クイズ用のランダムな絵画リストを取得するゲッター
    getRandomPaintings: (state) => (count: number, excludeId?: string) => {
      const filteredPaintings = excludeId ? state.paintings.filter((p) => p.id !== excludeId) : state.paintings;
      const shuffled = [...filteredPaintings].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    },
    // ユニークなアーティストリストを取得
    getUniqueArtists: (state) => {
      const artists = state.paintings.map((p) => p.artist);
      return [...new Set(artists)];
    },
  },
});
