import {
  composeRefreshComposite,
  parseRefreshComposite,
} from './token.utils';

describe('Token Utils', () => {
  describe('composeRefreshComposite', () => {
    it('should compose id and raw token into composite format', () => {
      const id = 'token-id-123';
      const raw = 'raw-token-abc';
      const result = composeRefreshComposite(id, raw);

      expect(result).toBe('token-id-123.raw-token-abc');
    });

    it('should handle special characters in tokens', () => {
      const id = 'id_with-special.chars';
      const raw = 'raw_token_123';
      const result = composeRefreshComposite(id, raw);

      expect(result).toBe('id_with-special.chars.raw_token_123');
    });

    it('should work with long tokens', () => {
      const id = 'a'.repeat(100);
      const raw = 'b'.repeat(200);
      const result = composeRefreshComposite(id, raw);

      expect(result).toBe(`${'a'.repeat(100)}.${'b'.repeat(200)}`);
    });
  });

  describe('parseRefreshComposite', () => {
    it('should parse valid composite token', () => {
      const composite = 'token-id-123.raw-token-abc';
      const result = parseRefreshComposite(composite);

      expect(result).toEqual({
        id: 'token-id-123',
        raw: 'raw-token-abc',
      });
    });

    it('should handle tokens with multiple dots correctly', () => {
      // Only first dot should split id and raw
      const composite = 'id-123.raw.with.dots';
      const result = parseRefreshComposite(composite);

      expect(result).toEqual({
        id: 'id-123',
        raw: 'raw.with.dots',
      });
    });

    it('should throw error for empty composite token', () => {
      expect(() => parseRefreshComposite('')).toThrow(
        'No composite token provided',
      );
    });

    it('should throw error for null/undefined composite token', () => {
      expect(() => parseRefreshComposite(null as any)).toThrow(
        'No composite token provided',
      );
      expect(() => parseRefreshComposite(undefined as any)).toThrow(
        'No composite token provided',
      );
    });

    it('should throw error for malformed token (no dot)', () => {
      expect(() => parseRefreshComposite('no-dot-token')).toThrow(
        'Malformed composite token',
      );
    });

    it('should throw error for malformed token (missing id)', () => {
      expect(() => parseRefreshComposite('.only-raw')).toThrow(
        'Malformed composite token',
      );
    });

    it('should throw error for malformed token (missing raw)', () => {
      expect(() => parseRefreshComposite('only-id.')).toThrow(
        'Malformed composite token',
      );
    });

    it('should throw error for malformed token (only dot)', () => {
      expect(() => parseRefreshComposite('.')).toThrow(
        'Malformed composite token',
      );
    });
  });

  describe('round-trip', () => {
    it('should compose and parse correctly', () => {
      const id = 'test-id';
      const raw = 'test-raw-token';

      const composite = composeRefreshComposite(id, raw);
      const parsed = parseRefreshComposite(composite);

      expect(parsed.id).toBe(id);
      expect(parsed.raw).toBe(raw);
    });

    it('should handle complex tokens in round-trip', () => {
      const id = 'cuid_abc123_xyz';
      const raw = '0123456789abcdef'.repeat(6); // 96 chars

      const composite = composeRefreshComposite(id, raw);
      const parsed = parseRefreshComposite(composite);

      expect(parsed.id).toBe(id);
      expect(parsed.raw).toBe(raw);
    });
  });
});
