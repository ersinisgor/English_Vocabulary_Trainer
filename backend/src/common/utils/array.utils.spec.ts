import { shuffle } from './array.utils';

describe('shuffle', () => {
  it('returns array with same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual([...input].sort());
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const original = [...input];
    shuffle(input);
    expect(input).toEqual(original);
  });

  it('returns empty array unchanged', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('returns single element array unchanged', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});
