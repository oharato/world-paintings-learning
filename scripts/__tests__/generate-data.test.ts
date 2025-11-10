import { describe, expect, it } from 'vitest';

// HTMLテキストからリンクや注釈を除去してクリーンなテキストを取得
const cleanHtmlText = (html: string): string => {
  // HTMLタグを完全に削除（<script>, <style>, その他すべて）
  let text = html.replace(/<[^>]*>/gi, '');

  // Wikipedia style の注釈 [[1]], [[2]] などを削除
  text = text.replace(/\[\[[\d]+\]\]/g, '');
  // 注釈番号（[1], [2], [citation needed]など）と空の[]を削除
  text = text.replace(/\[[^\]]*\]/g, '');

  // HTMLエンティティをデコード（最後に実行して二重エスケープを防ぐ）
  // 順序を変更: 特殊文字から先にデコード
  text = text
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&'); // &amp; は最後にデコード

  // 複数の空白を1つにまとめる
  text = text.replace(/\s+/g, ' ');
  // 前後の空白を削除
  text = text.trim();
  return text;
};

describe('Flag Description Extraction Functions', () => {
  describe('cleanHtmlText', () => {
    it('should remove HTML tags', () => {
      const input = 'The <a href="/wiki/National_flag">national flag</a> consists of stripes.';
      const expected = 'The national flag consists of stripes.';
      expect(cleanHtmlText(input)).toBe(expected);
    });

    it('should remove Wikipedia-style citations [[1]]', () => {
      const input = 'The flag was adopted in 1960.[[2]]';
      const expected = 'The flag was adopted in 1960.';
      expect(cleanHtmlText(input)).toBe(expected);
    });

    it('should remove multiple consecutive Wikipedia citations', () => {
      const input = 'The flag has three colors: red, white, and blue.[[5]][[6]]';
      const expected = 'The flag has three colors: red, white, and blue.';
      expect(cleanHtmlText(input)).toBe(expected);
    });

    it('should remove single bracket citations [1]', () => {
      const input = 'The flag represents 50 states.[3]';
      const expected = 'The flag represents 50 states.';
      expect(cleanHtmlText(input)).toBe(expected);
    });

    it('should remove citation needed annotations', () => {
      const input = 'The flag was adopted in 1960[citation needed] following independence.';
      const expected = 'The flag was adopted in 1960 following independence.';
      expect(cleanHtmlText(input)).toBe(expected);
    });

    it('should decode HTML entities', () => {
      const input = 'The&nbsp;flag&nbsp;has&nbsp;three&nbsp;colors: red&amp;blue.';
      const expected = 'The flag has three colors: red&blue.';
      expect(cleanHtmlText(input)).toBe(expected);
    });

    it('should normalize multiple spaces', () => {
      const input = 'The  flag   has    multiple     spaces.';
      const expected = 'The flag has multiple spaces.';
      expect(cleanHtmlText(input)).toBe(expected);
    });

    it('should handle complex Wikipedia extracts from issue example', () => {
      const input =
        'The <a href="/wiki/National_flag">national flag</a> of the <a href="/wiki/United_States">United States</a>, often referred to as the American flag or the U.S. flag, consists of thirteen horizontal <a href="/wiki/Bar_(heraldry)">stripes</a>.[[2]] The 50 stars on the flag represent the 50 U.S. states.';
      const result = cleanHtmlText(input);

      expect(result).not.toContain('<a');
      expect(result).not.toContain('</a>');
      expect(result).not.toContain('[[2]]');
      expect(result).toContain('consists of thirteen horizontal stripes.');
      expect(result).toContain('50 U.S. states');
    });

    it('should safely handle potentially malicious HTML tags', () => {
      const input = 'Text with <script>alert("xss")</script> and <style>body{}</style> tags.';
      const result = cleanHtmlText(input);

      // HTML tags are removed, but content inside them remains (this is safe because output goes to JSON, not HTML)
      expect(result).not.toContain('<script');
      expect(result).not.toContain('</script>');
      expect(result).not.toContain('<style');
      expect(result).not.toContain('</style>');
      // Content is preserved
      expect(result).toContain('alert("xss")');
      expect(result).toContain('body{}');
    });

    it('should handle entities without double-decoding', () => {
      // &amp;amp; should be decoded once to &amp; (not twice to &)
      const input = 'Text with &amp;amp; entity.';
      const result = cleanHtmlText(input);

      // Should decode only once: &amp;amp; -> &amp;
      expect(result).toBe('Text with &amp; entity.');
    });
  });

  describe('Integration: cleanHtmlText with real Wikipedia extract', () => {
    it('should clean the United States flag description example from the issue', () => {
      // This is similar to what Wikipedia returns for "Flag of the United States"
      const wikipediaExtract = `
        <p>The <a href="/wiki/National_flag" title="National flag">national flag</a> of the 
        <a href="/wiki/United_States" title="United States">United States</a>, often referred to 
        as the American flag or the U.S. flag, consists of thirteen horizontal 
        <a href="/wiki/Bar_(heraldry)" title="Bar (heraldry)">stripes</a>, 
        <a href="/wiki/Variation_of_the_field" title="Variation of the field">alternating</a> 
        red and white, with a blue rectangle in the <a href="/wiki/Canton_(flag)" title="Canton (flag)">canton</a> 
        bearing fifty small, white, <a href="/wiki/Five-pointed_star" title="Five-pointed star">five-pointed stars</a> 
        arranged in nine offset horizontal rows, where rows of six stars alternate with rows of five stars. 
        The 50 stars on the flag represent the 50 U.S. states, and the 13 stripes represent the 
        <a href="/wiki/Thirteen_Colonies" title="Thirteen Colonies">thirteen English colonies</a> that won 
        independence from <a href="/wiki/Kingdom_of_Great_Britain" title="Kingdom of Great Britain">Great Britain</a> 
        in the <a href="/wiki/American_Revolutionary_War" title="American Revolutionary War">American Revolutionary War</a>.[[2]]</p>
      `;

      const cleaned = cleanHtmlText(wikipediaExtract);

      // Should not contain any HTML
      expect(cleaned).not.toContain('<');
      expect(cleaned).not.toContain('>');
      expect(cleaned).not.toContain('href');

      // Should not contain citations
      expect(cleaned).not.toContain('[[2]]');

      // Should contain the important content
      expect(cleaned).toContain('national flag');
      expect(cleaned).toContain('United States');
      expect(cleaned).toContain('thirteen horizontal stripes');
      expect(cleaned).toContain('50 stars');
      expect(cleaned).toContain('50 U.S. states');
      expect(cleaned).toContain('American Revolutionary War');
    });
  });
});
