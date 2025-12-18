/**
 * Normalizes a vocabulary word for consistent storage and comparison.
 * - trims whitespace
 * - lowercases
 */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}
