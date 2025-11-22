import { defineStore } from 'pinia';
import { type Painting, usePaintingsStore } from './paintings';

// 絵画クイズ用の問題型定義
export interface PaintingQuestion {
  correctAnswer: Painting;
  artistOptions: string[]; // アーティスト名の選択肢（4つ）
  titleOptions: string[]; // タイトルの選択肢（4つ）
}

// 回答履歴の型定義
export interface PaintingAnswerRecord {
  question: PaintingQuestion;
  selectedArtist: string;
  selectedTitle: string;
  isArtistCorrect: boolean;
  isTitleCorrect: boolean;
  isFullyCorrect: boolean; // 両方正解
}

export const usePaintingQuizStore = defineStore('paintingQuiz', {
  state: () => ({
    nickname: 'Guest',
    numberOfQuestions: 5, // 問題数
    questions: [] as PaintingQuestion[],
    currentQuestionIndex: 0,
    correctAnswers: 0, // 完全正解（アーティストとタイトル両方正解）の数
    startTime: 0,
    endTime: 0,
    answerHistory: [] as PaintingAnswerRecord[], // 回答履歴
  }),
  actions: {
    generateQuestions() {
      const paintingsStore = usePaintingsStore();
      if (paintingsStore.paintings.length === 0) {
        return;
      }

      const allPaintings = paintingsStore.paintings;

      // 実際の問題数を決定
      const actualNumberOfQuestions = Math.min(this.numberOfQuestions, allPaintings.length);

      // ランダムに絵画を選択
      const selectedPaintings = [...allPaintings].sort(() => 0.5 - Math.random()).slice(0, actualNumberOfQuestions);

      this.questions = selectedPaintings.map((correctPainting) => {
        // アーティストの選択肢を生成（正解 + 3つの不正解）
        const allArtists = [...new Set(allPaintings.map((p) => p.artist))];
        const otherArtists = allArtists
          .filter((artist) => artist !== correctPainting.artist)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
        const artistOptions = [...otherArtists, correctPainting.artist].sort(() => 0.5 - Math.random());

        // タイトルの選択肢を生成（正解 + 3つの不正解）
        // 同じアーティストの作品があれば優先的に選択（紛らわしくするため）
        const sameArtistPaintings = allPaintings.filter(
          (p) => p.artist === correctPainting.artist && p.id !== correctPainting.id
        );
        const otherPaintings = allPaintings.filter(
          (p) => p.id !== correctPainting.id && p.artist !== correctPainting.artist
        );

        const titleCandidates = [
          ...sameArtistPaintings.slice(0, 2), // 同じアーティストから最大2つ
          ...otherPaintings, // 他の絵画
        ];

        const otherTitles = titleCandidates
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map((p) => p.name);

        const titleOptions = [...otherTitles, correctPainting.name].sort(() => 0.5 - Math.random());

        return {
          correctAnswer: correctPainting,
          artistOptions,
          titleOptions,
        };
      });
    },
    setupQuiz(nickname: string, numQuestions: number) {
      this.nickname = nickname;
      this.numberOfQuestions = numQuestions;
      this.generateQuestions();
      this.answerHistory = []; // クイズ設定時に履歴をリセット
    },
    startQuiz() {
      this.correctAnswers = 0;
      this.currentQuestionIndex = 0;
      this.startTime = Date.now();
      this.endTime = 0;
    },
    answerQuestion(selectedArtist: string, selectedTitle: string) {
      const currentQuestion = this.questions[this.currentQuestionIndex];
      if (!currentQuestion) {
        return;
      }

      const isArtistCorrect = selectedArtist === currentQuestion.correctAnswer.artist;
      const isTitleCorrect = selectedTitle === currentQuestion.correctAnswer.name;
      const isFullyCorrect = isArtistCorrect && isTitleCorrect;

      this.answerHistory.push({
        question: currentQuestion,
        selectedArtist,
        selectedTitle,
        isArtistCorrect,
        isTitleCorrect,
        isFullyCorrect,
      });

      if (isFullyCorrect) {
        this.correctAnswers++;
      }

      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++;
      } else {
        this.endQuiz();
      }
    },
    endQuiz() {
      this.endTime = Date.now();
    },
  },
  getters: {
    totalTime: (state) => {
      if (state.startTime === 0 || state.endTime === 0) {
        return 0;
      }
      return (state.endTime - state.startTime) / 1000; // 秒単位
    },
    finalScore: (state) => {
      if (state.startTime === 0 || state.endTime === 0) return 0;
      const time = (state.endTime - state.startTime) / 1000;
      // スコア = (完全正解数 * 1000) - (回答時間[秒] * 10)
      // 部分正解の場合は半分の得点を追加
      const partialCorrectCount = state.answerHistory.filter(
        (r) => !r.isFullyCorrect && (r.isArtistCorrect || r.isTitleCorrect)
      ).length;
      const totalPoints = state.correctAnswers * 1000 + partialCorrectCount * 500;
      return Math.max(0, totalPoints - Math.round(time) * 10);
    },
    currentQuestion: (state): PaintingQuestion | null => {
      if (state.questions.length === 0) return null;
      return state.questions[state.currentQuestionIndex] ?? null;
    },
  },
});
