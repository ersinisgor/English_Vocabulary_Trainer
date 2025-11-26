export function parseDurationToMs(duration: string): number {
  // Accept formats like '7d', '24h', '3600s', '30m'. Fallback to days if parse fails.
  const unit = duration.slice(-1);
  const value = Number(duration.slice(0, -1));
  if (Number.isNaN(value)) return 7 * 24 * 60 * 60 * 1000;
  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      // If no unit, assume seconds
      return Number(duration) * 1000;
  }
}
