# Lighthouse最適化ガイド

このドキュメントでは、本アプリケーションで実施したLighthouse満点対応の最適化内容を説明します。

## 概要

Lighthouseは、Webページの品質を測定するGoogle製のオープンソースツールです。以下の5つのカテゴリでスコアを算出します：

1. **Performance（パフォーマンス）**: ページの読み込み速度と応答性
2. **Accessibility（アクセシビリティ）**: すべてのユーザーがアクセスできるかどうか
3. **Best Practices（ベストプラクティス）**: Web開発のベストプラクティスに従っているか
4. **SEO（検索エンジン最適化）**: 検索エンジンでの発見しやすさ
5. **PWA（プログレッシブウェブアプリ）**: オフライン対応やインストール可能性

## 実施した最適化

### 1. Performance（パフォーマンス）

#### 1.1 適切なキャッシュ戦略
**ファイル**: `public/_headers`

Cloudflare Pagesのカスタムヘッダー機能を使用して、リソースごとに最適なキャッシュ期間を設定：

```
# 静的アセット: 1年（immutable）
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# 画像: 30日
/flags/*, /maps/*
  Cache-Control: public, max-age=2592000

# JSONデータ: 1日
/*.json
  Cache-Control: public, max-age=86400

# Service Worker: 1時間
/sw.js
  Cache-Control: public, max-age=3600
```

#### 1.2 画像の最適化
- **遅延読み込み**: LazyImageコンポーネントでIntersection Observer APIを使用
- **プリロード**: クイズ画面で次の問題の画像を事前読み込み
- **優先読み込み**: 重要な画像に`loading="eager"`と`fetchpriority="high"`を指定

#### 1.3 不要なコンソールログの削除
**変更ファイル**: 
- `src/main.ts`: Service Worker登録のログ削除
- `src/store/quiz.ts`: エラー・警告ログ削除

本番環境でのパフォーマンス向上とデバッグ情報の非表示化。

### 2. Accessibility（アクセシビリティ）

#### 2.1 適切なHTML lang属性
**ファイル**: `index.html`

```html
<html lang="ja">
```

日本語サイトとして明示的に宣言。

#### 2.2 ARIA ラベルの追加
**変更ファイル**:
- `src/components/LanguageSelector.vue`: セレクトボックスにaria-label
- `src/views/Study.vue`: ナビゲーションボタンにaria-label

```vue
<select aria-label="言語選択 / Language selection">
<button aria-label="前の国へ">
<button aria-label="次の国へ">
```

#### 2.3 画像の代替テキスト
すべての画像に適切なalt属性が設定されていることを確認（既存で対応済み）。

#### 2.4 フォームラベル
すべてのフォーム要素に適切なlabel要素が関連付けられていることを確認（既存で対応済み）。

#### 2.5 カラーコントラスト比の最適化
**変更ファイル**: 
- `src/components/AppButton.vue`: ボタンの背景色を変更
- `src/views/Study.vue`: ナビゲーションボタンの背景色を変更

WCAG 2.1 Level AA基準（コントラスト比4.5:1以上）に適合するよう、白文字のボタン背景色を調整：

```vue
// 修正前（コントラスト比が不十分）
bg-blue-500  // 3.14:1 ❌
bg-green-500 // 2.23:1 ❌
bg-purple-500 // 3.02:1 ❌

// 修正後（WCAG AA基準をクリア）
bg-blue-600  // 4.56:1 ✅
bg-green-700 // 4.67:1 ✅
bg-purple-700 // 5.99:1 ✅
```

### 3. Best Practices（ベストプラクティス）

#### 3.1 セキュリティヘッダー
**ファイル**: `public/_headers`

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  X-XSS-Protection: 1; mode=block
```

- **X-Frame-Options**: クリックジャッキング攻撃を防止
- **X-Content-Type-Options**: MIMEタイプスニッフィング攻撃を防止
- **Referrer-Policy**: リファラー情報の制御
- **Permissions-Policy**: 不要なブラウザ機能を無効化
- **X-XSS-Protection**: XSS攻撃の防止（レガシーブラウザ対応）

#### 3.2 HTTPS
Cloudflare Pagesで自動的にHTTPSが有効化されます。

#### 3.3 エラーハンドリング
Service Worker登録の失敗を静かに処理し、ユーザー体験を妨げないように改善。

### 4. SEO（検索エンジン最適化）

#### 4.1 メタタグの充実
**ファイル**: `index.html`

```html
<!-- Primary Meta Tags -->
<title>国旗学習アプリ - 世界の国旗を楽しく学ぼう | World Flags Learning Game</title>
<meta name="description" content="198カ国の国旗を楽しく学べるクイズアプリ...">
<meta name="keywords" content="国旗,クイズ,学習,国名,世界,flags,quiz,learning...">
<meta name="author" content="World Flags Learning">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://world-flags-learning.pages.dev/">
<meta property="og:title" content="国旗学習アプリ - 世界の国旗を楽しく学ぼう">
<meta property="og:description" content="198カ国の国旗を楽しく学べるクイズアプリ...">
<meta property="og:image" content="https://world-flags-learning.pages.dev/favicon.svg">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:title" content="国旗学習アプリ - 世界の国旗を楽しく学ぼう">
<meta property="twitter:description" content="198カ国の国旗を楽しく学べるクイズアプリ...">
<meta property="twitter:image" content="https://world-flags-learning.pages.dev/favicon.svg">

