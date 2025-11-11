````markdown
# 国旗由来情報の抽出 - 使用ガイド

## 1. 概要

このガイドでは、改善された国旗情報バッチスクリプトを使用して、情報が不足している国の国旗由来の説明を再生成する方法を説明します。

## 2. 現在のワークフロー

### 2.1. データ生成の流れ

1. **国名／国旗ページマッピングの生成**（任意）
   - 日本語版Wikipediaの「国旗の一覧」ページから表示名と対応する国ページ・国旗ページのURLを抽出
   - 実行コマンド: `npx tsx scripts/extract-flag-page-names.mts`
   - 出力: `scripts/flag-page-mapping.json`

2. **国データの生成**
   - マッピングファイルを読み込み、各国のデータを処理
   - 実行コマンド: `npm run batch:create-data`
   - 出力: `public/countries.ja.json`, `public/countries.en.json`

### 2.2. マッピングファイルの構造

`scripts/flag-page-mapping.json`は以下の形式です：

```json
{
  "タイ": {
    "countryPage": "https://ja.wikipedia.org/wiki/%E3%82%BF%E3%82%A4%E7%8E%8B%E5%9B%BD",
    "flagPage": "https://ja.wikipedia.org/wiki/%E3%82%BF%E3%82%A4%E3%81%AE%E5%9B%BD%E6%97%97"
  }
}
```

- **キー**: 表示名（例: "タイ"）
- **値**: 国ページと国旗ページのURL（エンコード済み）

これにより、表示名（"タイ"）と実際のページ名（"タイ王国"）が異なる場合でも正確に処理できます。

## 3. 実装された改善点

### 3.1. 国名の正規化

スクリプトは以下のような特殊な接頭辞を持つ国名を正しく処理します：

- "the"（例: "The Bahamas" → "Flag of The Bahamas" と "Flag of Bahamas" の両方を試行）
- "Republic of"（例: "Republic of Ireland" → "Flag of Ireland"）
- "Democratic Republic of"
- "Federated States of"
- その他多数

### 3.2. 複数のページ名バリエーション

最初のページ名が存在しない場合、スクリプトは自動的に代替バリエーションを試行します。

### 3.3. HTMLクリーンアップ

抽出されたテキストは以下を削除してクリーンアップされます：

- HTMLタグとリンク
- 引用注釈（[1], [2], [[1]], [citation needed]など）
- 余分な空白

## 4. 使用方法

### 4.1. 全国のデータを再生成

全ての国のデータを再生成するには、マッピングファイルが存在することを確認してから、データジェネレーターを実行します：

#### ステップ1: 国名／国旗ページマッピングの生成（任意）

```bash
npx tsx scripts/extract-flag-page-names.mts
```

このコマンドは `scripts/flag-page-mapping.json` を生成します。このファイルは、表示名を `{ countryPage, flagPage }` 形式のURLオブジェクトにマッピングします。

#### ステップ2: データ生成バッチの実行

```bash
npm run batch:create-data
```

**警告**: このコマンドは全ての国を処理し、Wikipedia APIのレート制限を尊重するため、30〜60分かかります。

### 4.2. 特定の国のみを再生成

英語の説明が不足している特定の国のみを更新するには：

```bash
# アメリカ合衆国を更新
npm run batch:create-data "アメリカ"

# アイルランドを更新
npm run batch:create-data "アイルランド"

# 複数の国を更新する場合は、コマンドを複数回実行
npm run batch:create-data "イギリス"
npm run batch:create-data "オランダ"
```

スクリプトは `scripts/flag-page-mapping.json` から国の表示名を検索し、ターゲット文字列を渡すと完全一致／前方一致／部分一致（この順序）をサポートします。

## 5. 期待される結果

国のスクリプトを実行すると、以下のようなコンソール出力が表示されます：

```
Processing タイ王国...
  ✓ Capital (JA): バンコク
  ✓ Capital (EN): Bangkok
  ✓ Continent (JA): アジア
  ✓ Continent (EN): Asia
  ✓ Map image found
  ✓ Map image downloaded: /maps/thailand.png
  ✓ Found flag page from mapping: "タイの国旗"
  ✓ Flag description (ja): 219 chars
  ✓ Flag description (en): 786 chars
  ✓ Updated タイ in countries.ja.json
  ✓ Updated Thailand in countries.en.json
  ✓ Saved to files (Total: 198 countries)
```

重要な行は `✓ Found flag page from mapping: "タイの国旗"` で、どのWikipediaページが正常に見つかったかを示します。

## 6. 検証方法

バッチスクリプトを実行した後、結果を検証できます：

### 6.1. JSONファイルの確認

```bash
# タイに説明が含まれているか確認
jq '.[] | select(.id == "thailand") | .description' public/countries.ja.json
```

### 6.2. 空の説明を持つ国の数をカウント

```bash
# 全ての国が処理された後は0を表示するはず
jq '[.[] | select(.description == "")] | length' public/countries.ja.json
```

### 6.3. 学習モードで確認

開発サーバーを起動して、学習モードで国旗の説明を確認します。

## 7. トラブルシューティング

### 7.1. Wikipedia APIのレート制限

レート制限に関するエラーが表示される場合、スクリプトにはリクエスト間に500msの遅延が含まれています。`scripts/generate-data.mts` のメインループの最後にある遅延を増やすことで、この値を増やすことができます。

### 7.2. ネットワークの問題

Wikipediaに到達できない場合、以下のようなエラーメッセージが表示されます：

```
- Error getting flag description: request to https://en.wikipedia.org/... failed
```

安定したインターネット接続があることを確認し、ファイアウォールによってWikipediaがブロックされていないことを確認してください。

### 7.3. ページが見つからない

国旗ページがWikipediaに実際に存在しない場合、以下のメッセージが表示されます：

```
- No flag page found for "国名" (tried 4 variations)
```

これは、専用の国旗ページを持たない一部の地域や特別行政区では正常です。

## 8. テスト

改善点は19のユニットテストで完全にテストされています：

- 様々なWikipedia形式でのHTMLクリーニング
- 全20の問題のある国の国名正規化
- 実際のWikipedia HTML抽出との統合

テストの実行：

```bash
npm test scripts/__tests__/generate-data.test.ts
```

全てのテストが合格するはずです（19/19）。

````
