# 詳細設計書兼技術仕様書

## 1. 概要
本ドキュメントは、「国旗学習アプリ」の技術的な仕様とアーキテクチャを定義する。
デプロイ環境として Cloudflare を想定し、それに最適化された技術選定を行う。

## 2. データソース仕様

### 2.1. 国旗・国情報

*   **データファイル**: フロントエンドは `public/countries.ja.json` (日本語) および `public/countries.en.json` (英語) を静的データとして直接参照します。国旗画像は `public/flags/` に、地図画像は `public/maps/` に保存されます。
*   **情報ソース**: **Wikipedia, Wikidata, REST Countries API**
*   **理由**:
    *   「国旗の成り立ち」や歴史的背景など、アプリの目的に合致する網羅的な情報がWikipediaから得られるため。
    *   大陸情報や地図画像URLなど、Wikipediaのinfoboxから直接取得が難しい情報はWikidataやREST Countries APIで補完するため。
    *   一度JSONを生成すれば、実行時は外部に依存せず安定して高速に動作するため。

#### データ生成 (バッチ処理)
国データは、Wikipedia、Wikidata、REST Countries APIから情報を取得するバッチ処理によって自動生成します。

*   **目的**: 各種情報源から国情報を自動で取得し、フロントエンドが利用する多言語JSONファイルと国旗・地図画像を生成する。
*   **実行方法**: 開発者のPC上で手動実行するコマンドとして提供する。
  1.  **国名／国旗ページマッピングの生成**: 日本語版Wikipediaの「国旗の一覧」から国名（表示名）と、それに対応する国ページ／国旗ページのURLを抽出する。実行例:

    npx tsx scripts/extract-flag-page-names.mts

    このスクリプトは `scripts/flag-page-mapping.json` を生成します（キーは表示名、値は { countryPage, flagPage } 形式のURLオブジェクト）。
  2.  **国データの生成と画像ダウンロード**: `npm run batch:create-data`（`scripts/generate-data.mts` が `scripts/flag-page-mapping.json` を読み込みます）
*   **スクリプト配置**: プロジェクトルートに `scripts/extract-flag-page-names.mts`（国名／国旗ページマッピング生成）および `scripts/generate-data.mts`（データ生成）を配置する。
*   **使用技術**:
    *   **言語**: Node.js (TypeScript)
    *   **TypeScript実行環境**: **tsx**
    *   **Wikipediaクライアント**: **wikijs**
    *   **HTTPクライアント**: **node-fetch**
*   **処理フロー**:
  1.  `scripts/extract-flag-page-names.mts` が日本語版Wikipediaの「国旗の一覧」ページから、表示名（例: "タイ"）と対応する国ページおよび国旗ページのURLを抽出し、`scripts/flag-page-mapping.json` として保存します。
  2.  `scripts/generate-data.mts` が `scripts/flag-page-mapping.json` を読み込み、表示名をキーにマッピングを参照しつつ各国のデータを処理します（国ページ名と国旗ページ名が異なるケースに対応）。
    3.  各国のデータ取得では、日本語版Wikipedia (`ja.wikipedia.org`) と英語版Wikipedia (`en.wikipedia.org`) の両方から情報を取得します。
        -   日本語ページから言語間リンクを利用して対応する英語版ページ名を特定します。
        -   `wikijs` の `page.info()`、`page.summary()`、`page.section()` などのメソッドを使い、国名、首都、国旗画像URL、概要などの情報を抽出します。
        -   `page.info()` が返すデータ構造の多様性に対応するため、プロパティへのアクセスは防御的に行います。
        -   `page.section()` が特定のページでエラーを発生させる場合があるため、`try-catch` でハンドリングし、処理を続行します。
        -   **大陸情報**: まずWikipediaページのカテゴリHTML（`Category:〇〇の国` / `Countries in 〇〇`）から抽出します。複数の大陸カテゴリに属する国（オーストラリア、パナマなど）に対応するため、優先順位を設定しています（オセアニア、アフリカ、北アメリカ、南アメリカ、ヨーロッパ、アジア）。カテゴリから取得できない場合のみ、Wikidata API (P30 property) にフォールバックします。
        -   **地図画像URL**: WikipediaのinfoboxのHTMLを解析するか、REST Countries APIから取得します。
        -   **国旗の成り立ち・意味の解説**: 専用の国旗ページ（"Flag of [Country]"または"[国名]の国旗"）から取得し、`description` として利用します。
    4.  取得した国旗画像URLから画像をダウンロードし、`public/flags/` ディレクトリに保存します。`flag_image_url` はローカルパス (`/flags/jpn.svg` など) に変換されます。
    5.  取得した地図画像URLから画像をダウンロードし、`public/maps/` ディレクトリに保存します。`map_image_url` はローカルパス (`/maps/jpn.png` など) に変換されます。
    6.  整形した全国家のデータを `public/countries.ja.json` (日本語) および `public/countries.en.json` (英語) としてファイルに書き出します。
    7.  **各国の処理ごとにファイルに保存し、中断しても進捗を保持**するように実装されています。

