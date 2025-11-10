# デプロイガイド

## 概要
このドキュメントでは、国旗学習アプリを Cloudflare Pages にデプロイする手順を説明します。

## 前提条件

- Cloudflare アカウント（無料プランで可）
- Node.js と npm がインストール済み
- プロジェクトがビルド可能な状態

## デプロイ手順

### 1. Cloudflare にログイン

```bash
npx wrangler login
```

ブラウザが開き、Cloudflare アカウントでの認証を求められます。認証を完了してください。

### 2. D1 データベースの作成（初回のみ）

```bash
npx wrangler d1 create world-flags-learning-db
```

コマンド実行後、以下のような出力が表示されます：

```
✅ Successfully created DB 'world-flags-learning-db'

[[d1_databases]]
binding = "DB"
database_name = "world-flags-learning-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

この `database_id` をコピーして、`wrangler.toml` ファイルに設定してください：

```toml
[[d1_databases]]
binding = "DB"
database_name = "world-flags-learning-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ここに実際のIDを貼り付け
preview_database_id = "local-db"
```

### 3. データベースマイグレーションの適用（初回のみ）

```bash
npx wrangler d1 migrations apply world-flags-learning-db --remote
```

`--remote` フラグを指定することで、本番環境のデータベースにマイグレーションが適用されます。

以下のテーブルが作成されます：
- `ranking_daily`: 日次ランキング（nickname, region, format, date ごとに UNIQUE）
- `ranking_all_time`: 全期間ランキング（region と format ごとのベストスコア）

### 4. ビルドとデプロイ

```bash
npm run deploy
```

このコマンドは以下を自動的に実行します：
1. TypeScript のコンパイル（`vue-tsc -b`）
2. プロダクションビルド（`vite build`）
3. Cloudflare Pages へのデプロイ（`wrangler pages deploy dist`）

デプロイが完了すると、以下のような出力が表示されます：

```
✨ Deployment complete! Take a peek over at https://xxxxxxxx.world-flags-learning.pages.dev
```

### 5. D1 バインディングの設定（初回のみ）

Cloudflare Pages Functions で D1 データベースを使用するには、ダッシュボードでバインディングを設定する必要があります。

#### 手順：

1. **Cloudflare ダッシュボードにアクセス**
   ```
   https://dash.cloudflare.com/
   ```

2. **プロジェクトを選択**
   - 左メニューから **Workers & Pages** をクリック
   - **world-flags-learning** プロジェクトを選択

3. **Settings タブに移動**
   - 上部の **Settings** タブをクリック

4. **Functions セクションまでスクロール**
   - **Functions** セクションを見つける
   - **D1 database bindings** を探す

5. **バインディングを追加**
   - **Add binding** ボタンをクリック
   - **Variable name**: `DB` と入力
   - **D1 database**: ドロップダウンから `world-flags-learning-db` を選択
   - **Save** をクリック

6. **設定の反映を待つ**
   - 設定が反映されるまで数分かかる場合があります
   - ページをリロードして動作を確認してください

### 6. 動作確認

デプロイされたアプリケーションにアクセスして、以下を確認してください：

- ✅ トップページが正常に表示される
- ✅ 言語切り替えが動作する
- ✅ 学習モードで国データが表示される
- ✅ クイズが正常に動作する
- ✅ ランキングが表示される
- ✅ スコアが正常に送信される

## デプロイコマンド一覧

```bash
# 本番環境へデプロイ（ビルド + デプロイ）
npm run deploy

# プレビュー環境へデプロイ
npm run deploy:preview

# ビルドのみ
npm run build

# ローカルでビルド結果をプレビュー
npm run preview
```

## トラブルシューティング

### D1_ERROR: no such table エラーが発生する

**原因**: D1 バインディングが設定されていないか、マイグレーションが適用されていない

**解決方法**:
1. マイグレーションが適用されているか確認:
   ```bash
   npx wrangler d1 migrations list world-flags-learning-db --remote
   ```
2. 適用されていない場合は実行:
   ```bash
   npx wrangler d1 migrations apply world-flags-learning-db --remote
   ```
3. Cloudflare ダッシュボードで D1 バインディングが設定されているか確認

### 画像が表示されない

**原因**: 静的ファイルが正しくデプロイされていない

**解決方法**:
1. `public/flags/` と `public/maps/` に画像ファイルが存在するか確認
2. ビルド後の `dist/` ディレクトリに画像がコピーされているか確認
3. 再ビルド・再デプロイを試す:
   ```bash
   npm run deploy
   ```

### API エラーが発生する

**原因**: Cloudflare Pages Functions が正しく動作していない

**解決方法**:
1. `functions/api/[[path]].ts` が存在するか確認
2. デプロイログで Functions のアップロードが成功しているか確認
3. Cloudflare ダッシュボードで Functions のログを確認

## 継続的デプロイ（CI/CD）

GitHub などのリポジトリと連携することで、自動デプロイを設定できます：

1. Cloudflare ダッシュボードで **Workers & Pages** に移動
2. **Create application** → **Pages** → **Connect to Git**
3. リポジトリを選択し、以下を設定:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**: 必要に応じて設定

これにより、`main` ブランチへのプッシュで自動的にデプロイされるようになります。

## セキュリティ考慮事項

- **環境変数**: 機密情報は `wrangler.toml` に直接記述せず、Cloudflare ダッシュボードの環境変数設定を使用してください
- **API レート制限**: 必要に応じて Cloudflare の Rate Limiting 機能を有効化してください
- **CORS 設定**: API が適切な CORS ヘッダーを返すことを確認してください

## 本番環境の監視

Cloudflare ダッシュボードで以下を監視できます：

- **Analytics**: アクセス数、帯域幅使用量
- **Logs**: Functions の実行ログ、エラーログ
- **D1 Metrics**: データベースのクエリ数、実行時間

## まとめ

この手順に従うことで、国旗学習アプリを Cloudflare Pages に正常にデプロイできます。初回デプロイ後は、`npm run deploy` コマンドだけで更新をデプロイできます。
