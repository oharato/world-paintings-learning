import fetch from 'node-fetch';

const getFlagDescription = async (countryName: string, lang: 'ja' | 'en'): Promise<string> => {
  const apiUrl = lang === 'ja' ? 'https://ja.wikipedia.org/w/api.php' : 'https://en.wikipedia.org/w/api.php';

  try {
    // 国旗専用ページ名
    const flagPageName = lang === 'ja' ? `${countryName}の国旗` : `Flag of ${countryName}`;

    console.log(`Testing: ${flagPageName}`);

    // ページの要約を取得
    const summaryUrl = `${apiUrl}?action=query&titles=${encodeURIComponent(flagPageName)}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`;
    const response = await fetch(summaryUrl);
    const data: any = await response.json();

    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];

    console.log('Page ID:', pageId);

    if (pageId !== '-1') {
      const extract = pages[pageId]?.extract;
      console.log('Extract length:', extract?.length);
      if (extract && extract.length > 50) {
        return extract;
      }
    }
  } catch (e: any) {
    console.warn(`  - Error getting flag description: ${e.message}`);
  }

  return '';
};

// Test with different country names
console.log('=== Test 1: United States ===');
let result = await getFlagDescription('the United States', 'en');
console.log('Result length:', result.length);
console.log('First 200 chars:', result.substring(0, 200));

console.log('\n=== Test 2: United Kingdom ===');
result = await getFlagDescription('the United Kingdom', 'en');
console.log('Result length:', result.length);
console.log('First 200 chars:', result.substring(0, 200));