*   **データ構造 (public/countries.ja.json / public/countries.en.json)**:
    ```json
    [
      {
        "id": "jpn",
        "name": "日本",
        "capital": "東京",
        "continent": "Asia",
        "flag_image_url": "/flags/jpn.svg",
        "map_image_url": "/maps/jpn.png",
        "description": "日本の国旗は「日章旗」と呼ばれ、太陽を象徴しています。...",
        "summary": "日本は東アジアに位置する島国です。..."
      },
      {
        "id": "usa",
        "name": "アメリカ合衆国",
        "capital": "ワシントンD.C.",
        "continent": "North America",
        "flag_image_url": "/flags/usa.svg",
        "map_image_url": "/maps/usa.png",
        "description": "アメリカ合衆国の国旗（アメリカがっしゅうこくのこっき、Flag of the United States）は、一般に星条旗（せいじょうき、the Stars and Stripes または the Star-Spangled Banner）と呼ばれる、13条の横縞と50個の星がデザインされた旗である。...",
        "summary": "アメリカ合衆国は、主に北アメリカに位置する国です。..."
      }
      // ... 他の国のデータ
    ]
    ```

### 2.2. ランキングデータ
*   **保存先**: **Cloudflare D1**
*   **理由**:
    *   デプロイ先である Cloudflare 環境でネイティブに動作するサーバーレスSQLデータベースであるため。
    *   使用フレームワークである Hono との親和性が非常に高い。
    *   「スコアでのソート」といったSQLクエリが必要なランキング機能の要件に合致するため。
*   **テーブル定義 (D1)**:
    
    **ranking_daily テーブル** (日次ランキング)
    | カラム名 | 型 | 説明 |
    | :--- | :--- | :--- |
    | `id` | INTEGER | 主キー (自動採番) |
    | `nickname` | TEXT | ユーザーニックネーム |
    | `score` | INTEGER | スコア |
    | `region` | TEXT | 出題範囲（地域）: 'all', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania' |
    | `format` | TEXT | クイズ形式: 'flag-to-name' (国旗→国名), 'name-to-flag' (国名→国旗) |
    | `date` | TEXT | 日付 (YYYY-MM-DD形式) |
    | `created_at` | TEXT | 登録日時 (ISO 8601形式) |
    | 備考 | - | 各挑戦ごとに記録される（UNIQUE制約なし） |

    **ranking_all_time テーブル** (全期間ランキング - 上位5位のみ保持)
    | カラム名 | 型 | 説明 |
    | :--- | :--- | :--- |
    | `id` | INTEGER | 主キー (自動採番) |
    | `nickname` | TEXT | ユーザーニックネーム |
    | `score` | INTEGER | スコア |
    | `region` | TEXT | 出題範囲（地域） |
    | `format` | TEXT | クイズ形式: 'flag-to-name', 'name-to-flag' |
    | `created_at` | TEXT | 登録日時 (ISO 8601形式) |

## 3. アーキテクチャと使用技術