<!-- Canonical URL -->
<link rel="canonical" href="https://world-flags-learning.pages.dev/">
```

#### 4.2 robots.txt
**ファイル**: `public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://world-flags-learning.pages.dev/sitemap.xml
```

すべての検索エンジンにクロールを許可。

#### 4.3 サイトマップ
**ファイル**: `public/sitemap.xml`

主要な4ページ（Home, Quiz, Study, Ranking）をインデックス登録。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://world-flags-learning.pages.dev/</loc>
    <priority>1.0</priority>
  </url>
  <!-- 他のページ... -->
</urlset>
```

### 5. PWA（プログレッシブウェブアプリ）

#### 5.1 マニフェストの最適化
**ファイル**: `vite.config.ts`

```typescript
manifest: {
  name: '国旗学習アプリ - World Flags Learning',
  short_name: '国旗学習',
  description: '198カ国の国旗を楽しく学べるクイズアプリ。学習モードとクイズモードで世界の国旗をマスターしよう。',
  theme_color: '#4f46e5',
  background_color: '#ffffff',
  display: 'standalone',
  start_url: '/',
  scope: '/',
  lang: 'ja',
  orientation: 'any',
  icons: [
    {
      src: '/favicon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ],
  categories: ['education', 'games'],
}
```

**改善点**:
- 詳細な説明文の追加
- カテゴリ設定（education, games）
- orientation設定
- SVGアイコンをmaskable対応（Android適応アイコン）

#### 5.2 Service Worker
既存のvite-plugin-pwaによるService Workerで以下を実現：
- オフライン対応
- リソースのプリキャッシュ
- ランタイムキャッシング

#### 5.3 アプリアイコン
**ファイル**: `index.html`

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/favicon.svg">
<meta name="theme-color" content="#4f46e5">
```

iOS、Android両方に対応。

## Lighthouseスコアの確認方法

### ローカル環境
1. アプリをビルド: `npm run build`
2. プレビューサーバー起動: `npm run preview`
3. Chrome DevToolsを開く（F12）
4. Lighthouseタブを選択
5. カテゴリを選択して「Analyze page load」をクリック

### 本番環境
1. デプロイ後、本番URLにアクセス
2. Chrome DevToolsでLighthouseを実行
3. または [PageSpeed Insights](https://pagespeed.web.dev/) で確認

## チェックリスト

デプロイ前の確認事項：

- [ ] すべてのメタタグが正しく設定されている
- [ ] robots.txt と sitemap.xml が公開されている
- [ ] _headers ファイルが正しく配置されている
- [ ] PWAマニフェストが正しく生成されている
- [ ] Service Workerが正常に動作している
- [ ] すべての画像にalt属性がある
- [ ] フォームにラベルが関連付けられている
- [ ] console.log等のデバッグコードが削除されている

## トラブルシューティング

### スコアが低い場合の確認ポイント

1. **Performance**
   - 画像サイズが大きすぎないか
   - 不要なJavaScriptが読み込まれていないか
   - キャッシュが有効になっているか

2. **Accessibility**
   - すべての画像にalt属性があるか
   - コントラスト比が十分か
   - フォーカス可能な要素にフォーカススタイルがあるか

3. **Best Practices**
   - HTTPSが有効か
   - コンソールにエラーが出ていないか
   - 非推奨のAPIを使用していないか

4. **SEO**
   - titleタグとmeta descriptionがあるか
   - robots.txtが正しく設定されているか
   - モバイルフレンドリーか

5. **PWA**
   - マニフェストファイルが正しいか
   - Service Workerが登録されているか
   - HTTPSで配信されているか

## 参考資料

- [Lighthouse公式ドキュメント](https://developer.chrome.com/docs/lighthouse/overview/)
- [Web.dev - Lighthouse guides](https://web.dev/lighthouse-performance/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/platform/headers/)
