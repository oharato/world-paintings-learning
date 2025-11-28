#!/usr/bin/env tsx
/**
 * Generate placeholder SVG images for paintings
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const PAINTINGS_DIR = path.join(process.cwd(), 'public', 'paintings');
const PAINTINGS_JA_PATH = path.join(process.cwd(), 'public', 'paintings.ja.json');

// Read paintings data
const paintingsJa = JSON.parse(fs.readFileSync(PAINTINGS_JA_PATH, 'utf-8'));

// Ensure directory exists
if (!fs.existsSync(PAINTINGS_DIR)) {
  fs.mkdirSync(PAINTINGS_DIR, { recursive: true });
}

// Color palette for different artists
const artistColors: Record<string, string> = {
  'フィンセント・ファン・ゴッホ': '#FFD700',
  'クロード・モネ': '#87CEEB',
  'ピエール＝オーギュスト・ルノワール': '#FFB6C1',
  'エドガー・ドガ': '#DDA0DD',
  'ポール・セザンヌ': '#98FB98',
  'ヨハネス・フェルメール': '#F0E68C',
  'レンブラント・ファン・レイン': '#8B4513',
  'パブロ・ピカソ': '#FF6347',
  'ポール・ゴーギャン': '#FFA500',
  'エドゥアール・マネ': '#20B2AA',
};

// Generate SVG for each painting
for (const painting of paintingsJa) {
  const filename = painting.image_url.split('/').pop()!;
  const outputPath = path.join(PAINTINGS_DIR, filename);

  // Get color based on artist
  const color = artistColors[painting.artist] || '#CCCCCC';

  // Create SVG with painting info
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="${color}"/>
  <rect x="50" y="50" width="700" height="500" fill="white" opacity="0.9"/>
  <text x="400" y="150" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="#333">${painting.name}</text>
  <text x="400" y="200" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#666">${painting.artist}</text>
  <text x="400" y="250" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#999">${painting.year}</text>
  <text x="400" y="300" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="#999">${painting.medium}</text>
  <rect x="300" y="350" width="200" height="150" fill="${color}" opacity="0.3" rx="10"/>
  <text x="400" y="435" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="#666">Placeholder Image</text>
</svg>`;

  fs.writeFileSync(outputPath, svg);
  console.log(`Generated: ${filename}`);
}

console.log(`\n✓ Generated ${paintingsJa.length} placeholder images`);