### 3.1. 総合アーキテクチャ
*   **デプロイ環境**: **Cloudflare Pages**
*   **構成**:
    *   フロントエンド (Vue.js) とバックエンド (Hono) を一つのプロジェクトに統合。
    *   Cloudflare Pages の Functions 機能を利用し、特定パス (`/api/*`) へのアクセスをバックエンドAPI(Hono)が処理する構成とする。

### 3.2. フロントエンド技術
*   **UIフレームワーク**: **Vue.js** (v3, Composition API)
*   **状態管理**: **Pinia** (Vue公式の状態管理ライブラリ)
*   **スタイリング**: **Tailwind CSS** (ユーティリティファーストのCSSフレームワーク)
*   **ビルドツール**: **Vite** (Vueの標準ビルドツール)
*   **ルーティング**: **Vue Router**
*   **ローカルストレージ**: ニックネームの保持にlocalStorageを使用

#### 再利用可能コンポーネント
コードの重複を削減し、保守性を向上させるため、以下の共通コンポーネントを作成しています:

1. **LanguageSelector.vue** - 言語選択ドロップダウン
   - 日本語・英語の切り替え
   - 状態管理ストアと連携

2. **LoadingSpinner.vue** - ローディングスピナー
   - サイズのカスタマイズ可能 (sm, md, lg)
   - メッセージのカスタマイズ
   - フルスクリーン表示オプション

3. **ErrorMessage.vue** - エラーメッセージ表示
   - 統一されたエラー表示UI
   - 再試行ボタンのオプション対応

4. **RegionSelector.vue** - 地域選択ドロップダウン
   - 多言語対応の地域名表示
   - 国データから自動的に利用可能な地域を生成
   - v-modelによる双方向バインディング

5. **QuizFormatSelector.vue** - クイズ形式選択
   - セレクトボックス版とラジオボタン版の2つのバリアント
   - 「国旗→国名」「国名→国旗」の選択

6. **AppButton.vue** - 統一されたボタンコンポーネント
   - 6種類のバリアント (primary, secondary, success, danger, purple, gray)
   - 3種類のサイズ (sm, md, lg)
   - disabled状態の統一されたスタイル

7. **FlagCard.vue** - 国旗カード表示
   - 国旗画像の統一された表示
   - カード裏返し時の画像反転に対応

8. **CountryDetailCard.vue** - 国詳細情報カード
   - 国名、首都、大陸、地図、説明の表示
   - スクロール可能な説明文エリア

9. **LazyImage.vue** - 遅延読み込み画像コンポーネント
   - Intersection Observer API を使用した画像の遅延読み込み
   - ビューポートに入る50px手前から読み込み開始
   - 読み込み完了時のフェードイン効果
   - eagerオプションで即座読み込みもサポート

#### 学習モード (Study.vue)
*   **機能**:
    *   クイズ形式選択: 国旗→国名 / 国名→国旗
    *   地域別フィルタリング
    *   フラッシュカード形式での学習（クリックで裏返し）
    *   キーボード操作対応（矢印キー: 前後、スペース: 裏返し）
    *   国一覧表示: クイズ形式に応じて国旗または国名を表示
*   **UI最適化**:
    *   国旗→国名モード: 小さい正方形の国旗グリッド（5-10列）
    *   国名→国旗モード: 読みやすい幅の国名グリッド（2-5列）
    *   選択項目の強調表示（ボーダーサイズ固定でレイアウトシフト防止）

#### クイズプレイ画面 (QuizPlay.vue)
*   **機能**:
    *   キーボードとマウスの両方に対応した直感的な操作
    *   画像プリロードによるスムーズな問題遷移
    *   デバイスに応じた最適化されたUI/UX
*   **デスクトップUI**:
    *   キーボード操作（矢印キー: 選択肢移動、Enter: 回答送信）
    *   マウスホバーで選択状態を視覚的にフィードバック
    *   選択中の選択肢を青枠で強調表示
*   **モバイルUI**:
    *   デフォルトの強調表示なし（視覚的ノイズの削減）
    *   タップ時のみ一瞬（200ms）選択肢を強調表示
    *   タップ後すぐに次の問題へ遷移（リズムよく解答可能）

