# Flag Origin Information Extraction - Usage Guide

## Overview

This guide explains how to use the improved flag information batch script to regenerate English flag origin descriptions for countries where the information is missing.

## Problem

The following 20 countries were missing flag origin information in the English version:
- Republic of Ireland
- United States
- United Arab Emirates
- United Kingdom
- Netherlands
- The Gambia
- Cook Islands
- Comoros
- Republic of the Congo
- Democratic Republic of the Congo
- Czech Republic
- Central African Republic
- Taiwan
- Denmark
- Dominican Republic
- The Bahamas
- Philippines
- Marshall Islands
- Federated States of Micronesia
- Maldives

## Solution

The batch script has been improved to handle country names with special prefixes and extract clean, well-formatted descriptions from Wikipedia.

### Improvements Made

1. **Country Name Normalization**: The script now handles countries with prefixes like:
   - "the" (e.g., "The Bahamas" → tries both "Flag of The Bahamas" and "Flag of Bahamas")
   - "Republic of" (e.g., "Republic of Ireland" → tries "Flag of Ireland")
   - "Democratic Republic of"
   - "Federated States of"
   - And more...

2. **Multiple Page Name Variations**: If the first page name doesn't exist, the script tries alternative variations automatically.

3. **HTML Cleanup**: The extracted text is cleaned to remove:
   - HTML tags and links
   - Citation annotations like [1], [2], [[1]], [citation needed]
   - Extra whitespace

## Usage

### Regenerate All Countries

To regenerate data for all countries in the country-list.json:

```bash
npm run batch:create-data
```

**Warning**: This takes 30-60 minutes as it processes all countries and respects Wikipedia API rate limits.

### Regenerate Specific Countries

To update only specific countries with missing English descriptions:

```bash
# Update United States
npm run batch:create-data "United States"

# Update Ireland
npm run batch:create-data "Ireland"

# Update multiple countries by running the command multiple times
npm run batch:create-data "United Kingdom"
npm run batch:create-data "Netherlands"
```

The script searches for country names that contain the search string, so you can use partial names.

## Expected Results

After running the script for a country, you should see console output like:

```
Processing アメリカ合衆国...
  ✓ Capital (JA): ワシントンD.C.
  ✓ Capital (EN): Washington, D.C.
  ✓ Continent (JA): 北アメリカ
  ✓ Continent (EN): North America
  ✓ Map image found
  ✓ Map image downloaded: /maps/united_states.png
  ✓ Found flag page: "Flag of the United States"
  ✓ Flag description (en): 1234 chars
  ✓ Updated アメリカ合衆国 in countries.ja.json
  ✓ Added United States in countries.en.json
  ✓ Saved to files (Total: 195 countries)
```

The key line is: `✓ Found flag page: "Flag of the United States"` which shows which Wikipedia page variation was successfully found.

## Verification

After running the batch script, you can verify the results:

1. **Check the JSON file**:
```bash
# Check if United States now has a description
jq '.[] | select(.id == "united_states") | .description' public/countries.en.json
```

2. **Count countries with empty descriptions**:
```bash
# Should show 0 after all countries are processed
jq '[.[] | select(.description == "")] | length' public/countries.en.json
```

3. **View the learning mode**: Start the dev server and check the English learning mode to see the flag descriptions.

## Troubleshooting

### Wikipedia API Rate Limiting

If you see errors about rate limiting, the script includes a 500ms delay between requests. You can increase this by modifying the delay at the end of the main loop in `scripts/generate-data.mts`.

### Network Issues

If Wikipedia is unreachable, you'll see error messages like:
```
- Error getting flag description: request to https://en.wikipedia.org/... failed
```

Make sure you have a stable internet connection and Wikipedia is not blocked by your firewall.

### Page Not Found

If a flag page truly doesn't exist on Wikipedia, you'll see:
```
- No flag page found for "Country Name" (tried 4 variations)
```

This is normal for some territories or special administrative regions that don't have dedicated flag pages.

## Testing

The improvements are fully tested with 19 unit tests covering:
- HTML cleaning with various Wikipedia formats
- Country name normalization for all 20 problematic countries
- Integration with real Wikipedia HTML extracts

Run the tests:
```bash
npm test scripts/__tests__/generate-data.test.ts
```

All tests should pass (19/19).
