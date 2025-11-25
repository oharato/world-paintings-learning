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
import sharp from 'sharp';

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

  // 追加の著名画家（Met API にコレクションがある可能性が高いもの）
  { en: 'Leonardo da Vinci', ja: 'レオナルド・ダ・ヴィンチ', searchTerm: 'Leonardo da Vinci' },
  { en: 'Sandro Botticelli', ja: 'サンドロ・ボッティチェリ', searchTerm: 'Botticelli' },
  { en: 'Titian', ja: 'ティツィアーノ・ヴェチェッリオ', searchTerm: 'Titian' },
  { en: 'Diego Velázquez', ja: 'ディエゴ・ベラスケス', searchTerm: 'Velazquez' },
  { en: 'Francisco Goya', ja: 'フランシスコ・デ・ゴヤ', searchTerm: 'Goya' },
  { en: 'Henri Matisse', ja: 'アンリ・マティス', searchTerm: 'Matisse' },
  { en: 'Gustav Klimt', ja: 'グスタフ・クリムト', searchTerm: 'Klimt' },
  { en: 'John Singer Sargent', ja: 'ジョン・シンガー・サージェント', searchTerm: 'Sargent' },
  { en: 'Winslow Homer', ja: 'ウィンスロー・ホーマー', searchTerm: 'Homer' },
  { en: 'Mary Cassatt', ja: 'メアリー・カサット', searchTerm: 'Cassatt' },
  { en: 'Albrecht Dürer', ja: 'アルブレヒト・デューラー', searchTerm: 'Durer' },
  { en: 'Caravaggio', ja: 'カラヴァッジョ', searchTerm: 'Caravaggio' },
  { en: 'Georges Seurat', ja: 'ジョルジュ・スーラ', searchTerm: 'Seurat' },
  { en: 'Hieronymus Bosch', ja: 'ヒエロニムス・ボス', searchTerm: 'Bosch' },
  { en: 'Michelangelo', ja: 'ミケランジェロ', searchTerm: 'Michelangelo' },

  // さらに追加: Met コレクションで見つかる可能性が高い著名画家を追加
  { en: 'Jan van Eyck', ja: 'ヤン・ファン・エイク', searchTerm: 'Jan van Eyck' },
  { en: 'J. M. W. Turner', ja: 'ジョゼフ・マロード・ウィリアム・ターナー', searchTerm: 'J. M. W. Turner' },
  { en: 'John Constable', ja: 'ジョン・コンスタブル', searchTerm: 'John Constable' },
  { en: 'Thomas Gainsborough', ja: 'トーマス・ゲインズバラ', searchTerm: 'Thomas Gainsborough' },
  { en: 'Caspar David Friedrich', ja: 'カスパー・ダーヴィト・フリードリヒ', searchTerm: 'Caspar David Friedrich' },
  { en: 'Eugène Delacroix', ja: 'ユージェーヌ・ドラクロワ', searchTerm: 'Delacroix' },
  { en: 'Gustave Courbet', ja: 'ギュスターヴ・クールベ', searchTerm: 'Courbet' },
  { en: 'Camille Pissarro', ja: 'カミーユ・ピサロ', searchTerm: 'Pissarro' },
  { en: 'Jacob van Ruisdael', ja: 'ヤーコプ・ファン・ルイスダール', searchTerm: 'Jacob van Ruisdael' },
  { en: 'Francisco de Zurbarán', ja: 'フランシスコ・デ・スルバラン', searchTerm: 'Zurbaran' },
  { en: 'Joaquín Sorolla', ja: 'ホアキン・ソローリャ', searchTerm: 'Sorolla' },
  { en: 'Edward Hopper', ja: 'エドワード・ホッパー', searchTerm: 'Edward Hopper' },
  { en: 'Thomas Eakins', ja: 'トーマス・イーキンズ', searchTerm: 'Thomas Eakins' },
  { en: 'Frida Kahlo', ja: 'フリーダ・カーロ', searchTerm: 'Frida Kahlo' },
  { en: 'Diego Rivera', ja: 'ディエゴ・リベラ', searchTerm: 'Diego Rivera' },
  { en: 'Marc Chagall', ja: 'マルク・シャガール', searchTerm: 'Marc Chagall' },
  { en: 'René Magritte', ja: 'ルネ・マグリット', searchTerm: 'René Magritte' },
  { en: 'Piet Mondrian', ja: 'ピート・モンドリアン', searchTerm: 'Mondrian' },
  { en: 'Kazimir Malevich', ja: 'カジミール・マレーヴィチ', searchTerm: 'Malevich' },
  { en: 'Katsushika Hokusai', ja: '葛飾北斎', searchTerm: 'Hokusai' },
  { en: 'Utagawa Hiroshige', ja: '歌川広重', searchTerm: 'Hiroshige' },
  { en: 'Jean-Auguste-Dominique Ingres', ja: 'ジャン＝オーギュスト＝ドミニク・アングル', searchTerm: 'Ingres' },
  { en: 'Pieter Bruegel the Elder', ja: 'ピーテル・ブリューゲル（父）', searchTerm: 'Pieter Bruegel' },
];