#### クイズ結果画面 (QuizResult.vue)
*   **レイアウト最適化**:
    *   スマホ・PC版ともにスコア表示のコロンを縦揃え（固定幅 w-32 使用）
    *   Flexboxによる中央揃えと右揃えの組み合わせ
    *   回答詳細の表示（国旗/国名、選択/正解を視覚的に表示）

#### ランキング画面 (Ranking.vue)
*   **表示最適化**:
    *   PC版: テーブル形式でスコア列を右揃え
    *   スマホ版: カード形式でスコアを右側に大きく表示
    *   地域別・形式別・タイプ別のフィルタリング
    *   トップ3のメダル表示

#### パフォーマンス最適化
*   **画像プリロード**: 次の問題の画像を事前に読み込み、スムーズな問題移行を実現
*   **画像優先読み込み**: `loading="eager"` と `fetchpriority="high"` 属性で即座に読み込み
*   **ビルド最適化**: `assetsInlineLimit: 0` でブラウザキャッシュを最大活用
*   **ローディング状態管理**: 画像読み込み完了まで選択肢を無効化
*   **遅延読み込み**: Intersection Observer API による画像の効率的な読み込み
*   **Service Worker**: Workbox によるオフライン対応とキャッシュ戦略
    *   国旗・地図画像: CacheFirst（30日間キャッシュ）
    *   JSON データ: StaleWhileRevalidate（24時間キャッシュ）
    *   自動更新: registerType 'autoUpdate' で新バージョンを自動適用
*   **PWA対応**: manifest.webmanifest でホーム画面追加とスタンドアロン動作をサポート

#### レスポンシブデザイン
*   **モバイルファースト**: スマホ表示を優先したUI設計
*   **適応的レイアウト**:
    *   **フォームコンポーネント**: スマホでは小さいパディング（`px-2 py-1.5`）、PC（md以上）では標準サイズ（`px-3 py-2`）
    *   **テキストサイズ**: スマホでは`text-sm`、PCでは`text-base`にレスポンシブ対応
    *   **ラベル表示**: ランキング画面ではスマホでラベルを非表示にしてコンパクトに、クイズ設定画面では常に表示
*   **ランキング表示の最適化**:
    *   **PC版**: テーブル形式で全情報を横並び表示
    *   **スマホ版**: カード形式で見やすく表示
      - 順位とニックネームを左側に配置
      - スコアを右側に大きく表示
      - 日時を小さく下部に配置
*   **バリデーションエラー表示**: alertダイアログの代わりに画面内にコンパクトに表示
    *   入力欄の枠線を赤色にして視覚的フィードバック
    *   エラーメッセージを入力欄の下に赤文字で表示
    *   入力開始時に自動的にエラークリア

### 3.3. バックエンド技術
*   **Webフレームワーク**: **Hono** (Cloudflare Workers/Pages に最適化された高速フレームワーク)
*   **データベース**: **Cloudflare D1**
*   **連携**: HonoからD1のデータベースにアクセスし、ランキングデータの読み書きを行う。
*   **API エンドポイント**:
    *   `GET /api/ranking?region={region}&type={daily|all_time}&format={flag-to-name|name-to-flag}`: 地域別・タイプ別・形式別ランキング取得
    *   `POST /api/ranking`: スコア登録（日次ランキングと全期間トップ5に記録、regionとformatを含む）

### 3.4. マイグレーション管理
*   **ツール**: Wrangler CLI
*   **マイグレーションファイル**: `migrations/` ディレクトリに配置
    *   `0000_initial_schema.sql`: 初期テーブル作成
    *   `0001_remove_unique_constraint.sql`: UNIQUE制約削除（各挑戦ごとに記録できるように変更）
*   **適用コマンド**: 
    *   ローカル: `npx wrangler d1 migrations apply national-flag-game-db --local`
    *   本番: `npx wrangler d1 migrations apply national-flag-game-db --remote`
*   **自動適用**: GitHub Actionsのデプロイワークフローで本番環境へのマイグレーションが自動実行される

