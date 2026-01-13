import { buildRefreshCookieOptions } from './cookie.utils';

describe('Cookie Utils', () => {
  describe('buildRefreshCookieOptions', () => {
    describe('production environment', () => {
      it('should create secure cookie in production', () => {
        const result = buildRefreshCookieOptions('7d', true);

        expect(result).toEqual({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 604800000, // 7 days in ms
        });
      });

      it('should handle different expiry times in production', () => {
        const result1 = buildRefreshCookieOptions('1d', true);
        expect(result1.maxAge).toBe(86400000); // 1 day

        const result2 = buildRefreshCookieOptions('30d', true);
        expect(result2.maxAge).toBe(2592000000); // 30 days

        const result3 = buildRefreshCookieOptions('1h', true);
        expect(result3.maxAge).toBe(3600000); // 1 hour
      });
    });

    describe('development environment', () => {
      it('should create non-secure cookie in development', () => {
        const result = buildRefreshCookieOptions('7d', false);

        expect(result).toEqual({
          httpOnly: true,
          secure: false, // Not secure in dev
          sameSite: 'lax',
          path: '/',
          maxAge: 604800000,
        });
      });

      it('should handle different expiry times in development', () => {
        const result1 = buildRefreshCookieOptions('1d', false);
        expect(result1.maxAge).toBe(86400000);
        expect(result1.secure).toBe(false);

        const result2 = buildRefreshCookieOptions('12h', false);
        expect(result2.maxAge).toBe(43200000);
        expect(result2.secure).toBe(false);
      });
    });

    describe('cookie security properties', () => {
      it('should always set httpOnly to true', () => {
        expect(buildRefreshCookieOptions('7d', true).httpOnly).toBe(true);
        expect(buildRefreshCookieOptions('7d', false).httpOnly).toBe(true);
      });

      it('should always set sameSite to lax', () => {
        expect(buildRefreshCookieOptions('7d', true).sameSite).toBe('lax');
        expect(buildRefreshCookieOptions('7d', false).sameSite).toBe('lax');
      });

      it('should always set path to /', () => {
        expect(buildRefreshCookieOptions('7d', true).path).toBe('/');
        expect(buildRefreshCookieOptions('7d', false).path).toBe('/');
      });

      it('should set secure based on isProd flag', () => {
        expect(buildRefreshCookieOptions('7d', true).secure).toBe(true);
        expect(buildRefreshCookieOptions('7d', false).secure).toBe(false);
      });
    });

    describe('maxAge calculation', () => {
      it('should correctly convert time units to milliseconds', () => {
        const tests = [
          { input: '1s', expected: 1000 },
          { input: '60s', expected: 60000 },
          { input: '1m', expected: 60000 },
          { input: '30m', expected: 1800000 },
          { input: '1h', expected: 3600000 },
          { input: '24h', expected: 86400000 },
          { input: '1d', expected: 86400000 },
          { input: '7d', expected: 604800000 },
          { input: '30d', expected: 2592000000 },
        ];

        tests.forEach(({ input, expected }) => {
          const result = buildRefreshCookieOptions(input, true);
          expect(result.maxAge).toBe(expected);
        });
      });
    });

    describe('edge cases', () => {
      it('should handle zero expiry', () => {
        const result = buildRefreshCookieOptions('0d', true);
        expect(result.maxAge).toBe(0);
      });

      it('should handle very large expiry values', () => {
        const result = buildRefreshCookieOptions('365d', true);
        expect(result.maxAge).toBe(31536000000); // 1 year
      });

      it('should handle fractional time values', () => {
        const result = buildRefreshCookieOptions('0.5d', true);
        expect(result.maxAge).toBe(43200000); // 0.5 day = 12 hours
      });
    });
  });
});