const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const PAINTINGS_DIR = path.join(process.cwd(), 'public', 'paintings');
const OUTPUT_DIR = path.join(process.cwd(), 'public');

// Rate limit configuration for Met API (requests per second)
// Can be tuned via env var MET_RATE_LIMIT_RPS (e.g. MET_RATE_LIMIT_RPS=2)
const MET_RATE_LIMIT_RPS = Number(process.env.MET_RATE_LIMIT_RPS || '2');
const MET_REQUEST_DELAY_MS = Math.max(200, Math.ceil(1000 / MET_RATE_LIMIT_RPS));

// Simple rate-limiter state (ensures at least MET_REQUEST_DELAY_MS between requests)
let _lastRequestTime = 0;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function rateLimitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const since = now - _lastRequestTime;
  if (since < MET_REQUEST_DELAY_MS) {
    await sleep(MET_REQUEST_DELAY_MS - since);
  }
  _lastRequestTime = Date.now();
  return fetch(input, init);
}

// --- Wikipedia / Wikidata helper (Japanese info lookup) ---
// Configurable rate for wiki calls (default conservative)
const WIKI_RATE_LIMIT_RPS = Number(process.env.WIKI_RATE_LIMIT_RPS || '1');
const WIKI_REQUEST_DELAY_MS = Math.max(500, Math.ceil(1000 / WIKI_RATE_LIMIT_RPS));
let _lastWikiRequestTime = 0;
async function rateLimitedFetchWiki(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const since = now - _lastWikiRequestTime;
  if (since < WIKI_REQUEST_DELAY_MS) {
    await sleep(WIKI_REQUEST_DELAY_MS - since);
  }
  _lastWikiRequestTime = Date.now();
  return fetch(input, init);
}

const WIKI_CACHE_PATH = path.join(process.cwd(), 'scripts', 'wiki-cache.json');
let _wikiCache: Record<string, { titleJa: string; descriptionJa: string; source?: string }> = {};
try {
  if (fs.existsSync(WIKI_CACHE_PATH)) {
    _wikiCache = JSON.parse(fs.readFileSync(WIKI_CACHE_PATH, 'utf8') || '{}');
  }
} catch (e) {
  console.warn('Could not load wiki cache:', e);
  _wikiCache = {};
}

function saveWikiCache() {
  try {
    fs.writeFileSync(WIKI_CACHE_PATH, JSON.stringify(_wikiCache, null, 2));
  } catch (e) {
    console.warn('Failed to save wiki cache:', e);
  }
}

// --- WebP / conversion settings ---
const USE_WEBP = process.env.USE_WEBP !== 'false';
const WEBP_QUALITY_DEFAULT = Number(process.env.WEBP_QUALITY || '80');