### 3.5. 開発環境とコード品質

#### コード品質管理
*   **Linter & Formatter**: **Biome**
    *   ESLintとPrettierの代替として、10-100倍高速な処理速度を実現
    *   統一されたコードスタイルと品質基準の自動適用
    *   **設定ファイル**: `biome.json`

#### Biome設定の詳細

基本設定:
```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 120
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  }
}
```

**Vue特有の問題への対応:**

Vueコンポーネント（SFC）では、テンプレート内で使用されるコンポーネントやメソッドが静的解析で正しく検出されないことがあります。そのため、以下の設定でVueファイルのみ特別な扱いをしています:

```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedVariables": "off"  // アンダースコア自動追加を防止
      }
    }
  },
  "overrides": [
    {
      "includes": ["**/*.vue"],
      "linter": {
        "rules": {
          "correctness": {
            "noUnusedImports": "off"  // Vueファイルでimport削除を防止
          }
        }
      },
      "assist": {
        "enabled": false  // Vueファイルで自動整理を無効化
      }
    }
  ]
}
```

**設定の理由:**

1. **noUnusedVariables: off**
   - Vueテンプレートで使用されるメソッドが「未使用」と誤検出される問題に対応
   - 自動的に`_`プレフィックスが追加されることを防止
   - 例: `handleLoad` → `_handleLoad` のような意図しない変更を防ぐ

2. **noUnusedImports: off (Vueファイルのみ)**
   - テンプレートで使用されるコンポーネントのimportが削除される問題に対応
   - 例: `AppButton`, `LanguageSelector`などのコンポーネントimportを保持

3. **assist: false (Vueファイルのみ)**
   - `organizeImports`機能によるimport削除を完全に防止
   - TypeScript/Vue Language Serverからの警告は引き続き表示される

**実行コマンド:**
```bash
npm run lint         # チェックのみ
npm run lint:fix     # 自動修正
npm run format       # フォーマットのみ
```

#### Git Pre-commit Hooks
*   **ツール**: **husky** + **lint-staged**
*   **目的**: コミット前に自動的にコード品質チェック、フォーマット、テストを実行
*   **設定ファイル**: 
    *   `.husky/pre-commit`: フック実行スクリプト
    *   `package.json`: lint-staged設定

**pre-commitフックの処理フロー:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 1. フォーマット
echo "Running formatter..."
npm run format

# 2. リンター（自動修正）
echo "Running linter..."
npm run lint:fix

# 3. テスト実行
echo "Running tests..."
npm run test

