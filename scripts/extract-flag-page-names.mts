import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';

interface CountryMapping {
  countryPage: string;
  flagPage: string;
}

/**
 * 「国旗の一覧」ページから各国の国旗ページ名を抽出してマッピングJSONを生成
 * テーブル構造: 1列目=国旗ページリンク、3列目=国ページリンク
 */
const extractFlagPageNames = async () => {
  const url =
    'https://ja.wikipedia.org/w/api.php?action=parse&page=%E5%9B%BD%E6%97%97%E3%81%AE%E4%B8%80%E8%A6%A7&prop=text&format=json&origin=*';

  try {
    const response = await fetch(url);
    const data: any = await response.json();

    if (!data.parse?.text) {
      console.error('Failed to fetch page content');
      return;
    }

    const htmlText = data.parse.text['*'];

    // テーブル行を抽出（<tr>タグで囲まれた部分）
    const rowRegex = /<tr>(.*?)<\/tr>/gs;
    const rows = [...htmlText.matchAll(rowRegex)];

    const mapping: Record<string, CountryMapping> = {};

    for (const row of rows) {
      const rowHtml = row[1];

      // 各行から<td>要素を抽出
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gs;
      const cells = [...rowHtml.matchAll(cellRegex)];

      if (cells.length < 3) continue; // 少なくとも3列必要

      // 1列目の構造: <td><b><a href="/wiki/国ページ" title="...">国名</a></b>の<a href="/wiki/国旗ページ" title="...">国旗</a></td>
      const firstCell = cells[0][1];

      // 1つ目のaタグ: 国ページと国名
      const countryLinkMatch = firstCell.match(/<a href="\/wiki\/([^"]+)" title="[^"]*">([^<]+)<\/a>/);
      if (!countryLinkMatch) continue;

      const countryPageEncoded = countryLinkMatch[1]; // 例: "%E3%82%BF%E3%82%A4%E7%8E%8B%E5%9B%BD"
      const countryDisplayName = countryLinkMatch[2]; // 例: "タイ"
      const countryPageUrl = `https://ja.wikipedia.org/wiki/${countryPageEncoded}`; // 例: "https://ja.wikipedia.org/wiki/%E3%82%BF%E3%82%A4%E7%8E%8B%E5%9B%BD"

      // 2つ目のaタグ: 国旗ページ
      const flagLinkMatch = firstCell.match(/<a href="\/wiki\/([^"]+)" title="[^"]*">国旗<\/a>/);
      if (!flagLinkMatch) continue;

      const flagPageEncoded = flagLinkMatch[1]; // 例: "%E3%82%BF%E3%82%A4%E3%81%AE%E5%9B%BD%E6%97%97"
      const flagPageUrl = `https://ja.wikipedia.org/wiki/${flagPageEncoded}`; // 例: "https://ja.wikipedia.org/wiki/%E3%82%BF%E3%82%A4%E3%81%AE%E5%9B%BD%E6%97%97"

      mapping[countryDisplayName] = {
        countryPage: countryPageUrl,
        flagPage: flagPageUrl,
      };

      console.log(`${countryDisplayName}:`);
      console.log(`  - 国: ${countryPageUrl}`);
      console.log(`  - 国旗: ${flagPageUrl}`);
    }

    // JSONファイルに保存
    const outputPath = path.resolve(process.cwd(), 'scripts', 'flag-page-mapping.json');
    await fs.writeFile(outputPath, JSON.stringify(mapping, null, 2), 'utf-8');

    console.log(`\n✓ Extracted ${Object.keys(mapping).length} country mappings`);
    console.log(`✓ Saved to: ${outputPath}`);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
};

extractFlagPageNames();
