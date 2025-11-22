#!/usr/bin/env tsx
/**
 * Script to fetch famous paintings data from The Metropolitan Museum of Art API
 *
 * This script:
 * 1. Searches for paintings by famous artists (Van Gogh, Monet, etc.)
 * 2. Filters for public domain, highlighted works with high-quality images
 * 3. Downloads painting images to public/paintings/
 * 4. Generates paintings.ja.json and paintings.en.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Painting data interface
interface Painting {
  id: string;
  title: string;
  titleJa: string; // Japanese title (if available)
  artist: string;
  artistJa: string; // Japanese artist name
  year: string;
  medium: string;
  imageUrl: string;
  localImagePath: string;
  description: string;
  descriptionJa: string;
  culture: string;
  department: string;
}

// Famous artists to search for
const FAMOUS_ARTISTS = [
  { en: 'Vincent van Gogh', ja: 'フィンセント・ファン・ゴッホ', searchTerm: 'Van Gogh' },
  { en: 'Claude Monet', ja: 'クロード・モネ', searchTerm: 'Monet' },
  { en: 'Pierre-Auguste Renoir', ja: 'ピエール＝オーギュスト・ルノワール', searchTerm: 'Renoir' },
  { en: 'Edgar Degas', ja: 'エドガー・ドガ', searchTerm: 'Degas' },
  { en: 'Paul Cézanne', ja: 'ポール・セザンヌ', searchTerm: 'Cézanne' },
  { en: 'Johannes Vermeer', ja: 'ヨハネス・フェルメール', searchTerm: 'Vermeer' },
  { en: 'Rembrandt van Rijn', ja: 'レンブラント・ファン・レイン', searchTerm: 'Rembrandt' },
  { en: 'Pablo Picasso', ja: 'パブロ・ピカソ', searchTerm: 'Picasso' },
  { en: 'Paul Gauguin', ja: 'ポール・ゴーギャン', searchTerm: 'Gauguin' },
  { en: 'Édouard Manet', ja: 'エドゥアール・マネ', searchTerm: 'Manet' },
];

const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const PAINTINGS_DIR = path.join(process.cwd(), 'public', 'paintings');
const OUTPUT_DIR = path.join(process.cwd(), 'public');

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(PAINTINGS_DIR)) {
    fs.mkdirSync(PAINTINGS_DIR, { recursive: true });
  }
}

// Fetch with retry logic
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

// Search for objects by artist
async function searchArtist(searchTerm: string): Promise<number[]> {
  const searchUrl = `${MET_API_BASE}/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(searchTerm)}`;
  console.log(`Searching for: ${searchTerm}`);

  try {
    const response = await fetchWithRetry(searchUrl);
    const data = await response.json();

    if (data.objectIDs && data.objectIDs.length > 0) {
      console.log(`  Found ${data.total} objects for ${searchTerm}`);
      return data.objectIDs;
    }
    console.log(`  No objects found for ${searchTerm}`);
    return [];
  } catch (error) {
    console.error(`  Error searching for ${searchTerm}:`, error);
    return [];
  }
}

// Get object details
async function getObjectDetails(objectId: number): Promise<any> {
  const objectUrl = `${MET_API_BASE}/objects/${objectId}`;

  try {
    const response = await fetchWithRetry(objectUrl);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`  Error fetching object ${objectId}:`, error);
    return null;
  }
}

// Download image
async function downloadImage(imageUrl: string, filename: string): Promise<boolean> {
  try {
    const response = await fetchWithRetry(imageUrl);
    const buffer = await response.arrayBuffer();
    const outputPath = path.join(PAINTINGS_DIR, filename);
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`    Downloaded: ${filename}`);
    return true;
  } catch (error) {
    console.error(`    Failed to download ${filename}:`, error);
    return false;
  }
}

// Convert object data to painting
function convertToPainting(obj: any, artistInfo: (typeof FAMOUS_ARTISTS)[0]): Painting | null {
  if (!obj.primaryImage || !obj.isPublicDomain) {
    return null;
  }

  // Filter for paintings only (not sculptures, etc.)
  const objectType = obj.objectName?.toLowerCase() || '';
  const isPainting =
    objectType.includes('painting') ||
    obj.medium?.toLowerCase().includes('oil') ||
    obj.medium?.toLowerCase().includes('canvas') ||
    obj.department === 'European Paintings';

  if (!isPainting) {
    return null;
  }

  const id = `met_${obj.objectID}`;
  const extension = obj.primaryImage.split('.').pop()?.split('?')[0] || 'jpg';
  const filename = `${id}.${extension}`;

  return {
    id,
    title: obj.title || 'Untitled',
    titleJa: obj.title || '無題', // TODO: Add translation logic
    artist: obj.artistDisplayName || artistInfo.en,
    artistJa: artistInfo.ja,
    year: obj.objectDate || 'Unknown',
    medium: obj.medium || 'Unknown',
    imageUrl: obj.primaryImage,
    localImagePath: `/paintings/${filename}`,
    description: [obj.creditLine, obj.department, obj.objectName].filter(Boolean).join(' | '),
    descriptionJa: [obj.creditLine, obj.department, obj.objectName].filter(Boolean).join(' | '),
    culture: obj.culture || '',
    department: obj.department || '',
  };
}

// Main function
async function main() {
  console.log('🎨 Starting paintings data collection from The Met...\n');
  ensureDirectories();

  const allPaintings: Painting[] = [];

  for (const artistInfo of FAMOUS_ARTISTS) {
    console.log(`\n📌 Processing artist: ${artistInfo.en} (${artistInfo.ja})`);

    // Search for objects by this artist
    const objectIds = await searchArtist(artistInfo.searchTerm);

    if (objectIds.length === 0) {
      continue;
    }

    // Limit to first 20 objects per artist to avoid overwhelming the API
    const limitedIds = objectIds.slice(0, 20);

    for (const objectId of limitedIds) {
      console.log(`  Fetching object ${objectId}...`);

      // Get object details
      const obj = await getObjectDetails(objectId);
      if (!obj) continue;

      // Convert to painting
      const painting = convertToPainting(obj, artistInfo);
      if (!painting) {
        console.log(`    Skipped (not a painting or missing data)`);
        continue;
      }

      // Download image
      const filename = painting.localImagePath.split('/').pop()!;
      const downloaded = await downloadImage(painting.imageUrl, filename);

      if (downloaded) {
        allPaintings.push(painting);
        console.log(`    ✓ Added: ${painting.title} by ${painting.artist}`);
      }

      // Rate limiting: wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`\n\n✓ Collected ${allPaintings.length} paintings total`);

  // Sort paintings by artist name
  allPaintings.sort((a, b) => a.artist.localeCompare(b.artist));

  // Generate Japanese version
  const paintingsJa = allPaintings.map((p) => ({
    id: p.id,
    name: p.titleJa,
    artist: p.artistJa,
    year: p.year,
    medium: p.medium,
    image_url: p.localImagePath,
    description: p.descriptionJa,
    culture: p.culture,
  }));

  // Generate English version
  const paintingsEn = allPaintings.map((p) => ({
    id: p.id,
    name: p.title,
    artist: p.artist,
    year: p.year,
    medium: p.medium,
    image_url: p.localImagePath,
    description: p.description,
    culture: p.culture,
  }));

  // Save JSON files
  const jaPath = path.join(OUTPUT_DIR, 'paintings.ja.json');
  const enPath = path.join(OUTPUT_DIR, 'paintings.en.json');

  fs.writeFileSync(jaPath, JSON.stringify(paintingsJa, null, 2));
  fs.writeFileSync(enPath, JSON.stringify(paintingsEn, null, 2));

  console.log(`\n✓ Generated ${jaPath}`);
  console.log(`✓ Generated ${enPath}`);
  console.log('\n🎉 Paintings data collection complete!');
}

// Run the script
main().catch(console.error);