# 4. ステージングされたファイルの最終チェック
npx lint-staged
```

**実行内容:**
1. **フォーマット**: 全ファイルをBiomeでフォーマット
2. **リンター**: 全ファイルをチェックし、自動修正可能な問題を修正
3. **テスト実行**: 全127件のテストを実行（失敗時はコミット中断）
4. **lint-staged**: ステージングされたファイルの最終確認

**lint-staged設定:**
```json
{
  "lint-staged": {
    "*.{js,ts,vue,json,mts}": [
      "biome check --write --unsafe --no-errors-on-unmatched"
    ]
  }
}
```

**動作:**
1. `git commit`実行時に自動的にトリガー
2. 全ファイルのフォーマットとリンターを実行
3. 全テスト（127件）を実行
4. ステージングされたファイルの最終チェック
5. すべて成功した場合のみコミットを許可

**メリット:**
- コミット前に品質が保証される
- 壊れたコードがリポジトリに入らない
- テストが失敗するコードはコミットできない
- チーム開発でのコード品質が統一される

**注意点:**
- テスト実行に数秒かかるため、コミットに時間がかかる
- テストが失敗するとコミットできない（意図的な挙動）
- 緊急時は `git commit --no-verify` でフックをスキップ可能

**セットアップ:**
```bash
npm install           # huskyが自動的にフックを設定
npm run prepare       # 手動でフックを再設定する場合
```

#### テスト環境
*   **テストフレームワーク**: **Vitest**
*   **コンポーネントテスト**: **@vue/test-utils**
*   **DOM環境**: **happy-dom** (高速なDOM実装)
*   **カバレッジ**: Vitestの組み込みカバレッジ機能

**テスト実行コマンド:**
```bash
npm run test              # 全テスト実行
npm run test:ui           # UIモードで実行
npm run test:coverage     # カバレッジ計測
```

**テスト構成:**
- ストアテスト: `src/store/__tests__/`
- コンポーネントテスト: `src/components/__tests__/`
- ビューテスト: `src/views/__tests__/`
- ユーティリティテスト: `src/utils/__tests__/`
- バックエンドテスト: `functions/api/__tests__/`

**総テスト数: 127件** (2025年11月時点)
- ストアテスト: 32件
- コンポーネントテスト: 11件
- ビューテスト: 58件 (Ranking.test.ts 14件を含む)
- ユーティリティテスト: 16件
- バックエンドテスト: 10件

#### 型安全性
*   **TypeScript**: strict モード有効
*   **設定ファイル**: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
*   **型チェック**: `vue-tsc` によるビルド時型チェック
*   **Workers型定義**: `@cloudflare/workers-types` でCloudflare環境の型サポート

---

## 12. タイムゾーンと国際化の仕様

### 12.1. タイムゾーン管理

#### 基本方針
アプリケーション全体で**日本時間（JST, UTC+9）**を基準とします。

#### データベース（Cloudflare D1）
*   **ranking_daily.date**: `date('now', '+9 hours')` で日本時間の日付を保存
*   **ranking_daily.created_at**: `datetime('now')` でUTC時刻を保存
*   **ranking_all_time.created_at**: `datetime('now')` でUTC時刻を保存

#### APIサーバー（functions/api/server.ts）

**ランキング登録:**
```typescript
// 日本時間の日付でランキングデータを登録
await c.env.DB.prepare(
  `INSERT INTO ranking_daily (nickname, score, region, format, date, created_at) 
   VALUES (?, ?, ?, ?, date('now', '+9 hours'), ?)`
)
.bind(sanitizedNickname, score, region, format, now)
.run();
```

**ランキング取得:**
```typescript
// 日本時間の日付でフィルタリング
query = `SELECT nickname, score, created_at FROM ranking_daily 
         WHERE region = ? AND format = ? AND date = date('now', '+9 hours')
         ORDER BY score DESC, created_at ASC LIMIT ?`;
```

#### フロントエンド（日時表示）

**`src/utils/formatters.ts`:**
- **日本語版**: `2025-11-10 08:43:54` (タイムゾーン表示なし)
- **英語版**: `2025-11-10 08:43:54 JST` (タイムゾーン表示あり)

```typescript
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo', // 日本時間で統一
  };
  
  if (countriesStore.currentLanguage === 'ja') {
    // タイムゾーン表示なし
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } else {
    // JST表示あり
    return `${year}-${month}-${day} ${hour}:${minute}:${second} JST`;
  }
}
```

### 12.2. 言語設定の永続化

#### 基本方針
ユーザーの言語設定を**localStorage**で永続化し、ページリロード後も設定を維持します。

#### 実装（src/store/countries.ts）

**初期化:**
```typescript
function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'ja'; // SSR対応
  const saved = localStorage.getItem('language');
  return (saved === 'en' || saved === 'ja') ? saved : 'ja';
}

export const useCountriesStore = defineStore('countries', {
  state: () => ({
    currentLanguage: getInitialLanguage(), // localStorageから読み込み
  }),
});
```

**言語変更:**
```typescript
setLanguage(lang: Language) {
  if (this.currentLanguage !== lang) {
    this.currentLanguage = lang;
    // localStorageに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
    this.fetchCountries(true);
  }
}
```

**動作:**
1. 初回訪問: デフォルトで日本語
2. 言語変更: `localStorage.setItem('language', 'ja' | 'en')`
3. ページリロード: `localStorage.getItem('language')` から復元
4. 全ページで言語設定が保持される

#### SSR対応
`typeof window === 'undefined'` でサーバーサイド実行時の判定を行い、エラーを防止します。

---

```

````
```
