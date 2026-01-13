import { parseDurationToMs } from './time.utils';

describe('Time Utils', () => {
  describe('parseDurationToMs', () => {
    describe('days (d)', () => {
      it('should parse days correctly', () => {
        expect(parseDurationToMs('1d')).toBe(86400000); // 1 day = 86400000ms
        expect(parseDurationToMs('7d')).toBe(604800000); // 7 days
        expect(parseDurationToMs('30d')).toBe(2592000000); // 30 days
      });

      it('should handle fractional days', () => {
        expect(parseDurationToMs('0.5d')).toBe(43200000); // 0.5 day = 12 hours
      });
    });

    describe('hours (h)', () => {
      it('should parse hours correctly', () => {
        expect(parseDurationToMs('1h')).toBe(3600000); // 1 hour
        expect(parseDurationToMs('24h')).toBe(86400000); // 24 hours = 1 day
        expect(parseDurationToMs('48h')).toBe(172800000); // 48 hours = 2 days
      });

      it('should handle fractional hours', () => {
        expect(parseDurationToMs('0.5h')).toBe(1800000); // 0.5 hour = 30 mins
      });
    });

    describe('minutes (m)', () => {
      it('should parse minutes correctly', () => {
        expect(parseDurationToMs('1m')).toBe(60000); // 1 minute
        expect(parseDurationToMs('30m')).toBe(1800000); // 30 minutes
        expect(parseDurationToMs('60m')).toBe(3600000); // 60 minutes = 1 hour
      });

      it('should handle fractional minutes', () => {
        expect(parseDurationToMs('0.5m')).toBe(30000); // 0.5 minute = 30 secs
      });
    });

    describe('seconds (s)', () => {
      it('should parse seconds correctly', () => {
        expect(parseDurationToMs('1s')).toBe(1000); // 1 second
        expect(parseDurationToMs('30s')).toBe(30000); // 30 seconds
        expect(parseDurationToMs('3600s')).toBe(3600000); // 3600 seconds = 1 hour
      });

      it('should handle fractional seconds', () => {
        expect(parseDurationToMs('0.5s')).toBe(500); // 0.5 second
      });
    });

    describe('no unit (defaults to seconds)', () => {
      it('should treat no unit as seconds', () => {
        expect(parseDurationToMs('30')).toBe(30000); // 30 * 1000
        expect(parseDurationToMs('60')).toBe(60000); // 60 * 1000
      });
    });

    describe('edge cases', () => {
      it('should handle zero values', () => {
        expect(parseDurationToMs('0d')).toBe(0);
        expect(parseDurationToMs('0h')).toBe(0);
        expect(parseDurationToMs('0m')).toBe(0);
        expect(parseDurationToMs('0s')).toBe(0);
      });

      it('should return default (7 days) for invalid input', () => {
        const defaultValue = 7 * 24 * 60 * 60 * 1000; // 7 days
        expect(parseDurationToMs('invalid')).toBe(defaultValue);
        expect(parseDurationToMs('abc')).toBe(defaultValue);
        expect(parseDurationToMs('')).toBe(defaultValue);
      });

      it('should handle large numbers', () => {
        expect(parseDurationToMs('365d')).toBe(31536000000); // 1 year
        expect(parseDurationToMs('1000h')).toBe(3600000000);
      });

      it('should handle unknown unit suffix', () => {
        // Falls through to no-unit case (multiply by 1000)
        expect(parseDurationToMs('30x')).toBe(30000);
      });
    });

    describe('real-world scenarios', () => {
      it('should parse typical JWT expiry times', () => {
        expect(parseDurationToMs('15m')).toBe(900000); // 15 minutes
        expect(parseDurationToMs('1h')).toBe(3600000); // 1 hour
        expect(parseDurationToMs('24h')).toBe(86400000); // 24 hours
      });

      it('should parse typical refresh token expiry times', () => {
        expect(parseDurationToMs('7d')).toBe(604800000); // 7 days
        expect(parseDurationToMs('30d')).toBe(2592000000); // 30 days
        expect(parseDurationToMs('90d')).toBe(7776000000); // 90 days
      });
    });
  });
});