async function convertBufferToWebpWithTarget(
  buffer: Buffer,
  outPath: string,
  maxBytes = MAX_IMAGE_BYTES,
  qualityDefault = WEBP_QUALITY_DEFAULT
): Promise<number | null> {
  try {
    let q = qualityDefault;
    const img = sharp(buffer, { failOnError: false });
    const metadata = await img.metadata();
    const origWidth = metadata.width ?? undefined;
    const targetWidth = origWidth && origWidth > 2000 ? 2000 : origWidth;

    // try decreasing quality
    for (; q >= 30; q -= 5) {
      const buf = await img
        .clone()
        .resize(typeof targetWidth === 'number' ? { width: targetWidth } : undefined)
        .webp({ quality: q })
        .toBuffer();
      if (buf.length <= maxBytes) {
        fs.writeFileSync(outPath, buf);
        return buf.length;
      }
    }

    // aggressive resize
    let w = (metadata.width || 1600) as number;
    while (w >= 400) {
      const buf = await img
        .clone()
        .resize({ width: Math.floor(w) })
        .webp({ quality: 40 })
        .toBuffer();
      if (buf.length <= maxBytes) {
        fs.writeFileSync(outPath, buf);
        return buf.length;
      }
      w = Math.floor(w * 0.8);
    }

    // final write (best-effort)
    const finalBuf = await img.webp({ quality: 30 }).toBuffer();
    fs.writeFileSync(outPath, finalBuf);
    return finalBuf.length;
  } catch (e) {
    console.warn('convertBufferToWebpWithTarget failed for', outPath, e);
    return null;
  }
}

