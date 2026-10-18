import {
  isWritingAcceptable,
  isWritingTypo,
  levenshtein,
  normalizeText,
  normalizeWord,
} from './word.utils';

describe('word.utils', () => {
  describe('normalizeWord', () => {
    it('trims and lowercases', () => {
      expect(normalizeWord('  Run ')).toBe('run');
    });
  });

  describe('normalizeText', () => {
    it('trims and lowercases a sentence', () => {
      expect(normalizeText('  She Noticed The Mistake. ')).toBe(
        'she noticed the mistake.',
      );
    });
    it('passes undefined/null through unchanged', () => {
      expect(normalizeText(undefined)).toBeUndefined();
      expect(normalizeText(null)).toBeNull();
    });
  });

  describe('levenshtein', () => {
    it('is 0 for identical strings', () => {
      expect(levenshtein('house', 'house')).toBe(0);
    });
    it('counts a single substitution / insertion / deletion as 1', () => {
      expect(levenshtein('house', 'houze')).toBe(1); // substitution
      expect(levenshtein('house', 'housse')).toBe(1); // insertion
      expect(levenshtein('house', 'huse')).toBe(1); // deletion
    });
    it('counts two edits as 2', () => {
      expect(levenshtein('house', 'mouze')).toBe(2); // h→m and s→z
    });
    it('handles empty strings', () => {
      expect(levenshtein('', 'abc')).toBe(3);
      expect(levenshtein('abc', '')).toBe(3);
    });
  });

  describe('isWritingAcceptable', () => {
    it('accepts an exact match (case/space-insensitive)', () => {
      expect(isWritingAcceptable('house', '  House ')).toBe(true);
    });
    it('accepts a single-letter typo on a long-enough word', () => {
      expect(isWritingAcceptable('house', 'hous')).toBe(true);
      expect(isWritingAcceptable('beautiful', 'beatiful')).toBe(true);
    });
    it('rejects two or more wrong letters', () => {
      expect(isWritingAcceptable('house', 'mouze')).toBe(false);
    });
    it('does not tolerate typos on short words (< 4 chars)', () => {
      expect(isWritingAcceptable('cat', 'bat')).toBe(false);
      expect(isWritingAcceptable('run', 'rum')).toBe(false);
    });
    it('rejects an empty answer', () => {
      expect(isWritingAcceptable('house', '')).toBe(false);
    });
  });

  describe('isWritingTypo', () => {
    it('is true only when accepted via single-typo tolerance (not exact)', () => {
      expect(isWritingTypo('house', 'house')).toBe(false); // exact
      expect(isWritingTypo('house', 'hous')).toBe(true); // typo
      expect(isWritingTypo('house', 'mouze')).toBe(false); // rejected
    });
  });
});
