/**
 * Normalizes a vocabulary word for consistent storage and comparison.
 * - trims whitespace
 * - lowercases
 */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Normalizes any stored text (words, sentences, translations, definitions) to a
 * consistent lowercase form: trims surrounding whitespace and lowercases every
 * character. Null/undefined are passed through unchanged so optional fields
 * stay optional.
 */
export function normalizeText<T extends string | null | undefined>(
  value: T,
): T {
  return (typeof value === 'string' ? value.trim().toLowerCase() : value) as T;
}

/**
 * Levenshtein edit distance between two strings (number of single-character
 * insertions, deletions or substitutions to turn `a` into `b`).
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Whether a typed answer should count as correct for a Writing exercise: an
 * exact match, or a single-character typo (edit distance 1) when the target is
 * long enough (4+ chars) that one slip is clearly a typo, not a different word.
 */
export function isWritingAcceptable(
  correctAnswer: string,
  userAnswer: string,
): boolean {
  const correct = normalizeWord(correctAnswer);
  const user = normalizeWord(userAnswer);
  if (user === correct) return true;
  if (correct.length < 4) return false;
  return levenshtein(user, correct) === 1;
}

/** True when the answer was accepted only thanks to single-typo tolerance. */
export function isWritingTypo(
  correctAnswer: string,
  userAnswer: string,
): boolean {
  const correct = normalizeWord(correctAnswer);
  const user = normalizeWord(userAnswer);
  return user !== correct && isWritingAcceptable(correctAnswer, userAnswer);
}