async function searchWikidataForPainting(title: string, artist?: string): Promise<string | null> {
  const q = artist ? `${title} ${artist}` : title;
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    q
  )}&language=en&format=json&type=item&limit=5`;
  try {
    const res = await rateLimitedFetchWiki(url, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.search && data.search.length > 0) {
      // Pick the best match (first)
      return data.search[0].id;
    }
    return null;
  } catch (e) {
    console.warn('Wikidata search failed:', e);
    return null;
  }
}

async function getJaFromWikidataEntity(entityId: string): Promise<{ titleJa: string; descriptionJa: string } | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(
    entityId
  )}&format=json&props=labels|descriptions|sitelinks`;
  try {
    const res = await rateLimitedFetchWiki(url, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    const entity = data.entities?.[entityId];
    if (!entity) return null;

    // If there is a Japanese Wikipedia sitelink, fetch its summary
    const sitelink = entity.sitelinks?.jawiki?.title;
    if (sitelink) {
      try {
        const pageUrl = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sitelink)}`;
        const pageRes = await rateLimitedFetchWiki(pageUrl, { method: 'GET' });
        if (pageRes.ok) {
          const pageJson = await pageRes.json();
          const titleJa = pageJson.title || entity.labels?.ja?.value || '';
          const descriptionJa = pageJson.extract || entity.descriptions?.ja?.value || '';
          return { titleJa, descriptionJa };
        }
      } catch (e) {
        // fallthrough to labels/descriptions
      }
    }

    // Fallback: use labels/descriptions from Wikidata (ja or en)
    const titleJa = entity.labels?.ja?.value || entity.labels?.en?.value || '';
    const descriptionJa = entity.descriptions?.ja?.value || entity.descriptions?.en?.value || '';
    return { titleJa, descriptionJa };
  } catch (e) {
    console.warn('Failed to fetch Wikidata entity:', e);
    return null;
  }
}

async function getJapaneseInfoFromWiki(title: string, artist?: string) {
  const cacheKey = `${title}||${artist || ''}`;
  if (_wikiCache[cacheKey]) return _wikiCache[cacheKey];

  // Try to find Wikidata entity
  const entityId = await searchWikidataForPainting(title, artist);
  if (entityId) {
    const info = await getJaFromWikidataEntity(entityId);
    if (info) {
      _wikiCache[cacheKey] = {
        titleJa: info.titleJa || '',
        descriptionJa: info.descriptionJa || '',
        source: `wikidata:${entityId}`,
      };
      saveWikiCache();
      return _wikiCache[cacheKey];
    }
  }

  // As a last resort, attempt to search ja.wikipedia directly via its opensearch
  try {
    const searchUrl = `https://ja.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(title)}&limit=1&format=json`;
    const res = await rateLimitedFetchWiki(searchUrl, { method: 'GET' });
    if (res.ok) {
      const arr = await res.json();
      if (Array.isArray(arr) && arr[1] && arr[1].length > 0) {
        const jaTitle = arr[1][0];
        const pageUrl = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(jaTitle)}`;
        const pageRes = await rateLimitedFetchWiki(pageUrl, { method: 'GET' });
        if (pageRes.ok) {
          const pageJson = await pageRes.json();
          const titleJa = pageJson.title || '';
          const descriptionJa = pageJson.extract || '';
          _wikiCache[cacheKey] = { titleJa, descriptionJa, source: `jawiki:${jaTitle}` };
          saveWikiCache();
          return _wikiCache[cacheKey];
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Nothing found
  _wikiCache[cacheKey] = { titleJa: '', descriptionJa: '', source: 'none' };
  saveWikiCache();
  return _wikiCache[cacheKey];
}

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(PAINTINGS_DIR)) {
    fs.mkdirSync(PAINTINGS_DIR, { recursive: true });
  }
}

// --- Image compression ---
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || String(100 * 1024)); // default 100KB

async function compressImageToTarget(filePath: string, maxBytes = MAX_IMAGE_BYTES): Promise<number | null> {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size <= maxBytes) return stat.size;

    // Load image into sharp
    const image = sharp(filePath, { failOnError: false });
    const metadata = await image.metadata();

    // We'll convert to JPEG for size control (preserve orientation)
    const origWidth = metadata.width ?? undefined;
    const targetWidth = origWidth && origWidth > 2000 ? 2000 : origWidth;

    // Try iterative quality reduction
    for (let q = 85; q >= 30; q -= 5) {
      const bufImage = image.clone();
      const buffer = await bufImage
        .resize(typeof targetWidth === 'number' ? { width: targetWidth } : undefined)
        .jpeg({ quality: q, mozjpeg: true })
        .toBuffer();

      if (buffer.length <= maxBytes) {
        fs.writeFileSync(filePath, buffer);
        return buffer.length;
      }
    }

    // As a last resort, aggressively resize then encode
    for (let w = metadata.width || 1600; w >= 400; w = Math.floor(w * 0.8)) {
      const buffer = await image.resize({ width: w }).jpeg({ quality: 40, mozjpeg: true }).toBuffer();
      if (buffer.length <= maxBytes) {
        fs.writeFileSync(filePath, buffer);
        return buffer.length;
      }
    }

    // If still too big, write the smallest we have (best-effort)
    const finalBuf = await image.jpeg({ quality: 30, mozjpeg: true }).toBuffer();
    fs.writeFileSync(filePath, finalBuf);
    return finalBuf.length;
  } catch (e) {
    console.warn('compressImageToTarget failed for', filePath, e);
    return null;
  }
}

async function compressExistingImages(
  paintingsJaFinal: any[],
  paintingsEnFinal: any[],
  jaPath: string,
  enPath: string
) {
  try {
    if (!fs.existsSync(PAINTINGS_DIR)) return;
    const files = fs.readdirSync(PAINTINGS_DIR);
    for (const f of files) {
      const p = path.join(PAINTINGS_DIR, f);
      try {
        const stat = fs.statSync(p);
        if (stat.isFile() && stat.size > MAX_IMAGE_BYTES) {
          console.log(`Compressing existing image: ${f} (${(stat.size / 1024).toFixed(1)} KB)`);

          const ext = path.extname(f).toLowerCase();
          const base = path.basename(f, ext);
          const webpName = `${base}.webp`;
          const webpPath = path.join(PAINTINGS_DIR, webpName);

          try {
            const buf = fs.readFileSync(p);
            const newSize = await convertBufferToWebpWithTarget(buf, webpPath, MAX_IMAGE_BYTES);
            if (typeof newSize === 'number' && newSize > 0) {
              // remove original file
              try {
                fs.unlinkSync(p);
              } catch (e) {
                console.warn(`  Failed to remove original ${f}:`, e);
              }

              console.log(`  Compressed ${f} => ${webpName} (${(newSize / 1024).toFixed(1)} KB)`);

              // Update JSON entries to point to new webp path
              const origRel = `/paintings/${f}`;
              const newRel = `/paintings/${webpName}`;
              let changed = false;
              for (const entry of paintingsJaFinal) {
                if (entry.image_url === origRel) {
                  entry.image_url = newRel;
                  changed = true;
                }
              }
              for (const entry of paintingsEnFinal) {
                if (entry.image_url === origRel) {
                  entry.image_url = newRel;
                  changed = true;
                }
              }
              if (changed) {
                try {
                  fs.writeFileSync(jaPath, JSON.stringify(paintingsJaFinal, null, 2));
                  fs.writeFileSync(enPath, JSON.stringify(paintingsEnFinal, null, 2));
                  console.log(`  Updated JSON entries to ${webpName}`);
                } catch (e) {
                  console.warn('  Failed to update JSON after converting existing image:', e);
                }
              }
            } else {
              console.warn(`  Could not compress ${f} to webp below threshold`);
            }
          } catch (e) {
            console.warn('  Error converting existing image to webp:', e);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.warn('compressExistingImages failed', e);
  }
}

// Fetch with retry logic
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await rateLimitedFetch(url);
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
    const arrayBuf = await response.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const outputPath = path.join(PAINTINGS_DIR, filename);

    if (USE_WEBP) {
      // convert buffer directly to webp at target size
      console.log(`    Downloaded (buffered): will convert to WebP ${filename}`);
      const newSize = await convertBufferToWebpWithTarget(buf, outputPath, MAX_IMAGE_BYTES);
      if (typeof newSize === 'number' && newSize > 0) {
        console.log(`    Converted to WebP ${filename} => ${(newSize / 1024).toFixed(1)} KB`);
        return true;
      } else {
        // fallback: write original buffer
        fs.writeFileSync(outputPath, buf);
        console.warn(`    WebP conversion failed for ${filename}; saved original`);
        return false;
      }
    } else {
      fs.writeFileSync(outputPath, buf);
      console.log(`    Downloaded: ${filename}`);
      const stat = fs.statSync(outputPath);
      if (stat.size > MAX_IMAGE_BYTES) {
        console.log(
          `    Compressing ${filename} (${(stat.size / 1024).toFixed(1)} KB) to <= ${(MAX_IMAGE_BYTES / 1024).toFixed(0)} KB`
        );
        const newSize = await compressImageToTarget(outputPath, MAX_IMAGE_BYTES);
        if (typeof newSize === 'number' && newSize > 0) {
          console.log(`    Compressed ${filename} => ${(newSize / 1024).toFixed(1)} KB`);
        } else {
          console.warn(`    Compression couldn't reduce ${filename} below threshold or failed`);
        }
      }
      return true;
    }
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
  const webpFilename = `${id}.webp`;

  return {
    id,
    title: obj.title || 'Untitled',
    titleJa: obj.title || '無題', // TODO: Add translation logic
    artist: obj.artistDisplayName || artistInfo.en,
    artistJa: artistInfo.ja,
    year: obj.objectDate || 'Unknown',
    medium: obj.medium || 'Unknown',
    imageUrl: obj.primaryImage,
    localImagePath: `/paintings/${webpFilename}`,
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

  // Paths for output JSON files (also used for incremental updates)
  const jaPath = path.join(OUTPUT_DIR, 'paintings.ja.json');
  const enPath = path.join(OUTPUT_DIR, 'paintings.en.json');

  // Load existing JSON (if any) to avoid duplicates and allow incremental writes
  let paintingsJaFinal: any[] = [];
  let paintingsEnFinal: any[] = [];
  const existingIds = new Set<string>();

  if (fs.existsSync(jaPath)) {
    try {
      paintingsJaFinal = JSON.parse(fs.readFileSync(jaPath, 'utf8')) || [];
      for (const p of paintingsJaFinal) existingIds.add(p.id);
    } catch (e) {
      console.warn(`Could not parse existing ${jaPath}, starting fresh.`);
      paintingsJaFinal = [];
    }
  }

  if (fs.existsSync(enPath)) {
    try {
      paintingsEnFinal = JSON.parse(fs.readFileSync(enPath, 'utf8')) || [];
    } catch (e) {
      console.warn(`Could not parse existing ${enPath}, starting fresh.`);
      paintingsEnFinal = [];
    }
  }

  // Compress existing images after loading JSON so we can update image_url entries
  await compressExistingImages(paintingsJaFinal, paintingsEnFinal, jaPath, enPath);

  const allPaintings: Painting[] = [];

  for (const artistInfo of FAMOUS_ARTISTS) {
    console.log(`\n📌 Processing artist: ${artistInfo.en} (${artistInfo.ja})`);

    // Search for objects by this artist
    const objectIds = await searchArtist(artistInfo.searchTerm);

    if (objectIds.length === 0) {
      continue;
    }

    // Limit to first 20 objects per artist to avoid overwhelming the API
    const limitedIds = objectIds.slice(0, 5);

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

      // Try to enrich with Japanese info from Wikidata / ja.wikipedia (cached)
      try {
        const wikiInfo = await getJapaneseInfoFromWiki(painting.title, painting.artist);
        if (wikiInfo) {
          painting.titleJa = wikiInfo.titleJa || painting.titleJa || painting.title || '無題';
          painting.descriptionJa = wikiInfo.descriptionJa || painting.descriptionJa || painting.description || '';
        }
      } catch (e) {
        // ignore wiki enrichment failures
      }

      // Download image if not already present locally
      const filename = painting.localImagePath.split('/').pop()!;
      const outputPath = path.join(PAINTINGS_DIR, filename);
      let downloaded = false;

      if (fs.existsSync(outputPath)) {
        downloaded = true;
        console.log(`    Exists locally, skipping download: ${filename}`);
      } else {
        downloaded = await downloadImage(painting.imageUrl, filename);
      }

      if (downloaded) {
        // Avoid adding duplicates if JSON already contains this id
        if (!existingIds.has(painting.id)) {
          // Push to in-memory list (optional) and append to final arrays
          allPaintings.push(painting);

          const jaEntry = {
            id: painting.id,
            name: painting.titleJa,
            artist: painting.artistJa,
            year: painting.year,
            medium: painting.medium,
            image_url: painting.localImagePath,
            description: painting.descriptionJa,
            culture: painting.culture,
          };

          const enEntry = {
            id: painting.id,
            name: painting.title,
            artist: painting.artist,
            year: painting.year,
            medium: painting.medium,
            image_url: painting.localImagePath,
            description: painting.description,
            culture: painting.culture,
          };

          paintingsJaFinal.push(jaEntry);
          paintingsEnFinal.push(enEntry);
          existingIds.add(painting.id);

          // Incrementally write JSON files after each new painting
          try {
            fs.writeFileSync(jaPath, JSON.stringify(paintingsJaFinal, null, 2));
            fs.writeFileSync(enPath, JSON.stringify(paintingsEnFinal, null, 2));
            console.log(`    ✓ Added and updated JSON: ${painting.title} by ${painting.artist}`);
          } catch (e) {
            console.error('    Failed to write JSON files:', e);
          }
        } else {
          console.log(`    ✓ Already present in JSON: ${painting.id}`);
        }
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

  // Save JSON files (paths declared earlier for incremental updates)
  fs.writeFileSync(jaPath, JSON.stringify(paintingsJa, null, 2));
  fs.writeFileSync(enPath, JSON.stringify(paintingsEn, null, 2));

  console.log(`\n✓ Generated ${jaPath}`);
  console.log(`✓ Generated ${enPath}`);
  console.log('\n🎉 Paintings data collection complete!');
}

// Run the script
main().catch(console.error);
